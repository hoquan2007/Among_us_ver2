import { DurableObject } from 'cloudflare:workers';
import {
  COLORS, DOORS, EMERGENCY, INTERACT_RANGE, KILL_RANGE, MAP, REACTOR_FIXES, SPEED,
  STATIONS, VENTS, collides, distance, hitsRect,
  type Body, type ChatMessage, type ClientMessage, type KillEffect, type MeetingStage,
  type Phase, type Role, type Sabotage, type ServerMessage, type Snapshot
} from '../../../packages/protocol/src/index';

interface Env { ROOMS: DurableObjectNamespace<GameRoom>; WEB_ORIGIN: string; }
interface Player {
  id: string; token: string; name: string; color: string; x: number; y: number;
  alive: boolean; connected: boolean; disconnectedAt: number; role: Role | null;
  tasks: string[]; completedTasks: string[]; taskStarted: Record<string, number>;
  killReadyAt: number; sabotageReadyAt: number; emergencyUsed: number;
  lastMoveAt: number; lastMessageAt: number; votes: string | null | undefined;
}
interface Meeting {
  stage: MeetingStage; endsAt: number; reporter: string; reason: string;
  ejected: string | null; skipped: boolean; endVotes: string[];
}
interface Game {
  code: string; createdAt: number; phase: Phase; host: string;
  players: Player[]; bodies: Body[]; kills?: KillEffect[]; sabotage: Sabotage; reactorDeadline: number;
  reactorFixed: number[]; reactorFixers: Record<number, { id: string; at: number }>; lightsFixed: boolean; doorsUntil: number;
  meeting: Meeting | null; chat: ChatMessage[]; winner: Role | null; winnerReason: string;
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });
const roomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(random, n => chars[n % chars.length]).join('');
};
const cleanName = (input: string) => input.trim().replace(/[\x00-\x1f<>]/g, '').slice(0, 16) || 'Phi hành gia';
const REACTOR_WINDOW = 20_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    const allowed = origin === env.WEB_ORIGIN || (env.WEB_ORIGIN === 'http://localhost:5173' && /^http:\/\/localhost:\d+$/.test(origin));
    const cors = { 'Access-Control-Allow-Origin': allowed ? origin : env.WEB_ORIGIN, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true }, 200, cors);
    if (!allowed) return json({ error: 'Origin không được phép' }, 403, cors);
    if (url.pathname === '/rooms' && request.method === 'POST') {
      for (let i = 0; i < 8; i++) {
        const code = roomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch(`https://room.internal/init?code=${code}`, { method: 'POST' });
        if (res.ok) return json({ code }, 201, cors);
      }
      return json({ error: 'Không tạo được phòng, thử lại.' }, 503, cors);
    }
    const match = url.pathname.match(/^\/ws\/([A-Z2-9]{6})$/);
    if (match && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(match[1]));
      return stub.fetch(request);
    }
    return json({ error: 'Không tìm thấy' }, 404, cors);
  }
};

export class GameRoom extends DurableObject<Env> {
  private game: Game | null = null;
  private lastBroadcast = 0;
  private lastPersist = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { this.game = (await ctx.storage.get<Game>('game')) ?? null; });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/init' && request.method === 'POST') {
      if (this.game) return json({ error: 'exists' }, 409);
      const code = url.searchParams.get('code') || '';
      this.game = { code, createdAt: Date.now(), phase: 'lobby', host: '', players: [], bodies: [], kills: [], sabotage: null,
        reactorDeadline: 0, reactorFixed: [], reactorFixers: {}, lightsFixed: true, doorsUntil: 0,
        meeting: null, chat: [], winner: null, winnerReason: '' };
      await this.persist();
      await this.ctx.storage.setAlarm(Date.now() + 60 * 60_000);
      return json({ code }, 201);
    }
    if (!this.game) return json({ error: 'Phòng không tồn tại' }, 404);
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket required' }, 426);
    const name = cleanName(url.searchParams.get('name') || '');
    const token = url.searchParams.get('token') || '';
    const game = this.game;
    let player = game.players.find(p => p.token === token && token.length >= 32);
    if (!player) {
      if (game.phase !== 'lobby') return json({ error: 'Trận đã bắt đầu' }, 409);
      if (game.players.length >= 10) return json({ error: 'Phòng đã đầy' }, 409);
      const id = crypto.randomUUID();
      const color = COLORS.find(c => !game.players.some(p => p.color === c)) || COLORS[game.players.length % COLORS.length];
      player = { id, token: crypto.randomUUID(), name, color, x: MAP.width / 2, y: MAP.height / 2,
        alive: true, connected: true, disconnectedAt: 0, role: null, tasks: [], completedTasks: [], taskStarted: {},
        killReadyAt: 0, sabotageReadyAt: 0, emergencyUsed: 0, lastMoveAt: Date.now(), lastMessageAt: 0, votes: undefined };
      game.players.push(player);
      if (!game.host) game.host = id;
    } else {
      for (const old of this.ctx.getWebSockets()) {
        if ((old.deserializeAttachment() as { id?: string } | null)?.id === player.id) old.close(4001, 'Đã kết nối ở nơi khác');
      }
      player.connected = true;
      player.disconnectedAt = 0;
      player.lastMoveAt = Date.now();
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: player.id });
    this.send(server, { type: 'welcome', token: player.token, id: player.id });
    await this.persist();
    this.broadcast(true);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const game = this.game;
    if (!game || typeof data !== 'string' || data.length > 1024) return;
    const id = (ws.deserializeAttachment() as { id?: string } | null)?.id;
    const player = game.players.find(p => p.id === id);
    if (!player) return;
    let message: ClientMessage;
    try { message = JSON.parse(data) as ClientMessage; } catch { return; }
    if (!message || typeof message.type !== 'string') return;
    const now = Date.now();
    if (now - player.lastMessageAt < 20 && message.type !== 'taskStart' && message.type !== 'taskComplete') return;
    player.lastMessageAt = now;
    const error = await this.handle(player, message, now);
    if (error) this.send(ws, { type: 'error', message: error });
    else if (message.type === 'taskStart') this.send(ws, { type: 'taskReady', id: message.id });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const id = (ws.deserializeAttachment() as { id?: string } | null)?.id;
    const player = this.game?.players.find(p => p.id === id);
    if (!player) return;
    if (this.ctx.getWebSockets().some(other => other !== ws && (other.deserializeAttachment() as { id?: string } | null)?.id === id)) return;
    player.connected = false;
    player.disconnectedAt = Date.now();
    if (this.game?.host === player.id) {
      this.game.host = this.game.players.find(p => p.connected && p.id !== player.id)?.id || player.id;
    }
    await this.persist();
    await this.schedule();
    this.broadcast(true);
  }

  async alarm(): Promise<void> {
    const g = this.game;
    if (!g) return;
    const now = Date.now();
    if (g.phase === 'meeting' && g.meeting && now >= g.meeting.endsAt) this.advanceMeeting(now);
    if (g.phase === 'playing' && g.sabotage === 'reactor' && now >= g.reactorDeadline) this.end('impostor', 'Lò phản ứng phát nổ');
    if (g.phase === 'playing' && g.sabotage === 'reactor' && g.reactorFixed.length && now >= this.reactorWindowEndsAt()) {
      g.reactorFixed = []; g.reactorFixers = {};
    }
    if (g.sabotage === 'doors' && now >= g.doorsUntil) { g.sabotage = null; g.doorsUntil = 0; }
    for (const p of [...g.players]) {
      if (p.connected || !p.disconnectedAt || now - p.disconnectedAt < 60_000) continue;
      g.players = g.players.filter(x => x.id !== p.id);
    }
    if (!g.players.some(p => p.id === g.host)) g.host = g.players[0]?.id || '';
    if (g.phase === 'playing') this.checkWin();
    if (g.players.length === 0 && now - g.createdAt > 60 * 60_000) {
      await this.ctx.storage.delete('game');
      this.game = null;
      return;
    }
    await this.persist();
    this.broadcast(true);
    await this.schedule();
  }

  private async handle(p: Player, m: ClientMessage, now: number): Promise<string | void> {
    const g = this.game!;
    if (m.type === 'start') {
      if (g.phase !== 'lobby' || p.id !== g.host || g.players.filter(x => x.connected).length < 4) return 'Cần host và ít nhất 4 người đang kết nối.';
      g.players = g.players.filter(x => x.connected);
      this.startGame(now);
    } else if (m.type === 'restart') {
      if (g.phase !== 'ended' || p.id !== g.host) return 'Chỉ host có thể chơi lại.';
      g.phase = 'lobby'; g.bodies = []; g.sabotage = null; g.meeting = null; g.chat = []; g.winner = null; g.winnerReason = '';
      for (const x of g.players) { x.role = null; x.alive = true; x.tasks = []; x.completedTasks = []; x.emergencyUsed = 0; }
    } else if (m.type === 'move') {
      if (g.phase !== 'playing') return;
      const dx = Number(m.dx), dy = Number(m.dy);
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 1 || Math.abs(dy) > 1) return;
      const dt = Math.min(250, Math.max(0, now - p.lastMoveAt));
      if (dt < 65) return;
      p.lastMoveAt = now;
      const magnitude = Math.hypot(dx, dy) || 1;
      const vx = dx / Math.max(1, magnitude) * SPEED * dt / 1000;
      const vy = dy / Math.max(1, magnitude) * SPEED * dt / 1000;
      const x = p.x + vx, y = p.y + vy;
      if ((!p.alive ? x >= 24 && x <= MAP.width - 24 : !collides(x, p.y) && !this.doorBlocks(x, p.y, now))) p.x = x;
      if ((!p.alive ? y >= 24 && y <= MAP.height - 24 : !collides(p.x, y) && !this.doorBlocks(p.x, y, now))) p.y = y;
      if (now - this.lastBroadcast >= 100) this.broadcast();
      if (now - this.lastPersist >= 1000) await this.persist();
      return;
    } else if (m.type === 'taskStart') {
      if (g.phase !== 'playing' || p.role !== 'crew' || !p.tasks.includes(m.id) || p.completedTasks.includes(m.id)) return 'Nhiệm vụ không khả dụng.';
      const station = STATIONS.find(s => s.id === m.id);
      if (!station || distance(p, station) > INTERACT_RANGE) return 'Hãy đứng gần trạm nhiệm vụ.';
      p.taskStarted[m.id] ??= now;
    } else if (m.type === 'taskComplete') {
      if (g.phase !== 'playing' || p.role !== 'crew' || !p.tasks.includes(m.id) || p.completedTasks.includes(m.id)) return;
      const station = STATIONS.find(s => s.id === m.id);
      if (!station || distance(p, station) > INTERACT_RANGE || now - (p.taskStarted[m.id] || 0) < 1800) return 'Hãy hoàn thành nhiệm vụ tại trạm.';
      p.completedTasks.push(m.id);
      delete p.taskStarted[m.id];
      this.checkWin();
    } else if (m.type === 'kill') {
      if (g.phase !== 'playing' || p.role !== 'impostor' || !p.alive || now < p.killReadyAt) return;
      const target = g.players.find(x => x.id === m.target && x.alive && x.role === 'crew');
      if (!target || distance(p, target) > KILL_RANGE) return;
      target.alive = false;
      g.bodies.push({ id: crypto.randomUUID(), playerId: target.id, x: target.x, y: target.y, color: target.color });
      g.kills ??= [];
      g.kills = [...g.kills.filter(effect => now - effect.at < 1800), { id: crypto.randomUUID(), x: target.x, y: target.y, actor: p.id, target: target.id, at: now }];
      p.killReadyAt = now + 30_000;
      this.checkWin();
    } else if (m.type === 'report') {
      if (g.phase !== 'playing' || !p.alive) return;
      const body = g.bodies.find(b => b.id === m.body);
      if (!body || distance(p, body) > INTERACT_RANGE) return;
      this.openMeeting(p, 'Báo cáo xác', now);
    } else if (m.type === 'emergency') {
      if (g.phase !== 'playing' || !p.alive || p.emergencyUsed >= 1 || g.sabotage === 'reactor' || distance(p, EMERGENCY) > INTERACT_RANGE) return;
      p.emergencyUsed++;
      this.openMeeting(p, 'Họp khẩn cấp', now);
    } else if (m.type === 'vote') {
      if (g.phase !== 'meeting' || g.meeting?.stage !== 'voting' || !p.alive || p.votes !== undefined) return;
      if (m.target !== null && !g.players.some(x => x.id === m.target && x.alive)) return;
      p.votes = m.target;
      if (g.players.filter(x => x.alive).every(x => x.votes !== undefined)) this.advanceMeeting(now);
    } else if (m.type === 'endMeeting') {
      const meeting = g.meeting;
      if (g.phase !== 'meeting' || !meeting || meeting.stage !== 'discussion' || !p.alive || !p.connected) return;
      meeting.endVotes ??= [];
      if (meeting.endVotes.includes(p.id)) return;
      meeting.endVotes.push(p.id);
      const eligible = g.players.filter(x => x.alive && x.connected).length;
      if (meeting.endVotes.length > eligible / 2) {
        meeting.stage = 'result'; meeting.skipped = true; meeting.ejected = null; meeting.endsAt = now + 5_000;
        g.chat.push({ id: crypto.randomUUID(), name: 'Hệ thống', text: 'Đa số đã chọn kết thúc cuộc họp.', at: now, ghost: false });
      }
    } else if (m.type === 'chat') {
      if (g.phase !== 'meeting' || typeof m.text !== 'string') return;
      const text = m.text.trim().slice(0, 180);
      if (!text) return;
      if (g.chat.filter(x => x.at > now - 10_000 && x.name === p.name).length >= 5) return;
      g.chat.push({ id: crypto.randomUUID(), name: p.name, text, at: now, ghost: !p.alive });
      g.chat = g.chat.slice(-60);
    } else if (m.type === 'sabotage') {
      if (g.phase !== 'playing' || p.role !== 'impostor' || !p.alive || g.sabotage || now < p.sabotageReadyAt) return;
      if (!['lights', 'reactor', 'doors'].includes(m.kind)) return;
      g.sabotage = m.kind;
      g.lightsFixed = m.kind !== 'lights';
      g.reactorFixed = [];
      g.reactorFixers = {};
      g.reactorDeadline = m.kind === 'reactor' ? now + 90_000 : 0;
      g.doorsUntil = m.kind === 'doors' ? now + 12_000 : 0;
      for (const x of g.players.filter(x => x.role === 'impostor')) x.sabotageReadyAt = now + 35_000;
      if (m.kind === 'doors') await this.ctx.storage.setAlarm(g.doorsUntil);
    } else if (m.type === 'fix') {
      if (g.phase !== 'playing' || !p.alive || p.role !== 'crew') return;
      if (g.sabotage === 'lights' && distance(p, STATIONS[0]) <= INTERACT_RANGE) {
        g.sabotage = null; g.lightsFixed = true;
      } else if (g.sabotage === 'reactor' && (m.point === 0 || m.point === 1) && distance(p, REACTOR_FIXES[m.point]) <= INTERACT_RANGE) {
        g.reactorFixers ??= {};
        for (const key of Object.keys(g.reactorFixers)) if (now - g.reactorFixers[Number(key)].at >= REACTOR_WINDOW) delete g.reactorFixers[Number(key)];
        const other = g.reactorFixers[m.point === 0 ? 1 : 0];
        if (other?.id === p.id) return 'Cần hai người sửa lò phản ứng.';
        g.reactorFixers[m.point] = { id: p.id, at: now };
        g.reactorFixed = Object.keys(g.reactorFixers).map(Number);
        if (g.reactorFixed.length === 2) { g.sabotage = null; g.reactorDeadline = 0; g.reactorFixers = {}; g.reactorFixed = []; }
      }
    } else if (m.type === 'vent') {
      if (g.phase !== 'playing' || p.role !== 'impostor' || !p.alive || !Number.isInteger(m.index)) return;
      const vent = VENTS[m.index];
      if (!vent || distance(p, vent) > INTERACT_RANGE) return;
      p.x = VENTS[vent.to].x; p.y = VENTS[vent.to].y;
    } else return;
    await this.persist();
    await this.schedule();
    this.broadcast(true);
  }

  private startGame(now: number): void {
    const g = this.game!;
    const count = g.players.length >= 7 ? 2 : 1;
    const shuffled = [...g.players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const impostors = new Set(shuffled.slice(0, count).map(p => p.id));
    g.phase = 'playing'; g.bodies = []; g.kills = []; g.chat = []; g.meeting = null; g.sabotage = null;
    g.winner = null; g.winnerReason = ''; g.lightsFixed = true; g.reactorDeadline = 0;
    g.players.forEach((p, i) => {
      p.role = impostors.has(p.id) ? 'impostor' : 'crew'; p.alive = true;
      p.x = 1340 + i % 5 * 30; p.y = 850 + Math.floor(i / 5) * 100;
      p.tasks = p.role === 'crew' ? STATIONS.map(s => s.id) : [];
      p.completedTasks = []; p.taskStarted = {}; p.killReadyAt = now + 20_000;
      p.sabotageReadyAt = now + 15_000; p.emergencyUsed = 0; p.lastMoveAt = now;
    });
  }

  private openMeeting(p: Player, reason: string, now: number): void {
    const g = this.game!;
    g.phase = 'meeting'; g.sabotage = null; g.reactorDeadline = 0; g.doorsUntil = 0;
    g.bodies = [];
    g.meeting = { stage: 'discussion', endsAt: now + 45_000, reporter: p.id, reason, ejected: null, skipped: false, endVotes: [] };
    g.chat = [{ id: crypto.randomUUID(), name: 'Hệ thống', text: `${p.name}: ${reason}`, at: now, ghost: false }];
    g.players.forEach(x => { x.votes = undefined; x.x = 1340 + g.players.indexOf(x) % 5 * 30; x.y = 850 + Math.floor(g.players.indexOf(x) / 5) * 100; });
  }

  private advanceMeeting(now: number): void {
    const g = this.game!;
    const meeting = g.meeting;
    if (!meeting) return;
    if (meeting.stage === 'discussion') { meeting.stage = 'voting'; meeting.endsAt = now + 30_000; return; }
    if (meeting.stage === 'voting') {
      const votes = new Map<string, number>();
      for (const p of g.players.filter(x => x.alive && x.votes !== undefined)) {
        const key = p.votes === null ? 'skip' : p.votes!;
        votes.set(key, (votes.get(key) || 0) + 1);
      }
      const sorted = [...votes].sort((a, b) => b[1] - a[1]);
      const winner = sorted[0];
      meeting.skipped = !winner || winner[0] === 'skip' || sorted[1]?.[1] === winner[1];
      meeting.ejected = meeting.skipped ? null : winner[0];
      if (meeting.ejected) {
        const ejected = g.players.find(p => p.id === meeting.ejected);
        if (ejected) ejected.alive = false;
      }
      meeting.stage = 'result'; meeting.endsAt = now + 6_000;
      this.checkWin();
      return;
    }
    g.meeting = null;
    if (g.phase !== 'ended') {
      g.phase = 'playing';
      for (const p of g.players.filter(x => x.role === 'impostor')) p.killReadyAt = now + 15_000;
    }
  }

  private checkWin(): void {
    const g = this.game!;
    if (!['playing', 'meeting'].includes(g.phase) || g.winner) return;
    const crew = g.players.filter(p => p.role === 'crew');
    const aliveCrew = crew.filter(p => p.alive).length;
    const aliveImpostors = g.players.filter(p => p.role === 'impostor' && p.alive).length;
    if (aliveImpostors === 0) this.end('crew', 'Đã loại hết kẻ phá hoại');
    else if (crew.length && crew.every(p => p.tasks.every(t => p.completedTasks.includes(t)))) this.end('crew', 'Hoàn thành mọi nhiệm vụ');
    else if (aliveImpostors >= aliveCrew) this.end('impostor', 'Kẻ phá hoại chiếm ưu thế');
  }

  private end(winner: Role, reason: string): void {
    const g = this.game!;
    g.phase = 'ended'; g.winner = winner; g.winnerReason = reason;
    g.meeting = null; g.sabotage = null; g.reactorDeadline = 0;
  }

  private doorBlocks(x: number, y: number, now: number): boolean {
    const g = this.game!;
    if (g.sabotage !== 'doors' || now >= g.doorsUntil) return false;
    return DOORS.some(door => hitsRect(x, y, door));
  }

  private reactorWindowEndsAt(): number {
    return Math.min(...Object.values(this.game?.reactorFixers || {}).map(fix => fix.at + REACTOR_WINDOW));
  }

  private snapshot(p: Player): Snapshot {
    const g = this.game!;
    const now = Date.now();
    const vision = !p.alive ? 2000 : p.role === 'impostor' ? 390 : g.sabotage === 'lights' ? 140 : 320;
    const visible = (x: { x: number; y: number }) => g.phase !== 'playing' || distance(p, x) <= vision;
    const crew = g.players.filter(x => x.role === 'crew');
    const totalTasks = crew.reduce((n, x) => n + x.tasks.length, 0);
    const doneTasks = crew.reduce((n, x) => n + x.completedTasks.length, 0);
    return {
      type: 'snapshot', code: g.code, phase: g.phase, me: p.id, host: g.host,
      players: g.players.filter(x => x.id === p.id || (visible(x) && (g.phase !== 'playing' || x.alive || !p.alive))).map(x => ({ id: x.id, name: x.name, color: x.color, x: x.x, y: x.y, alive: x.alive, connected: x.connected })),
      role: p.role, allies: p.role === 'impostor' || g.phase === 'ended' ? g.players.filter(x => x.role === 'impostor').map(x => x.id) : [],
      tasks: p.tasks, completedTasks: p.completedTasks, taskProgress: totalTasks ? doneTasks / totalTasks : 0,
      bodies: g.bodies.filter(visible), kills: (g.kills || []).filter(effect => now - effect.at < 1800 && visible(effect)).map(effect => ({ ...effect, actor: p.role === 'impostor' || g.phase === 'ended' ? effect.actor : '' })), sabotage: g.sabotage, reactorDeadline: g.reactorDeadline,
      reactorFixed: g.reactorFixed, reactorWindowEndsAt: g.reactorFixed.length ? this.reactorWindowEndsAt() : 0,
      lightsFixed: g.lightsFixed, doorsUntil: g.doorsUntil,
      sabotageReadyAt: p.sabotageReadyAt, killReadyAt: p.killReadyAt, emergencyUsed: p.emergencyUsed,
      meeting: g.meeting ? { ...g.meeting, votesCast: g.players.filter(x => x.votes !== undefined).map(x => x.id) } : null,
      chat: g.chat.filter(x => !x.ghost || !p.alive), winner: g.winner, winnerReason: g.winnerReason,
      serverTime: now
    };
  }

  private broadcast(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastBroadcast < 100) return;
    this.lastBroadcast = now;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      const id = (ws.deserializeAttachment() as { id?: string } | null)?.id;
      const player = this.game?.players.find(p => p.id === id);
      if (player) this.send(ws, this.snapshot(player));
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try { ws.send(JSON.stringify(message)); } catch { /* connection closed */ }
  }

  private async persist(): Promise<void> {
    if (!this.game) return;
    this.lastPersist = Date.now();
    await this.ctx.storage.put('game', this.game);
  }

  private async schedule(): Promise<void> {
    const g = this.game;
    if (!g) return;
    const deadlines = [
      g.phase === 'meeting' ? g.meeting?.endsAt : 0,
      g.phase === 'playing' && g.sabotage === 'reactor' ? g.reactorDeadline : 0,
      g.phase === 'playing' && g.sabotage === 'reactor' && g.reactorFixed.length ? this.reactorWindowEndsAt() : 0,
      g.sabotage === 'doors' ? g.doorsUntil : 0,
      ...g.players.filter(p => !p.connected && p.disconnectedAt).map(p => p.disconnectedAt + 60_000),
      g.createdAt + 60 * 60_000
    ].filter((x): x is number => !!x && x > Date.now());
    if (deadlines.length) await this.ctx.storage.setAlarm(Math.min(...deadlines));
  }
}
