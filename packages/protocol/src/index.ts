export const MAP = { width: 1100, height: 720 } as const;
export const SPEED = 170;
export const INTERACT_RANGE = 82;
export const KILL_RANGE = 72;
export const COLORS = ['#ff687a', '#58b8ff', '#f6c65b', '#b28cff', '#60d5a0', '#f28ad1', '#f7f7f2', '#e38955', '#7fd0d7', '#a3b457'];

export const WALLS = [
  { x: 230, y: 0, w: 22, h: 255 }, { x: 230, y: 465, w: 22, h: 255 },
  { x: 848, y: 0, w: 22, h: 255 }, { x: 848, y: 465, w: 22, h: 255 },
  { x: 230, y: 240, w: 180, h: 20 }, { x: 690, y: 240, w: 180, h: 20 },
  { x: 230, y: 460, w: 180, h: 20 }, { x: 690, y: 460, w: 180, h: 20 },
  { x: 400, y: 0, w: 20, h: 125 }, { x: 680, y: 0, w: 20, h: 125 },
  { x: 400, y: 595, w: 20, h: 125 }, { x: 680, y: 595, w: 20, h: 125 }
] as const;

export const STATIONS = [
  { id: 'wires', name: 'Nối dây', x: 125, y: 135, icon: '⚡' },
  { id: 'fuel', name: 'Nạp nhiên liệu', x: 125, y: 580, icon: '⛽' },
  { id: 'scan', name: 'Quét mẫu', x: 550, y: 90, icon: '◈' },
  { id: 'upload', name: 'Tải dữ liệu', x: 970, y: 135, icon: '▣' },
  { id: 'calibrate', name: 'Hiệu chỉnh', x: 970, y: 580, icon: '◎' }
] as const;

export const VENTS = [
  { x: 145, y: 325, to: 1 }, { x: 550, y: 355, to: 0 },
  { x: 950, y: 325, to: 3 }, { x: 550, y: 570, to: 2 }
] as const;

export const REACTOR_FIXES = [{ x: 120, y: 355 }, { x: 980, y: 355 }] as const;
export const EMERGENCY = { x: 550, y: 355 } as const;

export type Phase = 'lobby' | 'playing' | 'meeting' | 'ended';
export type Role = 'crew' | 'impostor';
export type Sabotage = 'lights' | 'reactor' | 'doors' | null;
export type MeetingStage = 'discussion' | 'voting' | 'result';

export interface PublicPlayer { id: string; name: string; color: string; x: number; y: number; alive: boolean; connected: boolean; }
export interface Body { id: string; playerId: string; x: number; y: number; color: string; }
export interface ChatMessage { id: string; name: string; text: string; at: number; ghost: boolean; }
export interface Snapshot {
  type: 'snapshot'; code: string; phase: Phase; me: string; host: string; players: PublicPlayer[];
  role: Role | null; allies: string[]; tasks: string[]; completedTasks: string[]; taskProgress: number;
  bodies: Body[]; sabotage: Sabotage; reactorDeadline: number; reactorFixed: number[]; lightsFixed: boolean;
  doorsUntil: number; sabotageReadyAt: number; killReadyAt: number; emergencyUsed: number;
  meeting: null | { stage: MeetingStage; endsAt: number; reporter: string; reason: string; votesCast: string[]; ejected: string | null; skipped: boolean };
  chat: ChatMessage[]; winner: Role | null; winnerReason: string; serverTime: number;
}

export type ClientMessage =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'start' }
  | { type: 'taskStart'; id: string }
  | { type: 'taskComplete'; id: string }
  | { type: 'kill'; target: string }
  | { type: 'report'; body: string }
  | { type: 'emergency' }
  | { type: 'vote'; target: string | null }
  | { type: 'chat'; text: string }
  | { type: 'sabotage'; kind: Exclude<Sabotage, null> }
  | { type: 'fix'; point?: number }
  | { type: 'vent'; index: number }
  | { type: 'restart' };

export type ServerMessage = Snapshot | { type: 'welcome'; token: string; id: string } | { type: 'error'; message: string };

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function collides(x: number, y: number): boolean {
  if (x < 24 || y < 24 || x > MAP.width - 24 || y > MAP.height - 24) return true;
  return WALLS.some(w => x + 17 > w.x && x - 17 < w.x + w.w && y + 17 > w.y && y - 17 < w.y + w.h);
}
