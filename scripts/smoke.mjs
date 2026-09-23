import assert from 'node:assert/strict';
import WebSocket from 'ws';

const origin = process.env.SMOKE_ORIGIN || 'http://localhost:5173';
const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const ejectMode = process.argv.includes('--eject');
const quickMode = process.argv.includes('--quick');
const response = await fetch(`${base}/rooms`, { method: 'POST', headers: { Origin: origin } });
assert.equal(response.status, 201);
const { code } = await response.json();
assert.match(code, /^[A-Z2-9]{6}$/);

function join(name, token = '') {
  return new Promise((resolve, reject) => {
    const client = { socket: new WebSocket(`${base.replace('http', 'ws')}/ws/${code}?name=${name}&token=${token}`, { headers: { Origin: origin } }), snapshots: [], token: '' };
    client.socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'welcome') client.token = message.token;
      if (message.type === 'snapshot') client.snapshots.push(message);
      if (message.type === 'snapshot' && client.token) resolve(client);
    });
    client.socket.on('error', reject);
  });
}

const clients = await Promise.all(['A', 'B', 'C', 'D'].map(join));
const latest = client => client.snapshots.at(-1);
const waitFor = async predicate => {
  const until = Date.now() + 55_000;
  while (Date.now() < until) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for game state');
};
await waitFor(() => clients.every(client => latest(client)?.players.length === 4));
clients[0].socket.send(JSON.stringify({ type: 'start' }));
await waitFor(() => clients.every(client => latest(client)?.phase === 'playing'));
for (const client of clients) {
  assert.equal(latest(client).phase, 'playing');
  assert.ok(['crew', 'impostor'].includes(latest(client).role));
  assert.ok(!latest(client).players.some(player => 'role' in player), 'Roles must stay hidden from public player list');
}
assert.equal(clients.filter(c => latest(c).role === 'impostor').length, 1);
const host = clients[0];
host.socket.send(JSON.stringify({ type: 'emergency' }));
await waitFor(() => latest(host)?.phase === 'meeting');
assert.equal(latest(host).phase, 'meeting');
assert.equal(latest(host).meeting.stage, 'discussion');
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
