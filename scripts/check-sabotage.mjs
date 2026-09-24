import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:5173';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const clients = [];
const latest = c => c.snapshots.at(-1);
const self = c => latest(c).players.find(p => p.id === latest(c).me);
const send = (c, value) => c.socket.send(JSON.stringify(value));
async function until(test, label, timeout = 45_000) {
  const stop = Date.now() + timeout;
  while (Date.now() < stop) { if (test()) return; await delay(100); }
  throw new Error(`Timed out: ${label}; ${JSON.stringify(clients.map(c => ({ role: latest(c)?.role, pos: latest(c) && self(c), sabotage: latest(c)?.sabotage, fixed: latest(c)?.reactorFixed, phase: latest(c)?.phase, error: c.error })))}`);
}
async function walk(c, axis, goal) {
  for (let i = 0; i < 110; i++) {
    if (Math.abs(self(c)[axis] - goal) < 23) return;
    const direction = Math.sign(goal - self(c)[axis]);
    send(c, { type: 'move', dx: axis === 'x' ? direction : 0, dy: axis === 'y' ? direction : 0 });
    await delay(135);
  }
  throw new Error(`Movement blocked at ${JSON.stringify(self(c))}, goal ${axis}=${goal}`);
}
async function join(code, name) {
  return new Promise((resolve, reject) => {
    const c = { snapshots: [], error: '', socket: new WebSocket(`${base.replace('http', 'ws')}/ws/${code}?name=${name}`, { headers: { Origin: origin } }) };
    c.socket.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'snapshot') { c.snapshots.push(msg); if (msg.players.length) resolve(c); }
      if (msg.type === 'error') c.error = msg.message;
    });
    c.socket.on('error', reject);
  });
}
try {
  const response = await fetch(`${base}/rooms`, { method: 'POST', headers: { Origin: origin } });
  assert.equal(response.status, 201);
  const { code } = await response.json();
  clients.push(...await Promise.all(['A', 'B', 'C', 'D'].map(name => join(code, name))));
  await until(() => clients.every(c => latest(c).players.length === 4), 'lobby');
  const host = clients.find(c => latest(c).host === latest(c).me);
  send(host, { type: 'start' });
  await until(() => clients.every(c => latest(c).phase === 'playing'), 'start');
  const impostor = clients.find(c => latest(c).role === 'impostor');
  const crew = clients.filter(c => latest(c).role === 'crew');
  assert.equal(crew.length, 3);

  // Place two crew at the remote reactor controls before the alarm.
  const toSide = async (c, side) => {
    await walk(c, 'y', 920);
    await walk(c, 'x', side === 'left' ? 600 : 2200);
    await walk(c, 'y', 690);
    await walk(c, 'x', side === 'left' ? 255 : 2545);
  };
  await Promise.all([toSide(crew[0], 'left'), toSide(crew[1], 'right')]);
  await until(() => Date.now() >= latest(impostor).sabotageReadyAt, 'first cooldown');
  send(impostor, { type: 'sabotage', kind: 'reactor' });
  await until(() => latest(impostor).sabotage === 'reactor', 'reactor on');
  assert.ok(latest(impostor).reactorDeadline - Date.now() > 80_000);
  // A repair pressed immediately after movement must not be discarded.
  send(crew[0], { type: 'move', dx: 0, dy: 0 });
  send(crew[0], { type: 'fix', point: 0 });
  await until(() => latest(impostor).reactorFixed.includes(0), 'first reactor console');
  const firstWindowEnd = latest(impostor).reactorWindowEndsAt;
  assert.ok(firstWindowEnd - Date.now() > 25_000);
  send(crew[0], { type: 'fix', point: 0 });
  await delay(200);
  assert.equal(latest(impostor).reactorWindowEndsAt, firstWindowEnd, 'Repeated activation must not restart the window');
  send(crew[1], { type: 'move', dx: 0, dy: 0 });
  send(crew[1], { type: 'fix', point: 1 });
  await until(() => latest(impostor).sabotage === null, 'reactor fixed');
  console.log('PASS: reactor, two distinct crew at opposite consoles');

  await until(() => Date.now() >= latest(impostor).sabotageReadyAt, 'second cooldown');
  send(impostor, { type: 'sabotage', kind: 'doors' });
  await until(() => latest(impostor).sabotage === 'doors', 'doors on');
  assert.ok(latest(impostor).doorsUntil - Date.now() > 9_000);
  await until(() => latest(impostor).sabotage === null, 'doors expire', 18_000);
  console.log('PASS: doors activate and expire');

  await until(() => Date.now() >= latest(impostor).sabotageReadyAt, 'third cooldown');
  send(impostor, { type: 'sabotage', kind: 'lights' });
  await until(() => latest(impostor).sabotage === 'lights', 'lights off');
  assert.equal(latest(crew[0]).lightsFixed, false);
  // Left reactor to electrical: exit right, move outside room, enter its right doorway.
  await walk(crew[0], 'x', 600);
  await walk(crew[0], 'y', 210);
  await walk(crew[0], 'x', 255);
  send(crew[0], { type: 'fix' });
  await until(() => latest(impostor).sabotage === null, 'lights fixed');
  assert.equal(latest(crew[0]).lightsFixed, true);
  console.log('PASS: lights reduce vision and are repaired at electrical');
  console.log(`PASS: all three sabotages in room ${code}`);
} finally {
  for (const c of clients) c.socket.close();
}
