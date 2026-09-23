import WebSocket from 'ws';

const code = process.argv[2];
if (!code) throw new Error('Usage: node scripts/open-test-clients.mjs ROOMCODE');
const base = process.env.TEST_WS_BASE || 'ws://127.0.0.1:8787';
const clients = ['Binh', 'Chi', 'Dung'].map(name => new WebSocket(`${base}/ws/${code}?name=${name}`, { headers: { Origin: 'http://localhost:5173' } }));
for (const client of clients) client.on('error', console.error);
console.log(`Joined ${code} with three test players. Press Ctrl+C to leave.`);
