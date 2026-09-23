import { useEffect, useRef } from 'react';
import { DOORS, EMERGENCY, MAP, REACTOR_FIXES, ROOMS, SPEED, STATIONS, VENTS, VIEW, WALLS, collides, hitsRect, type PublicPlayer, type Snapshot } from '../../../packages/protocol/src/index';

const accent = '#78e7d7';
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

function roomDetails(ctx: CanvasRenderingContext2D, room: (typeof ROOMS)[number], time: number) {
  const { x, y, w, h, name } = room;
  ctx.save();
  ctx.fillStyle = '#67c6c015';
  for (let px = x + 25; px < x + w - 10; px += 64) {
    for (let py = y + 30; py < y + h - 10; py += 64) ctx.fillRect(px, py, 2, 2);
  }
  ctx.strokeStyle = '#a1e7df1b'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 24, y + 25, w - 48, h - 50);
  const box = (bx: number, by: number, bw: number, bh: number, color = '#254b5b') => {
    ctx.fillStyle = '#07182488'; ctx.fillRect(bx + 5, by + 6, bw, bh);
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = '#91d7d650'; ctx.lineWidth = 2; ctx.stroke();
  };
  const screen = (bx: number, by: number, bw: number, bh: number, color = '#6bdac7') => {
    box(bx, by, bw, bh, '#163647');
    ctx.fillStyle = color + '55'; ctx.fillRect(bx + 7, by + 7, bw - 14, bh - 14);
    ctx.fillStyle = color; ctx.fillRect(bx + 12, by + 15, Math.max(9, bw * .37), 3);
    ctx.fillRect(bx + 12, by + 24, Math.max(10, bw * .52), 2);
  };
  if (name === 'PHÒNG HỌP') {
    ctx.fillStyle = '#0d2d3d'; ctx.beginPath(); ctx.ellipse(EMERGENCY.x, EMERGENCY.y, 197, 119, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#79d9d344'; ctx.lineWidth = 4; ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 2 / 10;
      box(EMERGENCY.x + Math.cos(a) * 181 - 15, EMERGENCY.y + Math.sin(a) * 99 - 11, 30, 22, '#356676');
    }
    screen(x + 36, y + 65, 90, 54); screen(x + w - 126, y + 65, 90, 54);
    ctx.fillStyle = '#315e6e'; ctx.fillRect(x + 70, y + h - 90, w - 140, 8);
  } else if (name === 'PHÒNG ĐIỆN') {
    for (let i = 0; i < 4; i++) {
      screen(x + 31 + i * 92, y + 68, 72, 66, ['#f3be72', '#86e9d4', '#ef7d90', '#8caafa'][i]);
      ctx.strokeStyle = ['#f3be72', '#86e9d4', '#ef7d90', '#8caafa'][i] + '75';
      ctx.beginPath(); ctx.moveTo(x + 67 + i * 92, y + 134); ctx.bezierCurveTo(x + 55 + i * 92, y + 175, x + 85 + i * 92, y + 205, x + 67 + i * 92, y + 233); ctx.stroke();
    }
  } else if (name === 'BẢO AN') {
    for (let i = 0; i < 3; i++) screen(x + 27 + i * 70, y + 63, 58, 55, '#8ac5ef');
    box(x + 75, y + 145, 110, 35);
  } else if (name === 'Y TẾ') {
    box(x + 36, y + 90, 90, 149, '#3b6570'); box(x + w - 126, y + 90, 90, 149, '#3b6570');
    ctx.fillStyle = '#a0e8dd'; ctx.fillRect(x + 62, y + 110, 37, 18); ctx.fillRect(x + w - 100, y + 110, 37, 18);
    ctx.fillStyle = '#b3ffff66'; ctx.fillRect(x + 166, y + 96, w - 332, 7);
  } else if (name === 'LIÊN LẠC') {
    ctx.strokeStyle = '#77ded099'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w / 2, y + 150, 28 + i * 25, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    screen(x + 29, y + 70, 70, 52); screen(x + w - 99, y + 70, 70, 52);
  } else if (name === 'DỮ LIỆU') {
    for (let i = 0; i < 4; i++) {
      box(x + 36 + i * 92, y + 68, 70, 106, '#183b4d');
      for (let j = 0; j < 4; j++) { ctx.fillStyle = j === (i + Math.floor(time / 700)) % 4 ? '#8cf5dc' : '#4d9aa0'; ctx.fillRect(x + 49 + i * 92, y + 85 + j * 19, 44, 5); }
    }
  } else if (name === 'LÒ PHẢN ỨNG') {
    for (const offset of [-115, 115]) {
      ctx.fillStyle = '#2775853d'; ctx.beginPath(); ctx.arc(x + w / 2 + offset, y + h / 2, 64, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#88e2dc80'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#96e9e16b'; ctx.beginPath(); ctx.arc(x + w / 2 + offset, y + h / 2, 28 + Math.sin(time * .003) * 3, 0, Math.PI * 2); ctx.fill();
    }
    box(x + 143, y + 78, 134, 45);
  } else if (name === 'QUAN SÁT') {
    box(x + 40, y + 65, w - 80, 87, '#071624');
    ctx.fillStyle = '#f0fff2'; for (let i = 0; i < 17; i++) ctx.fillRect(x + 55 + (i * 47) % (w - 105), y + 78 + (i * 31) % 55, i % 4 === 0 ? 3 : 2, 2);
    screen(x + 135, y + 203, 150, 43);
  } else if (name === 'KHO NHIÊN LIỆU') {
    for (let i = 0; i < 3; i++) {
      box(x + 42 + i * 122, y + 73, 88, 95, '#64624a');
      ctx.fillStyle = '#f2cf7b88'; ctx.fillRect(x + 55 + i * 122, y + 132, 62, 11);
    }
  } else if (name === 'ĐỘNG CƠ') {
    for (let i = 0; i < 2; i++) {
      const cx = x + 130 + i * 180, cy = y + 170;
      ctx.fillStyle = '#295366'; ctx.beginPath(); ctx.arc(cx, cy, 66, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8edac5'; ctx.lineWidth = 5; ctx.stroke();
      for (let j = 0; j < 5; j++) {
        const a = time * .0006 + j * Math.PI * 2 / 5;
        ctx.strokeStyle = '#80bfcd'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48); ctx.stroke();
      }
    }
  } else if (name === 'ĐIỀU KHIỂN') {
    for (let i = 0; i < 3; i++) screen(x + 37 + i * 121, y + 67, 100, 63, '#8bbbea');
    box(x + 82, y + 211, w - 164, 43, '#36566a');
  }
  ctx.restore();
}

function astronaut(ctx: CanvasRenderingContext2D, p: PublicPlayer, x: number, y: number, moving: boolean, phase: number, mine: boolean, ally: boolean, dying: boolean) {
  const stride = moving ? Math.sin(phase) * 5 : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * 3 : Math.sin(phase * .2) * 1.2;
  ctx.save();
  ctx.globalAlpha = p.alive ? 1 : .48;
  ctx.fillStyle = '#020a16a8';
  ctx.beginPath(); ctx.ellipse(x, y + 24, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
  if (dying) { ctx.translate(x, y); ctx.rotate(Math.min(.9, phase * .16)); ctx.translate(-x, -y); }
  ctx.fillStyle = '#0e2434';
  ctx.beginPath(); ctx.roundRect(x - 23, y - 11 - bob, 15, 27, 6); ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.roundRect(x - 17, y + 6 - bob + stride, 12, 22, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x + 5, y + 6 - bob - stride, 12, 22, 4); ctx.fill();
  ctx.fillStyle = '#0008';
  ctx.beginPath(); ctx.roundRect(x - 20, y - 30 - bob, 40, 48, 15); ctx.fill();
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.roundRect(x - 19, y - 33 - bob, 38, 48, 15); ctx.fill();
  ctx.fillStyle = '#ffffff33';
  ctx.beginPath(); ctx.ellipse(x - 9, y - 23 - bob, 5, 11, -.4, 0, Math.PI * 2); ctx.fill();
  const glass = ctx.createLinearGradient(x - 15, y - 23, x + 18, y + 2);
  glass.addColorStop(0, '#e6ffff'); glass.addColorStop(.45, '#8dd9e9'); glass.addColorStop(1, '#31678d');
  ctx.fillStyle = glass;
  ctx.beginPath(); ctx.roundRect(x - 12, y - 22 - bob, 30, 20, 9); ctx.fill();
  ctx.strokeStyle = '#0e334b'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#ffffff92'; ctx.beginPath(); ctx.ellipse(x - 3, y - 17 - bob, 8, 3, -.2, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = mine ? '#c8fff0' : ally ? '#653947' : '#081524c9';
  ctx.beginPath(); ctx.roundRect(x - 46, y - 61 - bob, 92, 20, 8); ctx.fill();
  ctx.fillStyle = mine ? '#123746' : '#edfaff'; ctx.textAlign = 'center'; ctx.font = '700 12px system-ui';
  ctx.fillText((mine ? '▸ ' : '') + p.name.slice(0, 12) + (ally ? ' ◆' : ''), x, y - 47 - bob);
  ctx.restore();
}

export function GameScene({ game, onInteract, pressed }: { game: Snapshot; onInteract: () => void; pressed: { current: Set<string> } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let last = performance.now();
    const rendered = new Map<string, { x: number; y: number; lastX: number; lastY: number; phase: number; moving: boolean }>();
    const camera = { x: (MAP.width - VIEW.width) / 2, y: (MAP.height - VIEW.height) / 2 };
    const draw = (time: number) => {
      const g = gameRef.current;
      const dt = Math.min(48, time - last); last = time;
      const targets = new Set(g.players.map(p => p.id));
      for (const id of rendered.keys()) if (!targets.has(id)) rendered.delete(id);
      for (const p of g.players) {
        let r = rendered.get(p.id);
        if (!r) { r = { x: p.x, y: p.y, lastX: p.x, lastY: p.y, phase: 0, moving: false }; rendered.set(p.id, r); }
        const jump = Math.hypot(r.x - p.x, r.y - p.y) > 130;
        if (jump) { r.x = p.x; r.y = p.y; }
        else if (p.id === g.me && g.phase === 'playing') {
          const keys = pressed.current;
          const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
          const dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
          const magnitude = Math.hypot(dx, dy) || 1;
          const vx = dx / magnitude * SPEED * dt / 1000, vy = dy / magnitude * SPEED * dt / 1000;
          const blocked = (x: number, y: number) => p.alive && (collides(x, y) || (g.sabotage === 'doors' && Date.now() < g.doorsUntil && DOORS.some(door => hitsRect(x, y, door))));
          if (!blocked(r.x + vx, r.y)) r.x = clamp(r.x + vx, 24, MAP.width - 24);
          if (!blocked(r.x, r.y + vy)) r.y = clamp(r.y + vy, 24, MAP.height - 24);
          const correction = dx || dy ? .018 : .13;
          r.x += (p.x - r.x) * correction; r.y += (p.y - r.y) * correction;
        } else {
          const smoothing = 1 - Math.exp(-dt / (p.id === g.me ? 54 : 85));
          r.x += (p.x - r.x) * smoothing; r.y += (p.y - r.y) * smoothing;
        }
        const moving = Math.hypot(r.x - r.lastX, r.y - r.lastY) > .25;
        if (moving) r.phase += dt * .018;
        r.moving = moving;
        r.lastX = r.x; r.lastY = r.y;
      }
      const me = rendered.get(g.me);
      if (me) {
        camera.x += (clamp(me.x - VIEW.width / 2, 0, MAP.width - VIEW.width) - camera.x) * (1 - Math.exp(-dt / 150));
        camera.y += (clamp(me.y - VIEW.height / 2, 0, MAP.height - VIEW.height) - camera.y) * (1 - Math.exp(-dt / 150));
      }
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = '#07121e'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.save(); ctx.translate(-camera.x, -camera.y);
      ctx.fillStyle = '#0c2030'; ctx.fillRect(0, 0, MAP.width, MAP.height);
      ctx.fillStyle = '#123346';
      ctx.fillRect(470, 625, 280, 100); ctx.fillRect(1350, 625, 280, 100);
      ctx.fillRect(1000, 350, 100, 125); ctx.fillRect(1000, 875, 100, 125);
      ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
      for (let x = 0; x <= MAP.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP.height); ctx.stroke(); }
      for (let y = 0; y <= MAP.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP.width, y); ctx.stroke(); }
      ctx.setLineDash([23, 19]); ctx.strokeStyle = '#7ec7c32b'; ctx.lineWidth = 4;
      for (const [ax, ay, bx, by] of [[460, 675, 750, 675], [1350, 675, 1640, 675], [1050, 340, 1050, 475], [1050, 875, 1050, 1010]]) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = '#58a8bc22'; ctx.lineWidth = 2;
      ctx.strokeRect(23, 23, MAP.width - 46, MAP.height - 46);
      for (const room of ROOMS) {
        const meeting = room.kind === 'meeting';
        ctx.fillStyle = meeting ? '#173d4a' : '#152d3c';
        ctx.fillRect(room.x, room.y, room.w, room.h);
        ctx.fillStyle = meeting ? '#64d7d122' : '#ffffff0b';
        for (let x = room.x + 35; x < room.x + room.w - 25; x += 72) {
          for (let y = room.y + 40; y < room.y + room.h - 25; y += 72) ctx.fillRect(x, y, 3, 3);
        }
        roomDetails(ctx, room, time);
        ctx.fillStyle = meeting ? '#a5f6df' : '#81aabe';
        ctx.font = '700 14px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(room.name, room.x + 30, room.y + 42);
        ctx.fillStyle = '#85b8c632';
        ctx.fillRect(room.x + 28, room.y + 52, Math.min(140, room.w - 56), 2);
        if (meeting) {
          ctx.fillStyle = '#153540'; ctx.beginPath(); ctx.ellipse(EMERGENCY.x, EMERGENCY.y, 137, 91, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#69dccc66'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#265268'; ctx.beginPath(); ctx.ellipse(EMERGENCY.x, EMERGENCY.y, 105, 64, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#9ae4dc'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('BÀN HỌP KHẨN CẤP', EMERGENCY.x, EMERGENCY.y + 47);
        }
      }
      for (const wall of WALLS) {
        ctx.fillStyle = '#07152199'; ctx.fillRect(wall.x + 5, wall.y + 6, wall.w, wall.h);
        ctx.fillStyle = '#32566a'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = '#75b6bd88'; ctx.fillRect(wall.x, wall.y, wall.w, 3);
        ctx.fillStyle = '#091d2b'; ctx.fillRect(wall.x + 5, wall.y + wall.h - 4, Math.max(0, wall.w - 10), 2);
      }
      if (g.sabotage === 'doors' && Date.now() < g.doorsUntil) {
        for (const door of DOORS) {
          ctx.fillStyle = '#d34d61'; ctx.fillRect(door.x, door.y, door.w, door.h);
          ctx.strokeStyle = '#ffb4b4'; ctx.lineWidth = 3; ctx.strokeRect(door.x + 2, door.y + 2, door.w - 4, door.h - 4);
        }
      }
      for (const station of STATIONS) {
        const active = g.tasks.includes(station.id) && !g.completedTasks.includes(station.id);
        const pulse = active ? 3 + Math.sin(time * .004) * 2 : 0;
        ctx.fillStyle = active ? '#48d9d42b' : '#63829129';
        ctx.beginPath(); ctx.arc(station.x, station.y, 38 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1c4050'; ctx.beginPath(); ctx.roundRect(station.x - 29, station.y - 27, 58, 54, 12); ctx.fill();
        ctx.strokeStyle = active ? accent : '#547c89'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#d5fff6'; ctx.font = '27px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(station.icon, station.x, station.y + 9);
        ctx.fillStyle = active ? '#c3fff5' : '#9db9c4'; ctx.font = '700 12px system-ui';
        ctx.fillText(station.name, station.x, station.y + 48);
      }
      for (const vent of VENTS) {
        ctx.fillStyle = '#101e2a'; ctx.beginPath(); ctx.roundRect(vent.x - 23, vent.y - 15, 46, 30, 6); ctx.fill();
        ctx.strokeStyle = '#789eac'; ctx.lineWidth = 2; ctx.stroke();
        for (let i = -10; i <= 10; i += 10) { ctx.beginPath(); ctx.moveTo(vent.x - 14, vent.y + i / 2); ctx.lineTo(vent.x + 14, vent.y + i / 2); ctx.stroke(); }
      }
      ctx.fillStyle = '#f06472'; ctx.beginPath(); ctx.arc(EMERGENCY.x, EMERGENCY.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd3cb'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 11px system-ui'; ctx.fillText('HỌP', EMERGENCY.x, EMERGENCY.y + 4);
      if (g.sabotage === 'reactor') for (const point of REACTOR_FIXES) {
        ctx.fillStyle = '#f0525a'; ctx.beginPath(); ctx.arc(point.x, point.y, 27 + Math.sin(time * .008) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 23px system-ui'; ctx.fillText('!', point.x, point.y + 8);
      }
      for (const body of g.bodies) {
        const effect = g.kills?.find(k => k.target === body.playerId);
        if (effect && Date.now() - effect.at < 430) continue;
        ctx.fillStyle = '#020b18a6'; ctx.beginPath(); ctx.ellipse(body.x, body.y + 14, 29, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body.color; ctx.beginPath(); ctx.roundRect(body.x - 23, body.y - 8, 42, 23, 9); ctx.fill();
        ctx.fillStyle = '#bce7f0'; ctx.beginPath(); ctx.roundRect(body.x + 3, body.y - 13, 21, 12, 5); ctx.fill();
        ctx.fillStyle = '#e75b70'; ctx.font = '800 17px system-ui'; ctx.fillText('✕', body.x, body.y - 23);
      }
      for (const p of [...g.players].sort((a, b) => a.y - b.y)) {
        const r = rendered.get(p.id)!;
        const effect = g.kills?.find(k => k.target === p.id && Date.now() - k.at < 650);
        const attack = g.kills?.find(k => k.actor === p.id && Date.now() - k.at < 450);
        const lunge = attack ? Math.sin(Math.PI * (Date.now() - attack.at) / 450) * .27 : 0;
        astronaut(ctx, p, r.x + (attack ? (attack.x - r.x) * lunge : 0), r.y + (attack ? (attack.y - r.y) * lunge : 0), r.moving, r.phase, p.id === g.me, g.allies.includes(p.id) && p.id !== g.me, !!effect);
      }
      for (const effect of g.kills || []) {
        const age = Date.now() - effect.at;
        if (age < 0 || age > 850) continue;
        const t = age / 850;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#ff637a'; ctx.lineWidth = 8 * (1 - t) + 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 22 + t * 65, -.9, 2.3); ctx.stroke();
        ctx.strokeStyle = '#fff1ee'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(effect.x - 30 + t * 12, effect.y + 25); ctx.quadraticCurveTo(effect.x + 12, effect.y - 40 - t * 20, effect.x + 38 + t * 18, effect.y - 24); ctx.stroke();
        ctx.restore();
      }
      if (g.phase === 'playing' && g.role === 'crew' && g.players.find(p => p.id === g.me)?.alive && me) {
        const radius = g.sabotage === 'lights' ? 150 : 355;
        const fog = ctx.createRadialGradient(me.x, me.y, 50, me.x, me.y, radius);
        fog.addColorStop(0, '#02081300'); fog.addColorStop(.6, '#0208130c'); fog.addColorStop(1, '#020813ed');
        ctx.fillStyle = fog; ctx.fillRect(camera.x, camera.y, VIEW.width, VIEW.height);
      }
      ctx.restore();
      // A small minimap keeps the wide ship readable without hiding the play field.
      const scale = 148 / MAP.width, ox = VIEW.width - 171, oy = 23;
      ctx.fillStyle = '#06131edc'; ctx.beginPath(); ctx.roundRect(ox - 10, oy - 10, 168, 115, 12); ctx.fill();
      ctx.strokeStyle = '#7daeb056'; ctx.stroke();
      for (const room of ROOMS) {
        ctx.fillStyle = room.kind === 'meeting' ? '#3b968f' : '#30586c';
        ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      }
      if (me) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + me.x * scale, oy + me.y * scale, 3.5, 0, Math.PI * 2); ctx.fill(); }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} width={VIEW.width * 2} height={VIEW.height * 2} onClick={onInteract} aria-label="Bản đồ tàu, dùng WASD để di chuyển" />;
}
