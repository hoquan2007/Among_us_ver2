import assert from 'node:assert/strict';
import WebSocket from 'ws';

const origin = process.env.SMOKE_ORIGIN || 'http://localhost:5173';
const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const ejectMode = process.argv.includes('--eject');
const quickMode = process.argv.includes('--quick');
const wireMode = process.argv.includes('--wire');
const taskMode = process.argv.includes('--task') || wireMode;
const killMode = process.argv.includes('--kill');
const endMeetingMode = process.argv.includes('--end-meeting');
const response = await fetch(`${base}/rooms`, { method: 'POST', headers: { Origin: origin } });
assert.equal(response.status, 201);
const { code } = await response.json();
assert.match(code, /^[A-Z2-9]{6}$/);

function join(name, token = '') {
  return new Promise((resolve, reject) => {
    const client = { socket: new WebSocket(`${base.replace('http', 'ws')}/ws/${code}?name=${name}&token=${token}`, { headers: { Origin: origin } }), snapshots: [], readyTasks: new Set(), token: '' };
    client.socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'welcome') client.token = message.token;
      if (message.type === 'snapshot') client.snapshots.push(message);
      if (message.type === 'taskReady') client.readyTasks.add(message.id);
      if (message.type === 'snapshot' && client.token) resolve(client);
    });
    client.socket.on('error', reject);
  });
}

const clients = await Promise.all(['A', 'B', 'C', 'D'].map(join));
const latest = client => client.snapshots.at(-1);
const waitFor = async predicate => {
  const until = Date.now() + Number(process.env.SMOKE_TIMEOUT_MS || 55_000);
  while (Date.now() < until) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for game state: ${JSON.stringify(clients.map(client => ({ ready: client.socket.readyState, players: latest(client)?.players.length, phase: latest(client)?.phase, count: client.snapshots.length })))}`);
};
await waitFor(() => clients.every(client => latest(client)?.players.length === 4));
const host = clients.find(client => latest(client).me === latest(client).host);
assert.ok(host, 'Host must be connected');
host.socket.send(JSON.stringify({ type: 'start' }));
await waitFor(() => clients.every(client => latest(client)?.phase === 'playing'));
for (const client of clients) {
  assert.equal(latest(client).phase, 'playing');
  assert.ok(['crew', 'impostor'].includes(latest(client).role));
  assert.ok(!latest(client).players.some(player => 'role' in player), 'Roles must stay hidden from public player list');
}
assert.equal(clients.filter(c => latest(c).role === 'impostor').length, 1);
if (killMode) {
  const killer = clients.find(client => latest(client).role === 'impostor');
  const origin = latest(killer).players.find(p => p.id === latest(killer).me);
  const victim = latest(killer).players.filter(p => p.id !== origin.id).sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))[0];
  await new Promise(resolve => setTimeout(resolve, 20_200));
  killer.socket.send(JSON.stringify({ type: 'kill', target: victim.id }));
  await waitFor(() => latest(killer).kills?.some(effect => effect.target === victim.id));
  assert.ok(latest(killer).bodies.some(body => body.playerId === victim.id));
  for (const client of clients) client.socket.close();
  console.log(`PASS: room ${code}, kill animation event and reportable body`);
  process.exit(0);
}
if (taskMode) {
  const crew = clients.find(client => client !== host && latest(client).role === 'crew');
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const walk = async (axis, goal) => {
    for (let i = 0; i < 100; i++) {
      const me = latest(crew).players.find(p => p.id === latest(crew).me);
      if (Math.abs(me[axis] - goal) < 18) return;
      const sign = Math.sign(goal - me[axis]);
      crew.socket.send(JSON.stringify({ type: 'move', dx: axis === 'x' ? sign : 0, dy: axis === 'y' ? sign : 0 }));
      await delay(145);
    }
    throw new Error(`Could not reach ${axis}=${goal}; current=${JSON.stringify(latest(crew).players.find(p => p.id === latest(crew).me))}`);
  };
  await delay(150);
  if (wireMode) {
    await walk('y', 920);
    await walk('x', 590);
    await walk('y', 210);
    await walk('x', 300);
  } else {
    await walk('x', 1400);
    await walk('y', 260);
  }
  const taskId = wireMode ? 'wires' : 'scan';
  // Reproduce the former race: opening a task immediately after a movement packet.
  crew.socket.send(JSON.stringify({ type: 'move', dx: 0, dy: 0 }));
  crew.socket.send(JSON.stringify({ type: 'taskStart', id: taskId }));
  await waitFor(() => crew.readyTasks.has(taskId));
  if (wireMode) {
    await delay(1950);
    crew.socket.send(JSON.stringify({ type: 'taskComplete', id: taskId }));
    await delay(160);
    assert.ok(!latest(crew).completedTasks.includes(taskId), 'Server must reject unplayed puzzle');
    for (const step of [0, 1, 2]) {
      crew.socket.send(JSON.stringify({ type: 'taskStep', id: taskId, step }));
      await delay(75);
    }
  }
  await delay(wireMode ? 100 : 3200);
  crew.socket.send(JSON.stringify({ type: 'taskComplete', id: taskId }));
  await waitFor(() => latest(crew).completedTasks.includes(taskId));
  assert.ok(latest(crew).taskProgress > 0);
  console.log(`PASS: crew reached station and completed ${taskId}`);
}
host.socket.send(JSON.stringify({ type: 'emergency' }));
await waitFor(() => latest(host)?.phase === 'meeting');
assert.equal(latest(host).phase, 'meeting');
assert.equal(latest(host).meeting.stage, 'discussion');
if (endMeetingMode) {
  for (const client of clients.slice(0, 3)) {
    client.socket.send(JSON.stringify({ type: 'endMeeting' }));
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  await waitFor(() => latest(host).meeting?.stage === 'result');
  assert.equal(latest(host).meeting.skipped, true);
  assert.equal(latest(host).meeting.endVotes.length, 3);
  await waitFor(() => latest(host).phase === 'playing');
  for (const client of clients) client.socket.close();
  console.log(`PASS: room ${code}, majority ended meeting early`);
  process.exit(0);
}
if (quickMode) {
  for (const client of clients) client.socket.close();
  console.log(`PASS: room ${code}, four players, roles hidden, meeting opened`);
  process.exit(0);
}
await waitFor(() => latest(host).meeting?.stage === 'voting');
const target = clients.find(client => latest(client).role === 'impostor');
for (const client of clients) client.socket.send(JSON.stringify({ type: 'vote', target: ejectMode ? latest(target).me : null }));
if (ejectMode) {
  await waitFor(() => latest(host).phase === 'ended');
  assert.equal(latest(host).winner, 'crew');
} else {
  await waitFor(() => latest(host).meeting?.stage === 'result');
  assert.equal(latest(host).meeting.skipped, true);
  await waitFor(() => latest(host).phase === 'playing');
}
const beforeReconnect = latest(host);
host.socket.close();
await new Promise(resolve => host.socket.once('close', resolve));
const rejoined = await join('A', host.token);
assert.equal(latest(rejoined).me, beforeReconnect.me);
assert.equal(latest(rejoined).role, beforeReconnect.role);
for (const client of clients) client.socket.close();
rejoined.socket.close();
console.log(`PASS: room ${code}, four players, roles hidden, ${ejectMode ? 'ejection win' : 'skip vote'} and reconnect`);
