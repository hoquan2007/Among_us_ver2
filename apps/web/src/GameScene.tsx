import { useEffect, useRef } from 'react';
import { DOORS, EMERGENCY, MAP, REACTOR_FIXES, ROOMS, SPEED, STATIONS, VENTS, VIEW, WALLS, collides, hitsRect, type PublicPlayer, type Snapshot } from '../../../packages/protocol/src/index';

const accent = '#78e7d7';
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));

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
  if (mine || ally) {
    ctx.strokeStyle = mine ? '#fff' : '#ff8a9a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 8 - bob, 24, 29, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#081524c9'; ctx.beginPath(); ctx.roundRect(x - 42, y - 61 - bob, 84, 20, 8); ctx.fill();
  ctx.fillStyle = '#edfaff'; ctx.textAlign = 'center'; ctx.font = '700 12px system-ui';
  ctx.fillText(p.name.slice(0, 12) + (ally ? ' ◆' : ''), x, y - 47 - bob);
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
      ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
      for (let x = 0; x <= MAP.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP.height); ctx.stroke(); }
      for (let y = 0; y <= MAP.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP.width, y); ctx.stroke(); }
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
        ctx.fillStyle = '#32566a'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = '#75b6bd88'; ctx.fillRect(wall.x, wall.y, wall.w, 3);
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
