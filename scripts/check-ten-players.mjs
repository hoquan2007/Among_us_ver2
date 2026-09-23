import assert from 'node:assert/strict';
import WebSocket from 'ws';

const base = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:5173';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const latest = client => client.snapshots.at(-1);
const clients = [];
async function until(predicate, label, timeout = 20_000) {
  const stop = Date.now() + timeout;
  while (Date.now() < stop) { if (predicate()) return; await delay(80); }
  throw new Error(`Timed out: ${label}`);
}
function send(client, message) { client.socket.send(JSON.stringify(message)); }
function join(code, name, token = '') {
  return new Promise((resolve, reject) => {
    const client = { name, token, snapshots: [], socket: new WebSocket(`${base.replace('http', 'ws')}/ws/${code}?name=${name}&token=${token}`, { headers: { Origin: origin } }) };
    client.socket.on('message', raw => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'welcome') client.token = message.token;
      if (message.type === 'snapshot') { client.snapshots.push(message); if (client.token) resolve(client); }
    });
    client.socket.on('error', reject);
  });
}
try {
  const response = await fetch(`${base}/rooms`, { method: 'POST', headers: { Origin: origin } });
  assert.equal(response.status, 201);
  const { code } = await response.json();
  clients.push(...await Promise.all(Array.from({ length: 10 }, (_, n) => join(code, `Player${n + 1}`))));
  await until(() => clients.every(client => latest(client).players.length === 10), 'ten in lobby');
  const host = clients.find(client => latest(client).me === latest(client).host);
  assert.ok(host);
  send(host, { type: 'preset', value: 'quick' });
  await until(() => clients.every(client => latest(client).preset === 'quick'), 'preset sync');
  send(host, { type: 'start' });
  await until(() => clients.every(client => latest(client).phase === 'playing'), 'ten playing');
  assert.equal(clients.filter(client => latest(client).role === 'impostor').length, 2);
  assert.ok(clients.filter(client => latest(client).role === 'crew').every(client => latest(client).tasks.length === 5));
  assert.ok(clients.every(client => latest(client).players.every(player => !('role' in player))));
  send(host, { type: 'emergency' });
  await until(() => clients.every(client => latest(client).phase === 'meeting'), 'ten in meeting');
  assert.ok(latest(host).meeting.endsAt - Date.now() < 26_000);
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
  console.log(`PASS: room ${code}, 10 players, 2 hidden impostors, majority meeting and reconnect`);
} finally {
  for (const client of clients) client.socket.close();
}
