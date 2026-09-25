import { useEffect, useRef } from 'react';
import { DOORS, EMERGENCY, REACTOR_FIXES, ROOMS, SPEED, STATIONS, VENTS, VIEW, WALLS, collides, hitsRect, mapBounds, type PublicPlayer, type Snapshot } from '../../../packages/protocol/src/index';
import electricalTexture from './assets/electrical.svg?url';
import reactorTexture from './assets/reactor.svg?url';
import meetingTexture from './assets/meeting.svg?url';
import navigationTexture from './assets/navigation.svg?url';
import archiveTexture from './assets/archive.svg?url';
import shieldTexture from './assets/shield.svg?url';
import maintenanceTexture from './assets/maintenance.svg?url';
import robotTexture from './assets/robot.svg?url';
import waterTexture from './assets/water.svg?url';

const accent = '#78e7d7';
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
const corridors = [
  { x: 470, y: 860, w: 630, h: 120 }, { x: 1700, y: 860, w: 630, h: 120 },
  { x: 1340, y: 380, w: 120, h: 305 }, { x: 1340, y: 1115, w: 120, h: 325 },
  { x: 530, y: 390, w: 125, h: 1040 }, { x: 2140, y: 390, w: 125, h: 1040 },
  { x: 490, y: 1850, w: 2250, h: 110, outer: true },
  { x: 2770, y: 150, w: 150, h: 1620, outer: true },
  { x: 1300, y: 1760, w: 200, h: 260, outer: true },
  { x: 2420, y: 1760, w: 180, h: 260, outer: true }
] as const;
const roomTextures = new Map<string, HTMLImageElement>();
for (const [name, url] of [
  ['PHÒNG ĐIỆN', electricalTexture], ['LÒ PHẢN ỨNG', reactorTexture], ['PHÒNG HỌP', meetingTexture],
  ['ĐỊNH VỊ', navigationTexture], ['LƯU TRỮ', archiveTexture], ['LÁ CHẮN', shieldTexture],
  ['BẢO TRÌ', maintenanceTexture], ['PHÒNG ROBOT', robotTexture], ['XỬ LÝ NƯỚC', waterTexture]
]) {
  const texture = new Image(); texture.src = url; roomTextures.set(name, texture);
}

function roomDetails(ctx: CanvasRenderingContext2D, room: (typeof ROOMS)[number], time: number) {
  const { x, y, w, h, name } = room;
  ctx.save();
  ctx.fillStyle = '#67c6c015';
  for (let px = x + 25; px < x + w - 10; px += 64) {
    for (let py = y + 30; py < y + h - 10; py += 64) ctx.fillRect(px, py, 2, 2);
  }
  ctx.strokeStyle = '#a1e7df1b'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 24, y + 25, w - 48, h - 50);
  ctx.strokeStyle = '#b6e4e013'; ctx.lineWidth = 1;
  for (let px = x + 96; px < x + w - 20; px += 96) { ctx.beginPath(); ctx.moveTo(px, y + 28); ctx.lineTo(px, y + h - 28); ctx.stroke(); }
  for (let py = y + 92; py < y + h - 20; py += 92) { ctx.beginPath(); ctx.moveTo(x + 28, py); ctx.lineTo(x + w - 28, py); ctx.stroke(); }
  ctx.fillStyle = '#8be0d932';
  for (const bx of [x + 30, x + w - 38]) for (const by of [y + 30, y + h - 38]) { ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill(); }
  // Reusable small props give every room detail without adding large image downloads.
  for (let i = 0; i < 12; i++) {
    const px = x + 43 + i % 6 * (w - 86) / 5;
    const py = i < 6 ? y + 66 : y + h - 48;
    const kind = i % 6;
    ctx.fillStyle = kind === 0 ? '#e6bd70' : kind === 3 ? '#72d4c6' : '#4d7887';
    if (kind === 0 || kind === 3) { ctx.beginPath(); ctx.arc(px, py, 5 + Math.sin(time * .002 + i) * .5, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 1) { ctx.fillRect(px - 13, py - 4, 26, 8); ctx.fillStyle = '#a3e8e8'; ctx.fillRect(px - 8, py - 2, 10, 2); }
    else if (kind === 2) { ctx.fillRect(px - 10, py - 8, 20, 16); ctx.strokeStyle = '#a9d5d288'; ctx.strokeRect(px - 7, py - 5, 14, 10); }
    else if (kind === 4) { ctx.fillRect(px - 14, py - 3, 28, 6); ctx.fillStyle = '#acd4d47a'; for (let n = -8; n <= 8; n += 8) ctx.fillRect(px + n, py - 7, 2, 14); }
    else { ctx.strokeStyle = '#e7bd75b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 12, py + 6); ctx.lineTo(px - 3, py - 6); ctx.moveTo(px, py + 6); ctx.lineTo(px + 9, py - 6); ctx.stroke(); }
  }
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
  } else if (name === 'NHÀ KÍNH') {
    for (let i = 0; i < 3; i++) {
      box(x + 34 + i * 86, y + 78, 65, 106, '#345d50');
      ctx.fillStyle = '#64c68b'; ctx.beginPath(); ctx.ellipse(x + 65 + i * 86, y + 113, 22, 39, i % 2 ? .4 : -.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a2e8a0'; ctx.beginPath(); ctx.ellipse(x + 57 + i * 86, y + 111, 8, 24, -.5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (name === 'KHO HÀNG' || name === 'KHOANG HÀNG') {
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const bx = x + 39 + i * 113, by = y + 78 + j * 114;
      box(bx, by, 76, 73, i === 1 ? '#5b614d' : '#5c4b46');
      ctx.strokeStyle = '#e4c07b99'; ctx.lineWidth = 4; ctx.strokeRect(bx + 10, by + 10, 56, 53);
      ctx.fillStyle = '#f2ce7d'; ctx.fillRect(bx + 35, by + 10, 7, 53);
    }
  } else if (name === 'KHÔNG KHÍ') {
    for (let i = 0; i < 3; i++) {
      const cx = x + 91 + i * 115, cy = y + 172;
      ctx.fillStyle = '#2d5664'; ctx.beginPath(); ctx.arc(cx, cy, 44, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9ae3e2'; ctx.lineWidth = 5; ctx.stroke();
      for (let j = 0; j < 3; j++) {
        const a = time * .0008 + j * Math.PI * 2 / 3;
        ctx.fillStyle = '#86cad4'; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, 19, 8, a, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (name === 'NHÀ CHỨA') {
    screen(x + 43, y + 70, 95, 56, '#f5c981');
    for (let i = 0; i < 2; i++) {
      box(x + 65 + i * 174, y + 164, 124, 93, '#4b6070');
      ctx.fillStyle = '#c4e6ef'; ctx.fillRect(x + 83 + i * 174, y + 183, 86, 9);
      ctx.fillStyle = '#f5c981'; ctx.fillRect(x + 83 + i * 174, y + 214, 45, 7);
    }
  } else if (name === 'ĐỊNH VỊ') {
    ctx.strokeStyle = '#93d7ff88'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + w / 2, y + 175, 45 + i * 38, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = '#c8f7ff'; ctx.beginPath(); ctx.moveTo(x + w / 2, y + 175); ctx.lineTo(x + w / 2 + Math.cos(time * .0005) * 122, y + 175 + Math.sin(time * .0005) * 122); ctx.stroke();
    for (let i = 0; i < 3; i++) screen(x + 40 + i * 115, y + 65, 84, 46, '#85c6ef');
  } else if (name === 'LƯU TRỮ') {
    for (let i = 0; i < 4; i++) { box(x + 35 + i * 96, y + 65, 70, 105, '#35576d'); box(x + 35 + i * 96, y + 205, 70, 70, '#2c5164'); }
    ctx.fillStyle = '#a9f3db'; for (let i = 0; i < 8; i++) ctx.fillRect(x + 57 + i % 4 * 96, y + 94 + Math.floor(i / 4) * 140, 22, 5);
  } else if (name === 'LÁ CHẮN') {
    ctx.fillStyle = '#6ad6e533'; ctx.beginPath(); ctx.arc(x + w / 2, y + 170, 105, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9af2eb'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x + w / 2, y + 170, 91, time * .0004, time * .0004 + Math.PI * 1.6); ctx.stroke();
    for (let i = 0; i < 4; i++) screen(x + 30 + i * 100, y + 65, 76, 43, i % 2 ? '#7de7e0' : '#9dc4ff');
  } else if (name === 'BẢO TRÌ') {
    for (let i = 0; i < 4; i++) { box(x + 36 + i * 97, y + 70, 72, 66, i % 2 ? '#5e6451' : '#355b66'); box(x + 36 + i * 97, y + 204, 72, 45, '#4a5d6b'); }
    ctx.strokeStyle = '#e9c57d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 55, y + 176); ctx.lineTo(x + w - 55, y + 176); ctx.stroke();
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#f5cb7d' : '#203b4b'; ctx.fillRect(x + 60 + i * 48, y + 166, 25, 20); }
  } else if (name === 'PHÒNG ROBOT') {
    for (let i = 0; i < 3; i++) {
      const cx = x + 98 + i * 120;
      box(cx - 34, y + 83, 68, 97, '#3c6371');
      ctx.fillStyle = '#b4eff1'; ctx.beginPath(); ctx.arc(cx, y + 113, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#68c6d5'; ctx.fillRect(cx - 23, y + 144, 46, 6);
    }
    screen(x + 130, y + 228, 180, 52, '#8be9d6');
  } else if (name === 'XỬ LÝ NƯỚC') {
    for (let i = 0; i < 3; i++) {
      const cx = x + 95 + i * 120;
      ctx.fillStyle = '#256b8599'; ctx.beginPath(); ctx.arc(cx, y + 155, 47, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a6e7ee'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#b4f3ff77'; ctx.fillRect(cx - 24, y + 155 + Math.sin(time * .001 + i) * 4, 48, 21);
    }
    ctx.strokeStyle = '#5facc0'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x + 55, y + 248); ctx.lineTo(x + w - 55, y + 248); ctx.stroke();
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

export function GameScene({ game, onInteract, pressed, touchDirection }: { game: Snapshot; onInteract: () => void; pressed: { current: Set<string> }; touchDirection: { current: { dx: number; dy: number } } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(game);
  const clockOffset = useRef(0);
  const lastServerTime = useRef(0);
  gameRef.current = game;
  if (game.serverTime !== lastServerTime.current) {
    clockOffset.current = game.serverTime - Date.now();
    lastServerTime.current = game.serverTime;
  }
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const view: { width: number; height: number; scale: number } = { width: VIEW.width, height: VIEW.height, scale: 2 };
    const resize = () => {
      const frame = canvas.parentElement;
      if (!frame) return;
      const compact = matchMedia('(max-width: 900px)').matches;
      const width = Math.max(1, frame.clientWidth);
      const height = compact ? Math.max(1, frame.clientHeight) : width * VIEW.height / VIEW.width;
      view.width = compact ? (width > height ? 900 : 520) : VIEW.width;
      view.height = compact ? Math.round(view.width * height / width) : VIEW.height;
      view.scale = compact ? Math.min(devicePixelRatio || 1, 1.5) : 2;
      canvas.width = Math.round(view.width * view.scale);
      canvas.height = Math.round(view.height * view.scale);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    window.addEventListener('resize', resize);
    resize();
    let frame = 0;
    let last = performance.now();
    const rendered = new Map<string, { x: number; y: number; lastX: number; lastY: number; phase: number; moving: boolean }>();
    const camera = { x: (mapBounds(gameRef.current.mapVariant).width - view.width) / 2, y: (mapBounds(gameRef.current.mapVariant).height - view.height) / 2 };
    const draw = (time: number) => {
      const g = gameRef.current;
      const bounds = mapBounds(g.mapVariant);
      const now = Date.now() + clockOffset.current;
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
          const dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')) || touchDirection.current.dx;
          const dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) || touchDirection.current.dy;
          const magnitude = Math.hypot(dx, dy) || 1;
          const vx = dx / magnitude * SPEED * dt / 1000, vy = dy / magnitude * SPEED * dt / 1000;
          const blocked = (x: number, y: number) => p.alive && (collides(x, y, g.mapVariant) || (g.sabotage === 'doors' && now < g.doorsUntil && DOORS.some(door => hitsRect(x, y, door))));
          if (!blocked(r.x + vx, r.y)) r.x = clamp(r.x + vx, 24, bounds.width - 24);
          if (!blocked(r.x, r.y + vy)) r.y = clamp(r.y + vy, 24, bounds.height - 24);
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
        camera.x += (clamp(me.x - view.width / 2, 0, bounds.width - view.width) - camera.x) * (1 - Math.exp(-dt / 150));
        camera.y += (clamp(me.y - view.height / 2, 0, bounds.height - view.height) - camera.y) * (1 - Math.exp(-dt / 150));
      }
      const onScreen = (x: number, y: number, w = 0, h = 0, pad = 64) =>
        x + w >= camera.x - pad && x <= camera.x + view.width + pad &&
        y + h >= camera.y - pad && y <= camera.y + view.height + pad;
      ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      ctx.clearRect(0, 0, view.width, view.height);
      ctx.fillStyle = '#07121e'; ctx.fillRect(0, 0, view.width, view.height);
      ctx.save(); ctx.translate(-camera.x, -camera.y);
      ctx.fillStyle = '#0c2030'; ctx.fillRect(0, 0, bounds.width, bounds.height);
      for (const corridor of corridors) {
        if ('outer' in corridor && g.mapVariant !== 'full') continue;
        if (!onScreen(corridor.x, corridor.y, corridor.w, corridor.h)) continue;
        const vertical = corridor.h > corridor.w;
        ctx.fillStyle = 'rgba(29, 68, 82, .74)'; ctx.fillRect(corridor.x, corridor.y, corridor.w, corridor.h);
        ctx.strokeStyle = '#75c9c470'; ctx.lineWidth = 3; ctx.strokeRect(corridor.x + 5, corridor.y + 5, corridor.w - 10, corridor.h - 10);
        ctx.fillStyle = '#70d3c032';
        if (vertical) {
          ctx.fillRect(corridor.x + 18, corridor.y, 5, corridor.h);
          ctx.fillRect(corridor.x + corridor.w - 23, corridor.y, 5, corridor.h);
          for (let y = corridor.y + 30; y < corridor.y + corridor.h - 15; y += 80) {
            if (!onScreen(corridor.x, y, corridor.w, 20)) continue;
            ctx.fillStyle = '#b6e9dc38'; ctx.fillRect(corridor.x + 28, y, corridor.w - 56, 2);
            ctx.fillStyle = '#f1d083'; ctx.fillRect(corridor.x + 10, y - 4, 8, 8); ctx.fillRect(corridor.x + corridor.w - 18, y - 4, 8, 8);
          }
        } else {
          ctx.fillRect(corridor.x, corridor.y + 18, corridor.w, 5);
          ctx.fillRect(corridor.x, corridor.y + corridor.h - 23, corridor.w, 5);
          for (let x = corridor.x + 30; x < corridor.x + corridor.w - 15; x += 80) {
            if (!onScreen(x, corridor.y, 20, corridor.h)) continue;
            ctx.fillStyle = '#b6e9dc38'; ctx.fillRect(x, corridor.y + 28, 2, corridor.h - 56);
            ctx.fillStyle = '#f1d083'; ctx.fillRect(x - 4, corridor.y + 10, 8, 8); ctx.fillRect(x - 4, corridor.y + corridor.h - 18, 8, 8);
          }
        }
      }
      ctx.fillStyle = '#25465b';
      for (const [px, py] of [[600, 900], [2060, 900], [1400, 490], [1400, 1300]]) {
        ctx.beginPath(); ctx.arc(px, py, 37, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8ccbc04d'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#25465b';
      }
      ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
      for (let x = Math.floor(camera.x / 40) * 40; x <= Math.min(bounds.width, camera.x + view.width + 40); x += 40) { ctx.beginPath(); ctx.moveTo(x, camera.y); ctx.lineTo(x, camera.y + view.height); ctx.stroke(); }
      for (let y = Math.floor(camera.y / 40) * 40; y <= Math.min(bounds.height, camera.y + view.height + 40); y += 40) { ctx.beginPath(); ctx.moveTo(camera.x, y); ctx.lineTo(camera.x + view.width, y); ctx.stroke(); }
      ctx.setLineDash([23, 19]); ctx.strokeStyle = '#7ec7c32b'; ctx.lineWidth = 4;
      for (const [ax, ay, bx, by] of [[470, 920, 1100, 920], [1700, 920, 2330, 920], [1400, 380, 1400, 685], [1400, 1115, 1400, 1440]]) {
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = '#58a8bc22'; ctx.lineWidth = 2;
      ctx.strokeRect(23, 23, bounds.width - 46, bounds.height - 46);
      for (const room of ROOMS) {
        if (room.outer && g.mapVariant !== 'full') continue;
        if (!onScreen(room.x, room.y, room.w, room.h)) continue;
        const meeting = room.kind === 'meeting';
        const hue = room.name === 'NHÀ KÍNH' ? '#284a3c' : room.name === 'LÒ PHẢN ỨNG' ? '#274557' : room.name === 'KHO NHIÊN LIỆU' ? '#4c4332' : room.name === 'Y TẾ' ? '#31515a' : room.name === 'KHO HÀNG' || room.name === 'KHOANG HÀNG' ? '#3d4351' : room.name === 'KHÔNG KHÍ' ? '#214953' : room.name === 'ĐỊNH VỊ' ? '#253f60' : room.name === 'LƯU TRỮ' ? '#354e67' : room.name === 'LÁ CHẮN' ? '#225268' : room.name === 'BẢO TRÌ' ? '#514d3e' : room.name === 'PHÒNG ROBOT' ? '#285367' : room.name === 'XỬ LÝ NƯỚC' ? '#1b5261' : '#152d3c';
        ctx.fillStyle = meeting ? '#173d4a' : hue;
        ctx.fillRect(room.x, room.y, room.w, room.h);
        const texture = roomTextures.get(room.name);
        if (texture?.complete && texture.naturalWidth) ctx.drawImage(texture, room.x, room.y, room.w, room.h);
        const roomGlow = ctx.createRadialGradient(room.x + room.w / 2, room.y + room.h / 2, 12, room.x + room.w / 2, room.y + room.h / 2, Math.max(room.w, room.h) * .65);
        roomGlow.addColorStop(0, room.outer ? '#70dded19' : '#83e8d915'); roomGlow.addColorStop(1, '#081b3200');
        ctx.fillStyle = roomGlow; ctx.fillRect(room.x, room.y, room.w, room.h);
        ctx.fillStyle = meeting ? '#64d7d122' : '#ffffff0b';
        for (let x = room.x + 35; x < room.x + room.w - 25; x += 72) {
          for (let y = room.y + 40; y < room.y + room.h - 25; y += 72) ctx.fillRect(x, y, 3, 3);
        }
        roomDetails(ctx, room, time);
        ctx.fillStyle = '#071925c9'; ctx.beginPath(); ctx.roundRect(room.x + 22, room.y + 20, Math.min(room.w - 44, 180), 31, 7); ctx.fill();
        ctx.strokeStyle = room.outer ? '#91dcf666' : '#76d8c566'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = meeting ? '#a5f6df' : room.outer ? '#a9def1' : '#a8d6df';
        ctx.font = '700 14px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(room.name, room.x + 30, room.y + 42);
        ctx.fillStyle = '#85b8c632';
        ctx.fillRect(room.x + 28, room.y + 52, Math.min(140, room.w - 56), 2);
        ctx.strokeStyle = room.outer ? '#85e7f173' : '#9fe0c65e'; ctx.lineWidth = 4;
        for (const [cx, cy, sx, sy] of [[room.x + 19, room.y + 19, 1, 1], [room.x + room.w - 19, room.y + 19, -1, 1], [room.x + 19, room.y + room.h - 19, 1, -1], [room.x + room.w - 19, room.y + room.h - 19, -1, -1]]) {
          ctx.beginPath(); ctx.moveTo(cx, cy + sy * 20); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 20, cy); ctx.stroke();
        }
        if (meeting) {
          ctx.fillStyle = '#153540'; ctx.beginPath(); ctx.ellipse(EMERGENCY.x, EMERGENCY.y, 137, 91, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#69dccc66'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#265268'; ctx.beginPath(); ctx.ellipse(EMERGENCY.x, EMERGENCY.y, 105, 64, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#9ae4dc'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
          ctx.fillText('BÀN HỌP KHẨN CẤP', EMERGENCY.x, EMERGENCY.y + 47);
        }
      }
      for (const wall of WALLS) {
        if (!onScreen(wall.x, wall.y, wall.w, wall.h)) continue;
        ctx.fillStyle = '#07152199'; ctx.fillRect(wall.x + 5, wall.y + 6, wall.w, wall.h);
        ctx.fillStyle = '#32566a'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = '#75b6bd88'; ctx.fillRect(wall.x, wall.y, wall.w, 3);
        ctx.fillStyle = '#091d2b'; ctx.fillRect(wall.x + 5, wall.y + wall.h - 4, Math.max(0, wall.w - 10), 2);
      }
      for (const door of DOORS) {
        if (!onScreen(door.x, door.y, door.w, door.h)) continue;
        ctx.fillStyle = '#62dccc34'; ctx.fillRect(door.x, door.y, door.w, door.h);
        ctx.strokeStyle = '#b4f5e989'; ctx.lineWidth = 2;
        if (door.w > door.h) {
          ctx.beginPath(); ctx.moveTo(door.x + 17, door.y + door.h / 2); ctx.lineTo(door.x + door.w - 17, door.y + door.h / 2); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(door.x + door.w / 2, door.y + 17); ctx.lineTo(door.x + door.w / 2, door.y + door.h - 17); ctx.stroke();
        }
      }
      if (g.sabotage === 'doors' && now < g.doorsUntil) {
        for (const door of DOORS) {
          if (!onScreen(door.x, door.y, door.w, door.h)) continue;
          ctx.fillStyle = '#d34d61'; ctx.fillRect(door.x, door.y, door.w, door.h);
          ctx.strokeStyle = '#ffb4b4'; ctx.lineWidth = 3; ctx.strokeRect(door.x + 2, door.y + 2, door.w - 4, door.h - 4);
        }
      }
      for (const station of STATIONS) {
        if ('outer' in station && g.mapVariant !== 'full') continue;
        if (!onScreen(station.x, station.y, 0, 0, 95)) continue;
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
        if ('outer' in vent && g.mapVariant !== 'full') continue;
        if (!onScreen(vent.x, vent.y)) continue;
        ctx.fillStyle = '#101e2a'; ctx.beginPath(); ctx.roundRect(vent.x - 23, vent.y - 15, 46, 30, 6); ctx.fill();
        ctx.strokeStyle = '#789eac'; ctx.lineWidth = 2; ctx.stroke();
        for (let i = -10; i <= 10; i += 10) { ctx.beginPath(); ctx.moveTo(vent.x - 14, vent.y + i / 2); ctx.lineTo(vent.x + 14, vent.y + i / 2); ctx.stroke(); }
      }
      ctx.fillStyle = '#f06472'; ctx.beginPath(); ctx.arc(EMERGENCY.x, EMERGENCY.y, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd3cb'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 11px system-ui'; ctx.fillText('HỌP', EMERGENCY.x, EMERGENCY.y + 4);
      if (g.sabotage === 'reactor') for (const [index, point] of REACTOR_FIXES.entries()) {
        const fixed = g.reactorFixed.includes(index);
        ctx.fillStyle = fixed ? '#36c99b' : '#f0525a'; ctx.beginPath(); ctx.arc(point.x, point.y, 27 + Math.sin(time * .008) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '800 23px system-ui'; ctx.fillText(fixed ? '✓' : '!', point.x, point.y + 8);
      }
      for (const body of g.bodies) {
        if (!onScreen(body.x, body.y)) continue;
        const effect = g.kills?.find(k => k.target === body.playerId);
        if (effect && now - effect.at < 430) continue;
        ctx.fillStyle = '#020b18a6'; ctx.beginPath(); ctx.ellipse(body.x, body.y + 14, 29, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body.color; ctx.beginPath(); ctx.roundRect(body.x - 23, body.y - 8, 42, 23, 9); ctx.fill();
        ctx.fillStyle = '#bce7f0'; ctx.beginPath(); ctx.roundRect(body.x + 3, body.y - 13, 21, 12, 5); ctx.fill();
        ctx.fillStyle = '#e75b70'; ctx.font = '800 17px system-ui'; ctx.fillText('✕', body.x, body.y - 23);
      }
      for (const p of [...g.players].sort((a, b) => a.y - b.y)) {
        const r = rendered.get(p.id)!;
        if (!onScreen(r.x, r.y)) continue;
        const effect = g.kills?.find(k => k.target === p.id && now - k.at < 650);
        const attack = g.kills?.find(k => k.actor === p.id && now - k.at < 450);
        const lunge = attack ? Math.sin(Math.PI * (now - attack.at) / 450) * .27 : 0;
        astronaut(ctx, p, r.x + (attack ? (attack.x - r.x) * lunge : 0), r.y + (attack ? (attack.y - r.y) * lunge : 0), r.moving, r.phase, p.id === g.me, g.allies.includes(p.id) && p.id !== g.me, !!effect);
      }
      for (const effect of g.kills || []) {
        const age = now - effect.at;
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
        ctx.fillStyle = fog; ctx.fillRect(camera.x, camera.y, view.width, view.height);
      }
      ctx.restore();
      // A small minimap keeps the wide ship readable without hiding the play field.
      const scale = Math.min(148 / bounds.width, 98 / bounds.height), ox = view.width - 171, oy = 23;
      ctx.fillStyle = '#06131edc'; ctx.beginPath(); ctx.roundRect(ox - 10, oy - 10, 168, 118, 12); ctx.fill();
      ctx.strokeStyle = '#7daeb056'; ctx.stroke();
      for (const room of ROOMS) {
        if (room.outer && g.mapVariant !== 'full') continue;
        ctx.fillStyle = room.kind === 'meeting' ? '#3b968f' : '#30586c';
        ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.w * scale, room.h * scale);
      }
      for (const station of STATIONS) {
        if (!g.tasks.includes(station.id) || g.completedTasks.includes(station.id)) continue;
        ctx.fillStyle = '#8effd7'; ctx.beginPath(); ctx.arc(ox + station.x * scale, oy + station.y * scale, 2.7, 0, Math.PI * 2); ctx.fill();
      }
      if (g.sabotage === 'reactor') for (const [index, point] of REACTOR_FIXES.entries()) {
        ctx.fillStyle = g.reactorFixed.includes(index) ? '#36c99b' : '#ff727d'; ctx.beginPath(); ctx.arc(ox + point.x * scale, oy + point.y * scale, 4, 0, Math.PI * 2); ctx.fill();
      }
      if (g.sabotage === 'lights') {
        const point = STATIONS[0]; ctx.fillStyle = '#ff727d'; ctx.beginPath(); ctx.arc(ox + point.x * scale, oy + point.y * scale, 4, 0, Math.PI * 2); ctx.fill();
      }
      if (me) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + me.x * scale, oy + me.y * scale, 3.5, 0, Math.PI * 2); ctx.fill(); }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} width={VIEW.width * 2} height={VIEW.height * 2} onClick={event => { if (event.detail && matchMedia('(pointer: fine)').matches) onInteract(); }} aria-label="Bản đồ tàu" />;
}
