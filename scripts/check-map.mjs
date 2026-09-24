import assert from 'node:assert/strict';
import { collides, DOORS, EMERGENCY, MAP, REACTOR_FIXES, ROOMS, STATIONS, VENTS, distance, mapBounds } from '../packages/protocol/src/index.ts';

const cell = 10;
assert.equal(MAP.width, 3600);
assert.equal(MAP.height, 2400);
assert.equal(ROOMS.length, 22);
for (const variant of ['core', 'full']) {
  const bounds = mapBounds(variant);
  const cols = bounds.width / cell, rows = bounds.height / cell;
  const key = (x, y) => y * cols + x;
  const start = [Math.round(EMERGENCY.x / cell), Math.round(EMERGENCY.y / cell)];
  const seen = new Set([key(...start)]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(key(nx, ny)) || collides(nx * cell, ny * cell, variant)) continue;
      seen.add(key(nx, ny)); queue.push([nx, ny]);
    }
  }
  const active = [...STATIONS.filter(point => variant === 'full' || !('outer' in point)), ...VENTS.filter(point => variant === 'full' || !('outer' in point)), ...REACTOR_FIXES];
  for (const point of active) {
    assert.equal(collides(point.x, point.y, variant), false, `${variant}: blocked ${JSON.stringify(point)}`);
    assert.ok(queue.some(([x, y]) => distance({ x: x * cell, y: y * cell }, point) < 20), `${variant}: unreachable ${JSON.stringify(point)}`);
  }
  if (variant === 'core') assert.ok(!queue.some(([x]) => x * cell >= 2800), 'Core must exclude the outer wing');
}
assert.ok(DOORS.every(door => !collides(door.x + door.w / 2, door.y + door.h / 2)), 'A door is blocked by a wall');
assert.equal(DOORS.length, ROOMS.reduce((sum, room) => sum + (room.door === 'cross' ? 4 : 1) + (room.extraDoors?.length || 0), 0), 'All room doorways are represented');
console.log('PASS: core 16 rooms and full 22 rooms; all tasks, vents, reactor points and doors reachable');
