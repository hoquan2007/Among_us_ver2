import assert from 'node:assert/strict';
import { collides, DOORS, EMERGENCY, MAP, REACTOR_FIXES, ROOMS, STATIONS, VENTS, distance } from '../packages/protocol/src/index.ts';

const cell = 10;
const cols = MAP.width / cell, rows = MAP.height / cell;
const key = (x, y) => y * cols + x;
const start = [Math.round(EMERGENCY.x / cell), Math.round(EMERGENCY.y / cell)];
const seen = new Set([key(...start)]);
const queue = [start];
for (let i = 0; i < queue.length; i++) {
  const [x, y] = queue[i];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(key(nx, ny)) || collides(nx * cell, ny * cell)) continue;
    seen.add(key(nx, ny)); queue.push([nx, ny]);
  }
}
assert.equal(ROOMS.length, 7);
for (const point of [...STATIONS, ...VENTS, ...REACTOR_FIXES]) {
  assert.equal(collides(point.x, point.y), false, `Point is blocked: ${JSON.stringify(point)}`);
  assert.ok(queue.some(([x, y]) => distance({ x: x * cell, y: y * cell }, point) < 20), `Unreachable: ${JSON.stringify(point)}`);
}
assert.ok(DOORS.every(door => !collides(door.x + door.w / 2, door.y + door.h / 2)), 'A meeting door is blocked by a wall');
console.log(`PASS: ${ROOMS.length} rooms, all tasks, vents, reactor points and meeting doors reachable`);
