export const MAP = { width: 2100, height: 1350 } as const;
export const VIEW = { width: 1080, height: 660 } as const;
export const SPEED = 205;
export const INTERACT_RANGE = 90;
export const KILL_RANGE = 76;
export const COLORS = ['#ff687a', '#58b8ff', '#f6c65b', '#b28cff', '#60d5a0', '#f28ad1', '#f7f7f2', '#e38955', '#7fd0d7', '#a3b457'];

type Rect = { x: number; y: number; w: number; h: number };
type Room = Rect & { name: string; kind: 'station' | 'meeting'; door: 'top' | 'bottom' | 'left' | 'right' | 'cross' };
export const ROOMS: Room[] = [
  { x: 40, y: 40, w: 420, h: 300, name: 'PHÒNG ĐIỆN', kind: 'station', door: 'right' },
  { x: 530, y: 40, w: 260, h: 250, name: 'BẢO AN', kind: 'station', door: 'bottom' },
  { x: 830, y: 40, w: 440, h: 300, name: 'Y TẾ', kind: 'station', door: 'bottom' },
  { x: 1310, y: 40, w: 260, h: 250, name: 'LIÊN LẠC', kind: 'station', door: 'bottom' },
  { x: 1640, y: 40, w: 420, h: 300, name: 'DỮ LIỆU', kind: 'station', door: 'left' },
  { x: 40, y: 505, w: 420, h: 310, name: 'LÒ PHẢN ỨNG', kind: 'station', door: 'right' },
  { x: 750, y: 475, w: 600, h: 400, name: 'PHÒNG HỌP', kind: 'meeting', door: 'cross' },
  { x: 1640, y: 505, w: 420, h: 310, name: 'QUAN SÁT', kind: 'station', door: 'left' },
  { x: 40, y: 1010, w: 420, h: 300, name: 'KHO NHIÊN LIỆU', kind: 'station', door: 'right' },
  { x: 830, y: 1010, w: 440, h: 300, name: 'ĐỘNG CƠ', kind: 'station', door: 'top' },
  { x: 1640, y: 1010, w: 420, h: 300, name: 'ĐIỀU KHIỂN', kind: 'station', door: 'left' }
];
// Each room has a 116px doorway. The meeting room has four entrances.
export const WALLS: Rect[] = ROOMS.flatMap(room => {
  const gap = 58, thick = 18;
  const horizontal = (y: number, open: boolean): Rect[] => open
    ? [{ x: room.x, y, w: room.w / 2 - gap, h: thick }, { x: room.x + room.w / 2 + gap, y, w: room.w / 2 - gap, h: thick }]
    : [{ x: room.x, y, w: room.w, h: thick }];
  const vertical = (x: number, open: boolean): Rect[] => open
    ? [{ x, y: room.y, w: thick, h: room.h / 2 - gap }, { x, y: room.y + room.h / 2 + gap, w: thick, h: room.h / 2 - gap }]
    : [{ x, y: room.y, w: thick, h: room.h }];
  return [
    ...horizontal(room.y, room.door === 'top' || room.door === 'cross'),
    ...horizontal(room.y + room.h - thick, room.door === 'bottom' || room.door === 'cross'),
    ...vertical(room.x, room.door === 'left' || room.door === 'cross'),
    ...vertical(room.x + room.w - thick, room.door === 'right' || room.door === 'cross')
  ];
});
export const DOORS: Rect[] = [
  { x: 750, y: 617, w: 18, h: 116 }, { x: 1332, y: 617, w: 18, h: 116 },
  { x: 992, y: 475, w: 116, h: 18 }, { x: 992, y: 857, w: 116, h: 18 }
];
export const STATIONS = [
  { id: 'wires', name: 'Nối mạch điện', room: 'PHÒNG ĐIỆN', x: 250, y: 190, icon: '⚡' },
  { id: 'fuel', name: 'Nạp nhiên liệu', room: 'KHO NHIÊN LIỆU', x: 250, y: 1160, icon: '◈' },
  { id: 'scan', name: 'Quét sinh học', room: 'Y TẾ', x: 1050, y: 170, icon: '✚' },
  { id: 'upload', name: 'Tải dữ liệu', room: 'DỮ LIỆU', x: 1850, y: 190, icon: '▣' },
  { id: 'calibrate', name: 'Hiệu chỉnh lái', room: 'ĐIỀU KHIỂN', x: 1850, y: 1160, icon: '◎' }
] as const;
export const VENTS = [
  { x: 360, y: 260, to: 1 }, { x: 1050, y: 1170, to: 0 },
  { x: 1740, y: 260, to: 3 }, { x: 1050, y: 675, to: 2 }
] as const;
export const REACTOR_FIXES = [{ x: 250, y: 660 }, { x: 1850, y: 660 }] as const;
export const EMERGENCY = { x: 1050, y: 675 } as const;

export type Phase = 'lobby' | 'playing' | 'meeting' | 'ended';
export type Role = 'crew' | 'impostor';
export type Sabotage = 'lights' | 'reactor' | 'doors' | null;
export type MeetingStage = 'discussion' | 'voting' | 'result';
export interface PublicPlayer { id: string; name: string; color: string; x: number; y: number; alive: boolean; connected: boolean; }
export interface Body { id: string; playerId: string; x: number; y: number; color: string; }
export interface KillEffect { id: string; x: number; y: number; actor: string; target: string; at: number; }
export interface ChatMessage { id: string; name: string; text: string; at: number; ghost: boolean; }
export interface Snapshot {
  type: 'snapshot'; code: string; phase: Phase; me: string; host: string; players: PublicPlayer[];
  role: Role | null; allies: string[]; tasks: string[]; completedTasks: string[]; taskProgress: number;
  bodies: Body[]; kills: KillEffect[]; sabotage: Sabotage; reactorDeadline: number; reactorFixed: number[]; lightsFixed: boolean;
  doorsUntil: number; sabotageReadyAt: number; killReadyAt: number; emergencyUsed: number;
  meeting: null | { stage: MeetingStage; endsAt: number; reporter: string; reason: string; votesCast: string[]; ejected: string | null; skipped: boolean };
  chat: ChatMessage[]; winner: Role | null; winnerReason: string; serverTime: number;
}
export type ClientMessage =
  | { type: 'move'; dx: number; dy: number } | { type: 'start' } | { type: 'taskStart'; id: string }
  | { type: 'taskComplete'; id: string } | { type: 'kill'; target: string } | { type: 'report'; body: string }
  | { type: 'emergency' } | { type: 'vote'; target: string | null } | { type: 'chat'; text: string }
  | { type: 'sabotage'; kind: Exclude<Sabotage, null> } | { type: 'fix'; point?: number }
  | { type: 'vent'; index: number } | { type: 'restart' };
export type ServerMessage = Snapshot | { type: 'welcome'; token: string; id: string } | { type: 'taskReady'; id: string } | { type: 'error'; message: string };
export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function hitsRect(x: number, y: number, rect: Rect, radius = 17): boolean {
  return x + radius > rect.x && x - radius < rect.x + rect.w && y + radius > rect.y && y - radius < rect.y + rect.h;
}
export function collides(x: number, y: number): boolean {
  return x < 24 || y < 24 || x > MAP.width - 24 || y > MAP.height - 24 || WALLS.some(w => hitsRect(x, y, w));
}
