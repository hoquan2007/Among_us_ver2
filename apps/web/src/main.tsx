import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EMERGENCY, INTERACT_RANGE, KILL_RANGE, PRESETS, PROTOCOL_VERSION, REACTOR_FIXES, ROOMS, STATIONS, VENTS, distance, mapBounds,
  type ClientMessage, type ServerMessage, type Snapshot
} from '../../../packages/protocol/src/index';
import './style.css';
import './experience.css';
import './mobile.css';
import { GameScene } from './GameScene';
import { TouchControls, type Direction } from './TouchControls';
import { musicEnabled, setMusicActive, setMusicEnabled, unlockMusic } from './ambient';

const apiBase = (import.meta.env.VITE_REALTIME_URL || (import.meta.env.DEV ? 'http://localhost:8787' : '')).replace(/\/$/, '');
const wsBase = apiBase.replace(/^http/, 'ws');
const reactorRooms = ['LÒ PHẢN ỨNG', 'QUAN SÁT'] as const;

function send(ws: WebSocket | null, message: ClientMessage) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function TaskModal({ id, fake, ready, onClose, onStep, onComplete }: { id: string; fake: boolean; ready: boolean; onClose: () => void; onStep: (step: number) => void; onComplete: () => void }) {
  const station = STATIONS.find(s => s.id === id)!;
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [firstWire, setFirstWire] = useState<number | null>(null);
  const [connectedWires, setConnectedWires] = useState<number[]>([]);
  const [wireHint, setWireHint] = useState('Chọn một đầu dây ở cột trái.');
  const [frequency, setFrequency] = useState(35);
  const started = useRef(Date.now());
  const completion = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    completion.current = setTimeout(onComplete, Math.max(0, (id === 'scan' || id === 'upload' || id === 'archive' ? 3200 : 2000) - (Date.now() - started.current)));
  };
  useEffect(() => { if (ready) started.current = Date.now(); }, [ready]);
  useEffect(() => {
    if (!ready || (id !== 'scan' && id !== 'upload' && id !== 'archive')) return;
    const timer = setInterval(() => setProgress(value => Math.min(100, value + 4)), 120);
    return () => clearInterval(timer);
  }, [id, ready]);
  useEffect(() => { if (progress >= 100 && (id === 'scan' || id === 'upload' || id === 'archive')) finish(); }, [progress]);
  useEffect(() => () => { if (completion.current) clearTimeout(completion.current); }, []);
  const symbols = ['◆', '●', '▲'];
  const wireColors = ['#ef7989', '#75e2dc', '#e9c76c'];
  const wireNames = ['Đỏ', 'Xanh', 'Vàng'];
  const selectWire = (n: number) => { setFirstWire(n); setWireHint(`Đã chọn dây ${wireNames[n]}. Tìm màu tương ứng ở cột phải.`); };
  const connectWire = (n: number) => {
    if (firstWire === null || completed.current) return;
    if (firstWire !== n) { setWireHint('Sai màu, hãy chọn lại đầu dây bên trái.'); setFirstWire(null); return; }
    const next = [...connectedWires, n];
    if (!fake) onStep(n);
    setConnectedWires(next); setFirstWire(null);
    setWireHint(next.length === 3 ? 'Đã nối đủ ba mạch. Đang xác nhận…' : 'Đúng rồi! Tiếp tục nối dây còn lại.');
    if (next.length === 3) finish();
  };
  return <div className="overlay"><section className="modal task-modal"><button className="close" onClick={onClose} aria-label="Đóng nhiệm vụ">×</button><div className="eyebrow">{fake ? 'GIẢ LÀM NHIỆM VỤ' : station.room}</div><h2>{station.name}</h2>
    {!ready && !fake && <p className="task-instruction">Đang kết nối với trạm nhiệm vụ…</p>}
    {id === 'wires' && <><p>Chọn một dây bên trái, rồi ghép với màu giống nó ở bên phải.</p><div className="wire-grid">
      <div className="wire-column"><span className="wire-heading">ĐẦU NGUỒN</span>{[0, 1, 2].map(n => <button key={`left-${n}`} disabled={!ready || connectedWires.includes(n) || completed.current} className={connectedWires.includes(n) ? 'done' : firstWire === n ? 'selected' : ''} style={{ borderColor: wireColors[n] }} onClick={() => selectWire(n)}><i style={{ background: wireColors[n] }} />{wireNames[n]}</button>)}</div>
      <div className="wire-column"><span className="wire-heading">ĐẦU NHẬN</span>{[2, 0, 1].map(n => <button key={`right-${n}`} disabled={!ready || connectedWires.includes(n) || completed.current} className={connectedWires.includes(n) ? 'done' : ''} style={{ borderColor: wireColors[n] }} onClick={() => connectWire(n)}><i style={{ background: wireColors[n] }} />{wireNames[n]}</button>)}</div>
    </div><div className="task-instruction" role="status">{connectedWires.length}/3 mạch đã nối · {wireHint}</div></>}
    {id === 'fuel' && <><p>Nhấn để nạp đầy bình nhiên liệu.</p><div className="task-gauge"><i style={{ width: `${step * 12.5}%` }} /></div><button className="task-control" disabled={!ready || completed.current} onClick={() => { if (!fake) onStep(1); if (step >= 7) finish(); setStep(Math.min(8, step + 1)); }}>NẠP NHIÊN LIỆU</button><div>{Math.round(step * 12.5)}%</div></>}
    {(id === 'scan' || id === 'upload' || id === 'archive') && <><p>{id === 'scan' ? 'Đang quét mẫu sinh học…' : id === 'archive' ? 'Đang khôi phục kho lưu trữ…' : 'Đang tải dữ liệu về tàu…'}</p><div className="task-gauge"><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></>}
    {id === 'calibrate' && <><p>Nhấn các ký hiệu theo thứ tự.</p><div className="sequence">{symbols.map((symbol, i) => <span key={i} className={i < step ? 'done' : i === step ? 'current' : ''}>{symbol}</span>)}</div><div className="symbol-buttons">{[...symbols].reverse().map(symbol => <button key={symbol} disabled={!ready || completed.current} onClick={() => { if (symbol !== symbols[step]) return; if (!fake) onStep(step); if (step === 2) finish(); else setStep(step + 1); }}>{symbol}</button>)}</div></>}
    {id === 'valves' && <><p>Mở van theo thứ tự hiển thị để cân bằng áp suất oxy.</p><div className="sequence"><span>③</span><span>①</span><span>②</span></div><div className="task-puzzle-buttons">{[0, 1, 2].map(n => <button key={n} disabled={!ready || completed.current || [2, 0, 1].slice(0, step).includes(n)} onClick={() => { if ([2, 0, 1][step] !== n) return; if (!fake) onStep(n); if (step === 2) finish(); setStep(step + 1); }}>VAN {n + 1}</button>)}</div><div className="task-instruction">{step}/3 van đã mở</div></>}
    {id === 'cargo' && <><p>Chuyển kiện hàng theo thứ tự mã trên manifest: B → C → A → D.</p><div className="task-puzzle-buttons">{[0, 1, 2, 3].map(n => <button key={n} disabled={!ready || completed.current || [1, 2, 0, 3].slice(0, step).includes(n)} onClick={() => { if ([1, 2, 0, 3][step] !== n) return; if (!fake) onStep(n); if (step === 3) finish(); setStep(step + 1); }}>KIỆN {['A', 'B', 'C', 'D'][n]}</button>)}</div><div className="task-instruction">{step}/4 kiện đã xử lý</div></>}
    {id === 'frequency' && <><p>Điều chỉnh tần số về vùng tín hiệu 73 MHz (±2 MHz).</p><div className="frequency-readout">{frequency} <small>MHz</small></div><input className="frequency-slider" type="range" min="0" max="100" value={frequency} disabled={!ready || completed.current} onChange={event => setFrequency(Number(event.target.value))} /><button className="task-control" disabled={!ready || completed.current || Math.abs(frequency - 73) > 2} onClick={() => { if (!fake) onStep(73); finish(); }}>KHÓA TÍN HIỆU</button></>}
    {(id === 'shield' || id === 'robot') && (() => {
      const order = id === 'shield' ? [2, 0, 3, 1] : [1, 3, 0, 2];
      return <><p>{id === 'shield' ? 'Kích hoạt bốn nút lá chắn theo thứ tự trên màn hình.' : 'Nạp lệnh điều khiển robot theo thứ tự trên màn hình.'}</p><div className="sequence">{order.map((value, index) => <span key={index} className={index < step ? 'done' : index === step ? 'current' : ''}>{value + 1}</span>)}</div><div className="task-puzzle-buttons">{[0, 1, 2, 3].map(value => <button key={value} disabled={!ready || completed.current} onClick={() => { if (order[step] !== value) return; if (!fake) onStep(value); if (step === 3) finish(); setStep(step + 1); }}>NÚT {value + 1}</button>)}</div><div className="task-instruction">{step}/4 lệnh đã nhận</div></>;
    })()}
    {id === 'water' && <><p>Nhấn lọc sáu lần để làm sạch bồn nước.</p><div className="task-gauge"><i style={{ width: `${step / 6 * 100}%` }} /></div><button className="task-control" disabled={!ready || completed.current} onClick={() => { if (!fake) onStep(1); if (step === 5) finish(); setStep(Math.min(6, step + 1)); }}>LỌC NƯỚC</button><div>{step}/6 chu kỳ</div></>}
    <small>{completed.current ? 'Đang xác nhận…' : fake ? 'Giữ bí mật vai trò của bạn.' : 'Ở gần trạm cho đến khi hoàn thành.'}</small>
  </section></div>;
}

function TacticalMap({ game, onClose }: { game: Snapshot; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const bounds = mapBounds(game.mapVariant);
  const me = game.players.find(player => player.id === game.me);
  const rooms = ROOMS.filter(room => game.mapVariant === 'full' || !room.outer);
  const objectives = STATIONS.filter(station => game.tasks.includes(station.id) && !game.completedTasks.includes(station.id));
  const corridors = [
    { x: 470, y: 860, w: 630, h: 120 }, { x: 1700, y: 860, w: 630, h: 120 },
    { x: 1340, y: 380, w: 120, h: 305 }, { x: 1340, y: 1115, w: 120, h: 325 },
    { x: 530, y: 390, w: 125, h: 1040 }, { x: 2140, y: 390, w: 125, h: 1040 },
    ...(game.mapVariant === 'full' ? [{ x: 490, y: 1850, w: 2250, h: 110 }, { x: 2770, y: 150, w: 150, h: 1620 }, { x: 1300, y: 1760, w: 200, h: 260 }, { x: 2420, y: 1760, w: 180, h: 260 }] : [])
  ];
  return <div className="overlay tactical-overlay" onClick={onClose}><section className="modal tactical-modal" onClick={event => event.stopPropagation()} aria-label="Bản đồ chiến thuật"><button className="close" onClick={onClose} aria-label="Đóng bản đồ">×</button><div className="eyebrow">SƠ ĐỒ TÀU · {rooms.length} PHÒNG</div><h2>Bản đồ chiến thuật</h2><p>Chấm xanh: nhiệm vụ cần làm · Chấm đỏ: trạm sửa sự cố · Chấm trắng: bạn</p><div className="tactical-tools"><span>Phóng to rồi vuốt để xem từng khu.</span><button aria-label="Thu nhỏ bản đồ" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button><button aria-label="Phóng to bản đồ" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))}>+</button></div><div className="tactical-viewport"><svg className="tactical-svg" style={{ width: `${zoom * 100}%` }} viewBox={`0 0 ${bounds.width} ${bounds.height}`} role="img" aria-label="Sơ đồ phòng, nhiệm vụ và vị trí của bạn">
    <rect width={bounds.width} height={bounds.height} fill="#0b1a27" />
    {corridors.map((path, index) => <rect key={index} x={path.x} y={path.y} width={path.w} height={path.h} rx="22" fill="#315e69" stroke="#75c9c4" strokeOpacity=".45" strokeWidth="7" />)}
    {rooms.map(room => <g key={room.name}><title>{room.name}</title><rect x={room.x} y={room.y} width={room.w} height={room.h} rx="24" fill={room.kind === 'meeting' ? '#24585b' : room.outer ? '#244758' : '#1b3b4b'} stroke="#87bdc0" strokeWidth="9" /><text x={room.x + room.w / 2} y={room.y + room.h / 2} textAnchor="middle" fill="#dcf5ec" fontSize="42" fontWeight="700">{room.name}</text></g>)}
    {objectives.map(station => <g key={station.id}><circle cx={station.x} cy={station.y} r="47" fill="#50e8bc" fillOpacity=".23" stroke="#90ffe0" strokeWidth="11" /><circle cx={station.x} cy={station.y} r="15" fill="#a3ffdf" /></g>)}
    {game.sabotage === 'reactor' && REACTOR_FIXES.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="42" fill={game.reactorFixed.includes(index) ? '#45dfad' : '#ff6f77'} stroke="#fff" strokeWidth="8" />)}
    {game.sabotage === 'lights' && <circle cx={STATIONS[0].x} cy={STATIONS[0].y} r="42" fill="#ff6f77" stroke="#fff" strokeWidth="8" />}
    {me && <g><circle cx={me.x} cy={me.y} r="63" fill="#fff" fillOpacity=".18" /><circle cx={me.x} cy={me.y} r="26" fill="#fff" stroke="#092b35" strokeWidth="8" /></g>}
  </svg></div><div className="tactical-note">Nhấn <kbd>M</kbd>, <kbd>Esc</kbd> hoặc nút × để trở lại ván.</div></section></div>;
}

function App() {
  const [name, setName] = useState(localStorage.getItem('starship-name') || '');
  const [codeInput, setCodeInput] = useState(new URLSearchParams(location.search).get('room') || '');
  const [code, setCode] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [chatText, setChatText] = useState('');
  const [task, setTask] = useState<string | null>(null);
  const [taskReady, setTaskReady] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [musicOn, setMusicOn] = useState(musicEnabled);
  const [mapOpen, setMapOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'tasks' | 'sabotage' | null>(null);
  const [meetingTab, setMeetingTab] = useState<'players' | 'chat'>('players');
  const [, setClock] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const serverOffset = useRef(0);
  const desired = useRef<{ code: string; name: string } | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creating = useRef(false);
  const keys = useRef(new Set<string>());
  const touchDirection = useRef<Direction>({ dx: 0, dy: 0 });
  const snapshotRef = useRef<Snapshot | null>(null);
  const taskRef = useRef<string | null>(null);
  const taskSession = useRef('');
  const mapOpenRef = useRef(false);
  snapshotRef.current = snapshot;
  taskRef.current = task;
  mapOpenRef.current = mapOpen;

  useEffect(() => {
    const timer = setInterval(() => setClock(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    window.addEventListener('pointerdown', unlockMusic);
    return () => { window.removeEventListener('pointerdown', unlockMusic); setMusicActive(false); };
  }, []);
  useEffect(() => setMusicActive(snapshot?.phase === 'playing' || snapshot?.phase === 'meeting'), [snapshot?.phase, musicOn]);
  useEffect(() => { if (snapshot?.phase !== 'playing') { setMapOpen(false); setMobilePanel(null); touchDirection.current = { dx: 0, dy: 0 }; } }, [snapshot?.phase]);
  useEffect(() => { if (snapshot?.phase === 'meeting') setMeetingTab('players'); }, [snapshot?.phase]);

  const connect = (room: string, playerName: string) => {
    if (!apiBase) { setError('Thiếu VITE_REALTIME_URL trong cấu hình Vercel.'); return; }
    const normalized = room.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    if (normalized.length !== 6 || !playerName.trim()) { setError('Nhập tên và mã phòng 6 ký tự.'); return; }
    if (retry.current) clearTimeout(retry.current);
    desired.current = { code: normalized, name: playerName.trim().slice(0, 16) };
    localStorage.setItem('starship-name', playerName.trim());
    setCode(normalized); setCodeInput(normalized); setError(''); setStatus('Đang kết nối…');
    history.replaceState(null, '', `?room=${normalized}`);
    const saved = sessionStorage.getItem(`starship-token-${normalized}`) || '';
    if (socket.current && socket.current.readyState < WebSocket.CLOSING) socket.current.close();
    const ws = new WebSocket(`${wsBase}/ws/${normalized}?name=${encodeURIComponent(playerName.trim())}&token=${encodeURIComponent(saved)}`);
    socket.current = ws;
    ws.onopen = () => { if (socket.current === ws) setStatus('Đã kết nối'); };
    ws.onmessage = event => {
      if (socket.current !== ws) return;
      let message: ServerMessage;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'welcome') sessionStorage.setItem(`starship-token-${normalized}`, message.token);
      else if (message.type === 'snapshot') {
        if (message.protocolVersion !== PROTOCOL_VERSION) { setError('Phiên bản game đã thay đổi. Hãy tải lại trang để tiếp tục.'); return; }
        serverOffset.current = message.serverTime - Date.now();
        setSnapshot(message); setError('');
      }
      else if (message.type === 'taskReady' && taskRef.current === message.id && taskSession.current === (message.session || '')) setTaskReady(message.id);
      else if (message.type === 'error') { setError(message.message); if (taskRef.current) { setTask(null); taskSession.current = ''; } }
    };
    ws.onerror = () => { if (socket.current === ws) setStatus('Mất kết nối'); };
    ws.onclose = event => {
      if (socket.current !== ws || !desired.current) return;
      setStatus('Mất kết nối, đang thử lại…');
      if (event.code === 4001) return;
      retry.current = setTimeout(() => connect(normalized, playerName), 2000);
    };
  };

  useEffect(() => {
    const initialCode = new URLSearchParams(location.search).get('room');
    const initialName = localStorage.getItem('starship-name');
    if (initialCode && initialName) connect(initialCode, initialName);
    return () => { desired.current = null; if (retry.current) clearTimeout(retry.current); socket.current?.close(); };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      keys.current.add(event.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) event.preventDefault();
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    const timer = setInterval(() => {
      const g = snapshotRef.current;
      if (g?.phase !== 'playing' || taskRef.current || mapOpenRef.current) return;
      const k = keys.current;
      const dx = Number(k.has('d') || k.has('arrowright')) - Number(k.has('a') || k.has('arrowleft')) || touchDirection.current.dx;
      const dy = Number(k.has('s') || k.has('arrowdown')) - Number(k.has('w') || k.has('arrowup')) || touchDirection.current.dy;
      if (dx || dy) send(socket.current, { type: 'move', dx, dy });
    }, 125);
    const stop = () => { keys.current.clear(); touchDirection.current = { dx: 0, dy: 0 }; };
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => { clearInterval(timer); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); };
  }, []);

  useEffect(() => { if (task || mapOpen || mobilePanel) { keys.current.clear(); touchDirection.current = { dx: 0, dy: 0 }; } }, [task, mapOpen, mobilePanel]);
  useEffect(() => {
    if (task && snapshot?.completedTasks.includes(task)) { setTask(null); taskSession.current = ''; }
  }, [snapshot?.completedTasks, task]);
  useEffect(() => {
    if (!task || snapshot?.role !== 'crew' || taskReady === task) return;
    const retryTask = setInterval(() => send(socket.current, { type: 'taskStart', id: task, session: taskSession.current }), 700);
    return () => clearInterval(retryTask);
  }, [task, taskReady, snapshot?.role]);

  const createRoom = async () => {
    if (creating.current) return;
    if (!apiBase) { setError('Thiếu VITE_REALTIME_URL trong cấu hình Vercel.'); return; }
    if (!name.trim()) { setError('Hãy nhập tên trước.'); return; }
    creating.current = true; setCreatingRoom(true);
    setError(''); setStatus('Đang tạo phòng…');
    try {
      const response = await fetch(`${apiBase}/rooms`, { method: 'POST' });
      const data = await response.json() as { code?: string; error?: string };
      if (!response.ok || !data.code) throw new Error(data.error || 'Không tạo được phòng.');
      connect(data.code, name);
    } catch (e) {
      setError(e instanceof TypeError ? 'Không kết nối được Worker. Kiểm tra VITE_REALTIME_URL và WEB_ORIGIN.' : e instanceof Error ? e.message : 'Không kết nối được máy chủ.');
      setStatus('');
    } finally {
      creating.current = false; setCreatingRoom(false);
    }
  };

  const me = snapshot?.players.find(p => p.id === snapshot.me);
  const nearStation = snapshot && me ? STATIONS.find(s => distance(s, me) <= INTERACT_RANGE && (snapshot.tasks.includes(s.id) || snapshot.role === 'impostor' || (snapshot.sabotage === 'lights' && s.id === 'wires'))) : null;
  const nearBody = snapshot && me ? snapshot.bodies.find(b => distance(b, me) <= INTERACT_RANGE) : null;
  const nearTarget = snapshot && me && snapshot.role === 'impostor' ? snapshot.players.find(p => p.id !== me.id && p.alive && !snapshot.allies.includes(p.id) && distance(p, me) <= KILL_RANGE) : null;
  const nearVent = snapshot && me ? VENTS.findIndex(v => distance(v, me) <= INTERACT_RANGE) : -1;
  const nearReactor = snapshot && me ? REACTOR_FIXES.findIndex(v => distance(v, me) <= INTERACT_RANGE) : -1;
  const nearEmergency = snapshot && me && distance(me, EMERGENCY) <= INTERACT_RANGE;
  const currentRoom = me && ROOMS.find(room => me.x >= room.x && me.x <= room.x + room.w && me.y >= room.y && me.y <= room.y + room.h)?.name || 'HÀNH LANG';
  const seconds = (target: number) => Math.max(0, Math.ceil((target - Date.now() - serverOffset.current) / 1000));
  const invite = `${location.origin}/?room=${code}`;
  const openTask = (id: string) => {
    if (!snapshot || snapshot.completedTasks.includes(id)) return;
    keys.current.clear();
    taskSession.current = crypto.randomUUID();
    taskRef.current = id;
    setTaskReady(null);
    setTask(id);
    if (snapshot.role === 'crew') send(socket.current, { type: 'taskStart', id, session: taskSession.current });
  };
  const closeTask = () => {
    if (taskRef.current && snapshot?.role === 'crew') send(socket.current, { type: 'taskCancel', id: taskRef.current, session: taskSession.current });
    taskSession.current = '';
    setTask(null);
    setTaskReady(null);
  };
  const interact = () => {
    if (!snapshot || snapshot.phase !== 'playing') return;
    if (nearBody && me?.alive) send(socket.current, { type: 'report', body: nearBody.id });
    else if (snapshot.sabotage === 'reactor' && nearReactor >= 0 && me?.alive && snapshot.role === 'crew' && !snapshot.reactorFixed.includes(nearReactor)) send(socket.current, { type: 'fix', point: nearReactor });
    else if (snapshot.sabotage === 'lights' && nearStation?.id === 'wires') send(socket.current, { type: 'fix' });
    else if (nearStation) openTask(nearStation.id);
    else if (nearEmergency && me?.alive && !snapshot.emergencyUsed) send(socket.current, { type: 'emergency' });
  };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === 'Escape' && task) { closeTask(); return; }
      if (event.key === 'Escape' && mapOpen) { setMapOpen(false); return; }
      if (event.key === 'Escape' && mobilePanel) { setMobilePanel(null); return; }
      if (task || snapshot?.phase !== 'playing' || event.repeat) return;
      if (event.key.toLowerCase() === 'm') { setMapOpen(value => !value); return; }
      if (mapOpen || mobilePanel) return;
      if (event.key.toLowerCase() === 'e') interact();
      if (event.key.toLowerCase() === 'q' && nearTarget) send(socket.current, { type: 'kill', target: nearTarget.id });
      if (event.key.toLowerCase() === 'v' && nearVent >= 0) send(socket.current, { type: 'vent', index: nearVent });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [snapshot, task, mapOpen, mobilePanel]);

  if (!snapshot) return <main className="landing">
    <div className="stars" />
    <section className="landing-card">
      <div className="landing-symbol">✦</div><div className="eyebrow">NHIỆM VỤ Ở NGOÀI KHÔNG GIAN · ONLINE</div>
      <h1>STARSHIP<br /><span>SUSPECTS</span></h1>
      <p>Lập đội, hoàn thành nhiệm vụ và tìm ra kẻ giả mạo trước khi con tàu bị chiếm.</p>
      <label>TÊN CỦA BẠN<input value={name} maxLength={16} placeholder="Nhập tên phi hành gia" onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createRoom()} /></label>
      <button className="primary large" disabled={creatingRoom} onClick={createRoom}>{creatingRoom ? 'Đang tạo phòng…' : 'Tạo phòng mới'} <span>→</span></button>
      <div className="divider">HOẶC THAM GIA</div>
      <div className="join"><input value={codeInput} maxLength={6} placeholder="MÃ PHÒNG" onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && connect(codeInput, name)} /><button onClick={() => connect(codeInput, name)}>Vào phòng</button></div>
      {status && <div className="status">{status}</div>}{error && <div className="error">{error}</div>}
      <p className="small">CHƠI TRÊN ĐIỆN THOẠI VÀ MÁY TÍNH · 4–10 NGƯỜI · MỜI BẰNG LINK</p>
    </section>
  </main>;

  const share = async () => { if (navigator.share && window.matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: 'Starship Suspects', url: invite }); return; } catch (error) { if ((error as Error).name === 'AbortError') return; } } await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const leave = () => { desired.current = null; const current = socket.current; socket.current = null; current?.close(); setSnapshot(null); setCode(''); setStatus(''); history.replaceState(null, '', '/'); };
  const meeting = snapshot.meeting;
  return <div className="app-shell">
    <header className="topbar"><div className="brand">✦ STARSHIP <strong>SUSPECTS</strong></div><div className="room-code">PHÒNG <strong>{code}</strong></div><div className="connection"><span className="online-dot" /> {status}</div><button className="ghost-button music-toggle" aria-pressed={musicOn} onClick={() => { setMusicEnabled(!musicOn); setMusicOn(!musicOn); }}>♫ Nhạc {musicOn ? 'bật' : 'tắt'}</button><button className="ghost-button" onClick={leave}>Rời phòng</button></header>
    {snapshot.phase === 'lobby' ? <main className="lobby">
      <div className="lobby-main"><div className="eyebrow">SẢNH CHỜ · {snapshot.players.length}/10 NGƯỜI</div><h2>Chuẩn bị lên tàu</h2><p>Gửi link hoặc mã phòng để mời bạn bè. Cần ít nhất 4 người để bắt đầu. 4–6 người chơi ở lõi 16 phòng; từ 7 người mở toàn tàu 22 phòng.</p>
        <div className="invite"><span>{invite}</span><button onClick={share}>{copied ? 'Đã sao chép' : 'Sao chép link'}</button></div>
        <div className="code-display">{code.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
        <div className="preset-grid">{(Object.entries(PRESETS) as [keyof typeof PRESETS, (typeof PRESETS)[keyof typeof PRESETS]][]).map(([key, preset]) => <button key={key} className={snapshot.preset === key ? 'selected' : ''} disabled={snapshot.host !== snapshot.me} onClick={() => send(socket.current, { type: 'preset', value: key })}><strong>{preset.name}</strong><span>{preset.tasks} nhiệm vụ · Họp {preset.discussion}s · Bỏ phiếu {preset.voting}s</span></button>)}</div>
        <div className="lobby-guide"><span><b>01</b> Khám phá con tàu</span><span><b>02</b> Hoàn thành nhiệm vụ</span><span><b>03</b> Họp và bỏ phiếu</span></div>
        {snapshot.host === snapshot.me ? <button className="primary large" disabled={snapshot.players.length < 4} onClick={() => send(socket.current, { type: 'start' })}>Bắt đầu trận <span>→</span></button> : <div className="waiting">Đang chờ host bắt đầu…</div>}
      </div><div className="lobby-list"><h3>PHI HÀNH ĐOÀN</h3>{snapshot.players.map(p => <div className="player-row" key={p.id}><span className="player-dot" style={{ background: p.color }} /><strong>{p.name}</strong>{p.id === snapshot.host && <small>HOST</small>}{!p.connected && <small>MẤT KẾT NỐI</small>}</div>)}</div>
    </main> : <main className="game-layout">
      <section className="map-panel">
        <div className="map-header"><div><span className="eyebrow">{snapshot.phase === 'ended' ? 'KẾT THÚC' : snapshot.phase === 'meeting' ? 'HỌP KHẨN CẤP' : 'ĐANG CHƠI'} · {currentRoom} · {snapshot.mapVariant === 'full' ? '22 PHÒNG' : '16 PHÒNG'}</span><h2>{snapshot.role === 'impostor' ? 'Kẻ phá hoại' : 'Phi hành đoàn'}</h2></div><div className="progress"><span>NHIỆM VỤ {Math.round(snapshot.taskProgress * 100)}%</span><div><i style={{ width: `${snapshot.taskProgress * 100}%` }} /></div></div></div>
        <div className="canvas-wrap"><GameScene game={snapshot} onInteract={interact} pressed={keys} touchDirection={touchDirection} />
          {snapshot.phase === 'playing' && <TouchControls direction={touchDirection} disabled={!!(task || mapOpen || mobilePanel)} action={interact} actionLabel={nearBody && me?.alive ? 'Báo cáo' : snapshot.sabotage === 'reactor' && nearReactor >= 0 && me?.alive && snapshot.role === 'crew' ? 'Sửa lò' : snapshot.sabotage === 'lights' && nearStation?.id === 'wires' ? 'Sửa đèn' : nearStation ? 'Nhiệm vụ' : nearEmergency && me?.alive ? 'Họp' : 'Tương tác'} canAct={!!(nearBody && me?.alive || snapshot.sabotage === 'reactor' && nearReactor >= 0 && me?.alive && snapshot.role === 'crew' && !snapshot.reactorFixed.includes(nearReactor) || snapshot.sabotage === 'lights' && nearStation?.id === 'wires' || nearStation && !snapshot.completedTasks.includes(nearStation.id) || nearEmergency && me?.alive && !snapshot.emergencyUsed)} kill={() => nearTarget && send(socket.current, { type: 'kill', target: nearTarget.id })} canKill={!!(nearTarget && me?.alive && seconds(snapshot.killReadyAt) === 0)} vent={() => nearVent >= 0 && send(socket.current, { type: 'vent', index: nearVent })} canVent={nearVent >= 0 && !!me?.alive} map={() => setMapOpen(true)} tasks={() => setMobilePanel('tasks')} sabotage={() => setMobilePanel('sabotage')} isImpostor={snapshot.role === 'impostor'} />}
        </div>
        <div className="map-footer"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> DI CHUYỂN</span><span><kbd>E</kbd> TƯƠNG TÁC</span><button className="map-toggle" onClick={() => setMapOpen(true)}><kbd>M</kbd> BẢN ĐỒ</button><span>{snapshot.role === 'impostor' ? <><kbd>Q</kbd> HẠ GỤC · <kbd>V</kbd> THÔNG HƠI</> : 'KHÁM PHÁ CÁC PHÒNG ĐỂ LÀM NHIỆM VỤ'}</span></div>
      </section>
      <aside className="sidebar"><div className={`role-card ${snapshot.role === 'impostor' ? 'impostor' : ''}`}><div className="eyebrow">VAI TRÒ BÍ MẬT</div><h3>{snapshot.role === 'impostor' ? 'KẺ PHÁ HOẠI' : 'PHI HÀNH ĐOÀN'}</h3><p>{snapshot.role === 'impostor' ? 'Hạ gục, phá hoại và đánh lạc hướng đoàn.' : 'Làm nhiệm vụ và tìm ra kẻ phá hoại.'}</p>{!me?.alive && <div className="dead-badge">BẠN ĐÃ CHẾT · {snapshot.role === 'crew' ? 'TIẾP TỤC LÀM NHIỆM VỤ' : 'THEO DÕI TRẬN'}</div>}</div>
        {snapshot.sabotage && <div className="alert sabotage-alert"><strong>{snapshot.sabotage === 'reactor' ? `⚠ LÒ PHẢN ỨNG · ${seconds(snapshot.reactorDeadline)}s` : snapshot.sabotage === 'lights' ? '⚠ MẤT ĐIỆN' : `⚠ KHÓA CỬA · ${seconds(snapshot.doorsUntil)}s`}</strong><span>{snapshot.sabotage === 'reactor' ? `Cần hai người khác nhau kích hoạt hai trạm: ${reactorRooms.map((room, index) => `${room} ${snapshot.reactorFixed.includes(index) ? '✓' : '○'}`).join(' · ')}${snapshot.reactorWindowEndsAt ? ` · Trạm còn lại cần hoàn tất trong ${seconds(snapshot.reactorWindowEndsAt)}s` : ''}` : snapshot.sabotage === 'lights' ? 'Tìm bảng điện trong PHÒNG ĐIỆN để khôi phục tầm nhìn.' : 'Các lối vào phòng bị khóa tạm thời.'}</span></div>}
        <div className="panel"><h3>HÀNH ĐỘNG</h3><div className="actions">
          {nearBody && me?.alive && <button className="danger" onClick={() => send(socket.current, { type: 'report', body: nearBody.id })}>Báo cáo xác <kbd>E</kbd></button>}
          {snapshot.sabotage === 'reactor' && nearReactor >= 0 && me?.alive && snapshot.role === 'crew' && <button disabled={snapshot.reactorFixed.includes(nearReactor)} onClick={() => send(socket.current, { type: 'fix', point: nearReactor })}>{snapshot.reactorFixed.includes(nearReactor) ? 'Đã kích hoạt · chờ trạm còn lại' : `Kích hoạt trạm ${reactorRooms[nearReactor]}`} <kbd>E</kbd></button>}
          {snapshot.sabotage === 'lights' && nearStation?.id === 'wires' && snapshot.role === 'crew' && me?.alive && <button onClick={() => send(socket.current, { type: 'fix' })}>Sửa đèn <kbd>E</kbd></button>}
          {nearStation && snapshot.role === 'crew' && !snapshot.completedTasks.includes(nearStation.id) && <button onClick={() => openTask(nearStation.id)}>Làm: {nearStation.name} <kbd>E</kbd></button>}
          {nearEmergency && me?.alive && !snapshot.emergencyUsed && <button onClick={() => send(socket.current, { type: 'emergency' })}>Họp khẩn cấp <kbd>E</kbd></button>}
          {nearTarget && me?.alive && <button className="danger" disabled={seconds(snapshot.killReadyAt) > 0} onClick={() => send(socket.current, { type: 'kill', target: nearTarget.id })}>Hạ gục {nearTarget.name} {seconds(snapshot.killReadyAt) || <kbd>Q</kbd>}</button>}
          {snapshot.role === 'impostor' && nearVent >= 0 && me?.alive && <button onClick={() => send(socket.current, { type: 'vent', index: nearVent })}>Đi thông hơi <kbd>V</kbd></button>}
          {snapshot.phase === 'playing' && !nearBody && !nearStation && !nearTarget && <div className="muted">{me?.alive ? 'Đến gần trạm hoặc người chơi để tương tác.' : 'Ma phe thiện vẫn có thể làm nhiệm vụ.'}</div>}
        </div></div>
        {snapshot.role === 'impostor' && snapshot.phase === 'playing' && me?.alive && <div className="panel sabotage-panel"><h3>PHÁ HOẠI</h3><div className="sabotage-actions">{(['lights', 'doors', 'reactor'] as const).map(kind => <button key={kind} disabled={!!snapshot.sabotage || seconds(snapshot.sabotageReadyAt) > 0} onClick={() => send(socket.current, { type: 'sabotage', kind })}><span className="sabotage-icon">{kind === 'lights' ? '◉' : kind === 'doors' ? '▣' : '☢'}</span><span>{kind === 'lights' ? 'Tắt đèn' : kind === 'doors' ? 'Khóa cửa' : 'Lò phản ứng'}</span></button>)}</div><small>Hồi chiêu: {seconds(snapshot.sabotageReadyAt)}s</small></div>}
        <div className="panel"><h3>{snapshot.role === 'crew' ? `NHIỆM VỤ · ${snapshot.completedTasks.length}/${snapshot.tasks.length}` : 'NGƯỜI CHƠI'}</h3>{snapshot.role === 'crew' ? STATIONS.filter(s => snapshot.tasks.includes(s.id)).map(s => <div className={`task-row ${snapshot.completedTasks.includes(s.id) ? 'is-done' : ''}`} key={s.id}><span>{snapshot.completedTasks.includes(s.id) ? '✓' : '○'}</span><div>{s.name}<small>{s.room}</small></div></div>) : snapshot.players.map(p => <div className="task-row" key={p.id}><span style={{ color: p.color }}>●</span>{p.name}{snapshot.allies.includes(p.id) && ' ◆'}</div>)}</div>
      </aside>
    </main>}
    {mapOpen && snapshot.phase === 'playing' && <TacticalMap game={snapshot} onClose={() => setMapOpen(false)} />}
    {mobilePanel && snapshot.phase === 'playing' && <div className="overlay mobile-panel-overlay" onClick={() => setMobilePanel(null)}><section className="modal mobile-panel" onClick={event => event.stopPropagation()}><button className="close" onClick={() => setMobilePanel(null)} aria-label="Đóng bảng">×</button><div className="eyebrow">{mobilePanel === 'tasks' ? 'MỤC TIÊU' : 'KẺ PHÁ HOẠI'}</div><h2>{mobilePanel === 'tasks' ? 'Nhiệm vụ' : 'Phá hoại'}</h2>{mobilePanel === 'tasks' ? snapshot.role === 'crew' ? STATIONS.filter(station => snapshot.tasks.includes(station.id)).map(station => <div className={`task-row ${snapshot.completedTasks.includes(station.id) ? 'is-done' : ''}`} key={station.id}><span>{snapshot.completedTasks.includes(station.id) ? '✓' : '○'}</span><div>{station.name}<small>{station.room}</small></div></div>) : <p>Giả làm nhiệm vụ và tìm cơ hội phá hoại.</p> : <div className="sabotage-actions">{(['lights', 'doors', 'reactor'] as const).map(kind => <button key={kind} disabled={!!snapshot.sabotage || seconds(snapshot.sabotageReadyAt) > 0} onClick={() => { send(socket.current, { type: 'sabotage', kind }); setMobilePanel(null); }}>{kind === 'lights' ? '◉ Tắt đèn' : kind === 'doors' ? '▣ Khóa cửa' : '☢ Lò phản ứng'}</button>)}<small>Hồi chiêu: {seconds(snapshot.sabotageReadyAt)}s</small></div>}</section></div>}
    {task && snapshot.phase === 'playing' && <TaskModal key={`${task}-${taskSession.current}`} id={task} fake={snapshot.role === 'impostor'} ready={snapshot.role === 'impostor' || taskReady === task} onClose={closeTask} onStep={step => { if (snapshot.role === 'crew') send(socket.current, { type: 'taskStep', id: task, step, session: taskSession.current }); }} onComplete={() => { if (snapshot.role === 'crew') send(socket.current, { type: 'taskComplete', id: task, session: taskSession.current }); else closeTask(); }} />}
      {meeting && snapshot.phase === 'meeting' && <div className="overlay"><section className="modal meeting-modal"><div className="eyebrow">{meeting.reason.toUpperCase()} · {meeting.stage === 'discussion' ? 'THẢO LUẬN' : meeting.stage === 'voting' ? 'BỎ PHIẾU' : 'KẾT QUẢ'}</div><h2>{meeting.stage === 'result' ? meeting.ejected ? `${snapshot.players.find(p => p.id === meeting.ejected)?.name || 'Một người'} đã bị loại` : 'Không ai bị loại' : 'Ai là kẻ phá hoại?'}</h2><div className="meeting-tools"><div className="timer">{seconds(meeting.endsAt)}s</div>{meeting.stage === 'discussion' && <div className="end-meeting"><span>Kết thúc họp sớm: {meeting.endVotes?.length || 0}/{Math.floor(snapshot.players.filter(p => p.alive && p.connected).length / 2) + 1} phiếu</span><button disabled={!me?.alive || meeting.endVotes?.includes(snapshot.me)} onClick={() => send(socket.current, { type: 'endMeeting' })}>{meeting.endVotes?.includes(snapshot.me) ? 'Đã đồng ý' : 'Đồng ý kết thúc'}</button></div>}</div><div className="meeting-tabs"><button className={meetingTab === "players" ? "active" : ""} onClick={() => setMeetingTab("players")}>Người chơi</button><button className={meetingTab === "chat" ? "active" : ""} onClick={() => setMeetingTab("chat")}>Chat</button></div><div className={`meeting-grid mobile-${meetingTab}`}><div className="vote-list">{snapshot.players.map(p => <button key={p.id} disabled={!p.alive || meeting.stage !== 'voting' || !me?.alive || meeting.votesCast.includes(snapshot.me)} onClick={() => send(socket.current, { type: 'vote', target: p.id })}><span className="player-dot" style={{ background: p.color }} />{p.name}{!p.alive && ' · đã chết'}{meeting.votesCast.includes(p.id) && <small>ĐÃ BỎ PHIẾU</small>}</button>)}{meeting.stage === 'voting' && <button disabled={!me?.alive || meeting.votesCast.includes(snapshot.me)} onClick={() => send(socket.current, { type: 'vote', target: null })}>Bỏ qua phiếu</button>}</div><div className="chat"><div className="messages">{snapshot.chat.map(m => <div key={m.id}><strong>{m.name}: </strong>{m.text}</div>)}</div><form onSubmit={e => { e.preventDefault(); send(socket.current, { type: 'chat', text: chatText }); setChatText(''); }}><input value={chatText} maxLength={180} placeholder={me?.alive ? 'Nhắn trong cuộc họp…' : 'Chỉ ma khác thấy tin nhắn…'} onChange={e => setChatText(e.target.value)} /><button disabled={!chatText.trim()}>Gửi</button></form></div></div></section></div>}
    {snapshot.phase === 'ended' && <div className="overlay"><section className="modal end-modal"><div className="eyebrow">VÁN ĐẤU KẾT THÚC</div><h2 className={snapshot.winner === 'impostor' ? 'red' : 'cyan'}>{snapshot.winner === 'impostor' ? 'KẺ PHÁ HOẠI THẮNG' : 'PHI HÀNH ĐOÀN THẮNG'}</h2><p>{snapshot.winnerReason}</p><div className="winner-list">{snapshot.players.map(p => <span key={p.id} style={{ color: p.color }}>{p.name}{snapshot.allies.includes(p.id) ? ' ◆' : ''}</span>)}</div>{snapshot.host === snapshot.me ? <button className="primary large" onClick={() => send(socket.current, { type: 'restart' })}>Chơi ván mới →</button> : <p>Đang chờ host mở ván mới…</p>}</section></div>}
    {error && <div className="toast" onClick={() => setError('')}>{error} ×</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
