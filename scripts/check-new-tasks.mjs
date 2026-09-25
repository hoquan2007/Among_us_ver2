import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:5173';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const clients = [];
const latest = c => c.snapshots.at(-1);
const self = c => latest(c).players.find(p => p.id === latest(c).me);
const send = (c, message) => c.socket.send(JSON.stringify(message));
async function until(test, label, limit = 30_000) {
  const end = Date.now() + limit;
  while (Date.now() < end) { if (test()) return; await delay(90); }
  throw new Error(`Timeout ${label}: ${JSON.stringify(clients.map(c => ({ role: latest(c)?.role, me: latest(c) && self(c), completed: latest(c)?.completedTasks })))}`);
}
async function walk(c, axis, goal) {
  for (let i = 0; i < 110; i++) {
    if (Math.abs(self(c)[axis] - goal) < 16) {
      await delay(350);
      if (Math.abs(self(c)[axis] - goal) < 20) return;
      continue;
    }
    const sign = Math.sign(goal - self(c)[axis]);
    send(c, { type: 'move', dx: axis === 'x' ? sign : 0, dy: axis === 'y' ? sign : 0 });
    await delay(145);
  }
  throw new Error(`Blocked: ${JSON.stringify(self(c))} to ${axis}=${goal}`);
}
function join(code, name) {
  return new Promise((resolve, reject) => {
    const c = { snapshots: [], ready: new Set(), socket: new WebSocket(`${base.replace('http', 'ws')}/ws/${code}?name=${name}`, { headers: { Origin: origin } }) };
    c.socket.on('message', raw => {
      const m = JSON.parse(raw.toString());
      if (m.type === 'snapshot') { c.snapshots.push(m); if (m.players.length) resolve(c); }
      if (m.type === 'taskReady') c.ready.add(m.id);
    });
    c.socket.on('error', reject);
  });
}
try {
  const res = await fetch(`${base}/rooms`, { method: 'POST', headers: { Origin: origin } });
  assert.equal(res.status, 201);
  const { code } = await res.json();
  clients.push(...await Promise.all(['A', 'B', 'C', 'D'].map(name => join(code, name))));
  await until(() => clients.every(c => latest(c).players.length === 4), 'lobby');
  const host = clients.find(c => latest(c).host === latest(c).me);
  send(host, { type: 'start' });
  await until(() => clients.every(c => latest(c).phase === 'playing'), 'start');
  const crew = clients.filter(c => latest(c).role === 'crew');
  assert.equal(crew.length, 3);
  const routes = [
    { c: crew[0], id: 'valves', steps: [2, 0, 1], path: [['x', 1400], ['y', 1290], ['x', 930], ['y', 1600]] },
    { c: crew[1], id: 'cargo', steps: [1, 2, 0, 3], path: [['y', 900], ['x', 600], ['y', 1590], ['x', 255]] },
    { c: crew[2], id: 'frequency', steps: [73], path: [['y', 900], ['x', 1870], ['y', 190]] }
  ];
  await Promise.all(routes.map(async route => {
    for (const [axis, goal] of route.path) await walk(route.c, axis, goal);
    send(route.c, { type: 'taskStart', id: route.id });
    await until(() => route.c.ready.has(route.id), `${route.id} ready`);
    send(route.c, { type: 'taskComplete', id: route.id });
    await delay(150);
    assert.ok(!latest(route.c).completedTasks.includes(route.id), `${route.id} must require steps`);
    for (const step of route.steps) { send(route.c, { type: 'taskStep', id: route.id, step }); await delay(75); }
    await delay(1900);
    send(route.c, { type: 'taskComplete', id: route.id });
    await until(() => latest(route.c).completedTasks.includes(route.id), `${route.id} complete`);
  }));
  console.log(`PASS: room ${code}, valves, cargo and frequency require steps and complete`);
} finally {
  for (const c of clients) c.socket.close();
}
