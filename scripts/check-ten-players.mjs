import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:5173';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const latest = client => client.snapshots.at(-1);
const self = client => latest(client).players.find(player => player.id === latest(client).me);
const clients = [];
async function until(predicate, label, timeout = 20_000) {
  const stop = Date.now() + timeout;
  while (Date.now() < stop) { if (predicate()) return; await delay(80); }
  throw new Error(`Timed out: ${label}`);
}
function send(client, message) { client.socket.send(JSON.stringify(message)); }
async function walk(client, axis, goal) {
  for (let i = 0; i < 130; i++) {
    if (Math.abs(self(client)[axis] - goal) < 16) {
      await delay(350);
      if (Math.abs(self(client)[axis] - goal) < 20) return;
      continue;
    }
    const sign = Math.sign(goal - self(client)[axis]);
    send(client, { type: 'move', dx: axis === 'x' ? sign : 0, dy: axis === 'y' ? sign : 0 });
    await delay(145);
  }
  throw new Error(`Blocked at ${JSON.stringify(self(client))}, ${axis}=${goal}`);
}
function join(code, name, token = '') {
  return new Promise((resolve, reject) => {
    const client = { name, token, snapshots: [], ready: new Set(), socket: new WebSocket(`${base.replace('http', 'ws')}/ws/${code}?name=${name}&token=${token}`, { headers: { Origin: origin } }) };
    client.socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'welcome') client.token = message.token;
      if (message.type === 'taskReady') client.ready.add(message.id);
      if (message.type === 'snapshot') { client.snapshots.push(message); if (client.token) resolve(client); }
    });
    client.socket.on('error', reject);
  });
}
try {
  const response = await fetch(`${base}/rooms`, { method: 'POST', headers: { Origin: origin } });
  assert.equal(response.status, 201);
  const { code } = await response.json();
  clients.push(...await Promise.all(Array.from({ length: 10 }, (_, n) => join(code, n >= 8 ? 'Echo' : `Player${n + 1}`))));
  await until(() => clients.every(client => latest(client).players.length === 10), 'ten in lobby');
  const host = clients.find(client => latest(client).me === latest(client).host);
  assert.ok(host);
  const roomStatus = token => fetch(`${base}/rooms/${code}?token=${encodeURIComponent(token)}`, { headers: { Origin: origin } });
  assert.equal((await roomStatus('')).status, 409, 'Full lobby must reject new visitors');
  assert.equal((await roomStatus(host.token)).status, 200, 'A returning player may rejoin a full lobby');
  send(host, { type: 'preset', value: 'quick' });
  await until(() => clients.every(client => latest(client).preset === 'quick'), 'preset sync');
  send(host, { type: 'start' });
  await until(() => clients.every(client => latest(client).phase === 'playing'), 'ten playing');
  assert.equal((await roomStatus('')).status, 409, 'Started game must reject new visitors');
  assert.equal((await roomStatus(host.token)).status, 200, 'A returning player may rejoin a started game');
  assert.ok(clients.every(client => latest(client).mapVariant === 'full'), 'Ten players must use all 22 rooms');
  assert.equal(clients.filter(client => latest(client).role === 'impostor').length, 2);
  assert.ok(clients.filter(client => latest(client).role === 'crew').every(client => latest(client).tasks.length === 5));
  assert.ok(clients.filter(client => latest(client).role === 'crew').every(client => client.snapshots.at(-1).tasks.filter(id => ['archive', 'shield', 'robot', 'water'].includes(id)).length === 2), 'Each crew member should receive two outer-wing tasks');
  assert.ok(clients.every(client => latest(client).players.every(player => !('role' in player))));
  send(host, { type: 'emergency' });
  await until(() => clients.every(client => latest(client).phase === 'meeting'), 'ten in meeting');
  assert.ok(latest(host).meeting.endsAt - Date.now() < 26_000);
  for (const client of clients.filter(client => client.name === 'Echo')) for (let index = 0; index < 5; index++) send(client, { type: 'chat', text: `hello ${index}` });
  await until(() => latest(host).chat.filter(message => message.name === 'Echo').length === 10, 'same-name chat independent');
  for (const client of clients.slice(0, 6)) {
    send(client, { type: 'endMeeting' });
    await delay(60);
  }
  await until(() => latest(host).meeting?.stage === 'result', 'meeting majority');
  assert.equal(latest(host).meeting.endVotes.length, 6);
  await until(() => latest(host).phase === 'playing', 'resume after meeting', 10_000);
  const oldId = latest(host).me;
  host.socket.close();
  await new Promise(resolve => host.socket.once('close', resolve));
  const again = await join(code, host.name, host.token);
  clients.push(again);
  assert.equal(latest(again).me, oldId);
  const shieldCrew = clients.find(client => client.socket.readyState === WebSocket.OPEN && latest(client).role === 'crew' && latest(client).tasks.includes('shield'));
  assert.ok(shieldCrew, 'A crew member must have the shield task');
  for (const [axis, goal] of [['y', 900], ['x', 2800], ['y', 1170], ['x', 3145]]) await walk(shieldCrew, axis, goal);
  const taskSession = 'shield-session-regression';
  send(shieldCrew, { type: 'taskStart', id: 'shield', session: taskSession });
  await until(() => shieldCrew.ready.has('shield'), 'shield task ready');
  send(shieldCrew, { type: 'taskComplete', id: 'shield', session: taskSession });
  await delay(150);
  assert.ok(!latest(shieldCrew).completedTasks.includes('shield'), 'Shield must reject completion without steps');
  for (const step of [2, 0]) { send(shieldCrew, { type: 'taskStep', id: 'shield', step, session: taskSession }); await delay(90); }
  send(shieldCrew, { type: 'taskStart', id: 'shield', session: taskSession });
  await delay(90);
  for (const step of [3, 1]) { send(shieldCrew, { type: 'taskStep', id: 'shield', step, session: taskSession }); await delay(90); }
  await delay(1900);
  send(shieldCrew, { type: 'taskComplete', id: 'shield', session: taskSession });
  await until(() => latest(shieldCrew).completedTasks.includes('shield'), 'shield task complete');
  console.log(`PASS: room ${code}, 10 players, full map, shield task, majority meeting and reconnect`);
} finally {
  for (const client of clients) client.socket.close();
}
