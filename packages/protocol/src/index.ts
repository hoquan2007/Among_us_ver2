export const MAP = { width: 2800, height: 1800 } as const;
export const PROTOCOL_VERSION = 2;
export const VIEW = { width: 1080, height: 660 } as const;
export const SPEED = 205;
export const INTERACT_RANGE = 90;
export const KILL_RANGE = 76;
export const PRESETS = {
  quick: { name: 'NHANH', tasks: 5, discussion: 25, voting: 20, killCooldown: 25, sabotageCooldown: 28 },
  standard: { name: 'CHUẨN', tasks: 8, discussion: 45, voting: 30, killCooldown: 30, sabotageCooldown: 35 },
  tense: { name: 'CĂNG THẲNG', tasks: 8, discussion: 60, voting: 40, killCooldown: 35, sabotageCooldown: 40 }
} as const;
export type Preset = keyof typeof PRESETS;
export const COLORS = ['#ff687a', '#58b8ff', '#f6c65b', '#b28cff', '#60d5a0', '#f28ad1', '#f7f7f2', '#e38955', '#7fd0d7', '#a3b457'];

type Rect = { x: number; y: number; w: number; h: number };
type Room = Rect & { name: string; kind: 'station' | 'meeting'; door: 'top' | 'bottom' | 'left' | 'right' | 'cross' };
export const ROOMS: Room[] = [
  { x: 40, y: 40, w: 430, h: 340, name: 'PHÒNG ĐIỆN', kind: 'station', door: 'right' },
  { x: 720, y: 40, w: 420, h: 300, name: 'BẢO AN', kind: 'station', door: 'bottom' },
  { x: 1180, y: 40, w: 440, h: 340, name: 'Y TẾ', kind: 'station', door: 'bottom' },
  { x: 1660, y: 40, w: 420, h: 300, name: 'LIÊN LẠC', kind: 'station', door: 'bottom' },
  { x: 2330, y: 40, w: 430, h: 340, name: 'DỮ LIỆU', kind: 'station', door: 'left' },
  { x: 40, y: 520, w: 430, h: 340, name: 'LÒ PHẢN ỨNG', kind: 'station', door: 'right' },
  { x: 720, y: 550, w: 300, h: 280, name: 'NHÀ KÍNH', kind: 'station', door: 'right' },
  { x: 1100, y: 685, w: 600, h: 430, name: 'PHÒNG HỌP', kind: 'meeting', door: 'cross' },
  { x: 2330, y: 520, w: 430, h: 340, name: 'QUAN SÁT', kind: 'station', door: 'left' },
  { x: 40, y: 1000, w: 430, h: 340, name: 'KHO NHIÊN LIỆU', kind: 'station', door: 'right' },
  { x: 2330, y: 1000, w: 430, h: 340, name: 'ĐIỀU KHIỂN', kind: 'station', door: 'left' },
  { x: 40, y: 1440, w: 430, h: 320, name: 'KHO HÀNG', kind: 'station', door: 'right' },
  { x: 720, y: 1440, w: 420, h: 320, name: 'KHÔNG KHÍ', kind: 'station', door: 'top' },
  { x: 1180, y: 1440, w: 440, h: 320, name: 'ĐỘNG CƠ', kind: 'station', door: 'top' },
  { x: 1660, y: 1440, w: 420, h: 320, name: 'KHOANG HÀNG', kind: 'station', door: 'top' },
  { x: 2330, y: 1440, w: 430, h: 320, name: 'NHÀ CHỨA', kind: 'station', door: 'left' }
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
export const DOORS: Rect[] = ROOMS.flatMap(room => {
  const horizontal = (y: number): Rect => ({ x: room.x + room.w / 2 - 58, y, w: 116, h: 18 });
  const vertical = (x: number): Rect => ({ x, y: room.y + room.h / 2 - 58, w: 18, h: 116 });
  return room.door === 'cross'
    ? [horizontal(room.y), horizontal(room.y + room.h - 18), vertical(room.x), vertical(room.x + room.w - 18)]
    : [room.door === 'top' ? horizontal(room.y) : room.door === 'bottom' ? horizontal(room.y + room.h - 18) : vertical(room.door === 'left' ? room.x : room.x + room.w - 18)];
});
export const STATIONS = [
  { id: 'wires', name: 'Nối mạch điện', room: 'PHÒNG ĐIỆN', x: 255, y: 210, icon: '⚡' },
  { id: 'fuel', name: 'Nạp nhiên liệu', room: 'KHO NHIÊN LIỆU', x: 255, y: 1160, icon: '◈' },
  { id: 'scan', name: 'Quét sinh học', room: 'Y TẾ', x: 1400, y: 210, icon: '✚' },
  { id: 'upload', name: 'Tải dữ liệu', room: 'DỮ LIỆU', x: 2545, y: 210, icon: '▣' },
  { id: 'calibrate', name: 'Hiệu chỉnh lái', room: 'ĐIỀU KHIỂN', x: 2545, y: 1160, icon: '◎' },
  { id: 'valves', name: 'Cân bằng oxy', room: 'KHÔNG KHÍ', x: 930, y: 1600, icon: '◌' },
  { id: 'cargo', name: 'Phân loại hàng', room: 'KHO HÀNG', x: 255, y: 1590, icon: '▥' },
  { id: 'frequency', name: 'Dò tần số', room: 'LIÊN LẠC', x: 1870, y: 190, icon: '⌁' }
] as const;
export const VENTS = [
  { x: 365, y: 290, to: 1 }, { x: 1400, y: 1590, to: 0 },
  { x: 2435, y: 290, to: 3 }, { x: 1400, y: 900, to: 2 }
] as const;
export const REACTOR_FIXES = [{ x: 255, y: 690 }, { x: 2545, y: 690 }] as const;
export const EMERGENCY = { x: 1400, y: 900 } as const;

export type Phase = 'lobby' | 'playing' | 'meeting' | 'ended';
export type Role = 'crew' | 'impostor';
export type Sabotage = 'lights' | 'reactor' | 'doors' | null;
export type MeetingStage = 'discussion' | 'voting' | 'result';
export interface PublicPlayer { id: string; name: string; color: string; x: number; y: number; alive: boolean; connected: boolean; }
export interface Body { id: string; playerId: string; x: number; y: number; color: string; }
export interface KillEffect { id: string; x: number; y: number; actor: string; target: string; at: number; }
export interface ChatMessage { id: string; name: string; text: string; at: number; ghost: boolean; }
export interface Snapshot {
  type: 'snapshot'; protocolVersion: number; code: string; phase: Phase; preset: Preset; me: string; host: string; players: PublicPlayer[];
  role: Role | null; allies: string[]; tasks: string[]; completedTasks: string[]; taskProgress: number;
  bodies: Body[]; kills: KillEffect[]; sabotage: Sabotage; reactorDeadline: number; reactorFixed: number[]; reactorWindowEndsAt: number; lightsFixed: boolean;
  doorsUntil: number; sabotageReadyAt: number; killReadyAt: number; emergencyUsed: number;
  meeting: null | { stage: MeetingStage; endsAt: number; reporter: string; reason: string; votesCast: string[]; endVotes: string[]; ejected: string | null; skipped: boolean };
  chat: ChatMessage[]; winner: Role | null; winnerReason: string; serverTime: number;
}
export type ClientMessage =
  | { type: 'move'; dx: number; dy: number } | { type: 'start' } | { type: 'preset'; value: Preset } | { type: 'taskStart'; id: string }
  | { type: 'taskStep'; id: string; step: number }
  | { type: 'taskComplete'; id: string } | { type: 'kill'; target: string } | { type: 'report'; body: string }
  | { type: 'emergency' } | { type: 'vote'; target: string | null } | { type: 'endMeeting' } | { type: 'chat'; text: string }
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
