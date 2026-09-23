import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EMERGENCY, INTERACT_RANGE, KILL_RANGE, MAP, REACTOR_FIXES, STATIONS, VENTS, WALLS, distance,
  type ClientMessage, type ServerMessage, type Snapshot
} from '../../../packages/protocol/src/index';
import './style.css';

const apiBase = (import.meta.env.VITE_REALTIME_URL || (import.meta.env.DEV ? 'http://localhost:8787' : '')).replace(/\/$/, '');
const wsBase = apiBase.replace(/^http/, 'ws');

function send(ws: WebSocket | null, message: ClientMessage) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function GameCanvas({ game, onInteract }: { game: Snapshot; onInteract: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = MAP.width; fogCanvas.height = MAP.height;
    const fog = fogCanvas.getContext('2d')!;
    let frame = 0;
    const draw = () => {
      const g = gameRef.current;
      ctx.clearRect(0, 0, MAP.width, MAP.height);
      ctx.fillStyle = '#101a2c'; ctx.fillRect(0, 0, MAP.width, MAP.height);
      ctx.strokeStyle = '#1b2a40'; ctx.lineWidth = 1;
      for (let x = 0; x < MAP.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP.height); ctx.stroke(); }
      for (let y = 0; y < MAP.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP.width, y); ctx.stroke(); }
      const rooms = [
        { x: 25, y: 25, w: 200, h: 210, name: 'ĐIỆN' }, { x: 25, y: 485, w: 200, h: 210, name: 'NHIÊN LIỆU' },
        { x: 425, y: 25, w: 250, h: 95, name: 'Y TẾ' }, { x: 425, y: 600, w: 250, h: 95, name: 'ĐỘNG CƠ' },
        { x: 875, y: 25, w: 200, h: 210, name: 'DỮ LIỆU' }, { x: 875, y: 485, w: 200, h: 210, name: 'ĐIỀU KHIỂN' },
        { x: 280, y: 280, w: 540, h: 160, name: 'SẢNH TRUNG TÂM' }
      ];
      for (const room of rooms) {
        ctx.fillStyle = '#16253b'; ctx.fillRect(room.x, room.y, room.w, room.h);
        ctx.strokeStyle = '#35516c'; ctx.strokeRect(room.x, room.y, room.w, room.h);
        ctx.fillStyle = '#68829d'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(room.name, room.x + 12, room.y + 21);
      }
      for (const wall of WALLS) {
        ctx.fillStyle = '#41627e'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = '#76a1bd'; ctx.fillRect(wall.x, wall.y, wall.w, 4);
      }
      if (g.sabotage === 'doors' && Date.now() < g.doorsUntil) {
        ctx.fillStyle = '#e96b6b';
        ctx.fillRect(232, 255, 16, 210); ctx.fillRect(852, 255, 16, 210);
      }
      for (const station of STATIONS) {
        const active = g.tasks.includes(station.id) && !g.completedTasks.includes(station.id);
        ctx.beginPath(); ctx.arc(station.x, station.y, 24, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#254d65' : '#2a3b4e'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = active ? '#65e4dd' : '#657e94'; ctx.stroke();
        ctx.fillStyle = '#d5f7f5'; ctx.font = '21px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(station.icon, station.x, station.y + 7);
        ctx.font = '12px system-ui'; ctx.fillStyle = '#b4cedc';
        ctx.fillText(station.name, station.x, station.y + 43);
      }
      for (const vent of VENTS) {
        ctx.fillStyle = '#34485b'; ctx.fillRect(vent.x - 22, vent.y - 14, 44, 28);
        ctx.strokeStyle = '#9ab4c7'; ctx.strokeRect(vent.x - 22, vent.y - 14, 44, 28);
        for (let i = -10; i <= 10; i += 10) { ctx.beginPath(); ctx.moveTo(vent.x - 15, vent.y + i / 2); ctx.lineTo(vent.x + 15, vent.y + i / 2); ctx.stroke(); }
      }
      ctx.beginPath(); ctx.arc(EMERGENCY.x, EMERGENCY.y, 37, 0, 2 * Math.PI);
      ctx.fillStyle = '#536c87'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#89b0cd'; ctx.stroke();
      ctx.beginPath(); ctx.arc(EMERGENCY.x, EMERGENCY.y, 17, 0, 2 * Math.PI);
      ctx.fillStyle = '#e2636b'; ctx.fill();
      ctx.fillStyle = '#dfecf3'; ctx.font = 'bold 12px system-ui'; ctx.fillText('HỌP', EMERGENCY.x, EMERGENCY.y + 60);
      if (g.sabotage === 'reactor') for (const point of REACTOR_FIXES) {
        ctx.beginPath(); ctx.arc(point.x, point.y, 28, 0, Math.PI * 2); ctx.fillStyle = '#ad363e'; ctx.fill();
        ctx.strokeStyle = '#ff9b95'; ctx.stroke(); ctx.fillStyle = 'white'; ctx.font = 'bold 19px system-ui'; ctx.fillText('!', point.x, point.y + 7);
      }
      for (const body of g.bodies) {
        ctx.fillStyle = body.color; ctx.fillRect(body.x - 18, body.y - 9, 36, 19);
        ctx.fillStyle = '#d9ebef'; ctx.fillRect(body.x - 3, body.y - 14, 17, 8);
        ctx.fillStyle = '#e7606c'; ctx.font = 'bold 14px system-ui'; ctx.fillText('✕', body.x, body.y - 20);
      }
      for (const player of g.players) {
        if (!player.alive && g.phase !== 'ended' && player.id !== g.me) continue;
        ctx.globalAlpha = player.alive ? 1 : .5;
        ctx.beginPath(); ctx.ellipse(player.x, player.y + 19, 22, 7, 0, 0, 2 * Math.PI);
        ctx.fillStyle = '#08101c'; ctx.fill();
        ctx.fillStyle = player.color; ctx.fillRect(player.x - 17, player.y + 2, 9, 22);
        ctx.fillRect(player.x + 8, player.y + 2, 9, 22);
        ctx.beginPath(); ctx.roundRect(player.x - 19, player.y - 23, 38, 42, 16);
        ctx.fillStyle = player.color; ctx.fill();
        ctx.strokeStyle = player.id === g.me ? '#ffffff' : '#162235'; ctx.lineWidth = player.id === g.me ? 3 : 2; ctx.stroke();
        ctx.beginPath(); ctx.roundRect(player.x - 11, player.y - 15, 30, 17, 8);
        ctx.fillStyle = '#bceefa'; ctx.fill(); ctx.strokeStyle = '#3f647c'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#f5fbff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(player.name + (g.allies.includes(player.id) ? ' ◆' : ''), player.x, player.y - 32);
        ctx.globalAlpha = 1;
      }
      const me = g.players.find(p => p.id === g.me);
      if (g.phase === 'playing' && me?.alive && g.role === 'crew') {
        const radius = g.sabotage === 'lights' ? 140 : 320;
        fog.clearRect(0, 0, MAP.width, MAP.height);
        fog.fillStyle = 'rgba(2,7,17,.88)'; fog.fillRect(0, 0, MAP.width, MAP.height);
        fog.globalCompositeOperation = 'destination-out';
        const gradient = fog.createRadialGradient(me.x, me.y, 35, me.x, me.y, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,1)'); gradient.addColorStop(.7, 'rgba(0,0,0,.95)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
        fog.fillStyle = gradient; fog.beginPath(); fog.arc(me.x, me.y, radius, 0, Math.PI * 2); fog.fill();
        fog.globalCompositeOperation = 'source-over';
        ctx.drawImage(fogCanvas, 0, 0);
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} width={MAP.width} height={MAP.height} onClick={onInteract} aria-label="Bản đồ tàu" />;
}

function TaskModal({ id, fake, onClose, onComplete }: { id: string; fake: boolean; onClose: () => void; onComplete: () => void }) {
  const station = STATIONS.find(s => s.id === id)!;
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [firstWire, setFirstWire] = useState<number | null>(null);
  const started = useRef(Date.now());
  const completion = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    completion.current = setTimeout(onComplete, Math.max(0, 1900 - (Date.now() - started.current)));
  };
  useEffect(() => {
    if (id !== 'scan' && id !== 'upload') return;
    const timer = setInterval(() => setProgress(value => Math.min(100, value + 4)), 120);
    return () => clearInterval(timer);
  }, [id]);
  useEffect(() => { if (progress >= 100 && (id === 'scan' || id === 'upload')) finish(); }, [progress]);
  useEffect(() => () => { if (completion.current) clearTimeout(completion.current); }, []);
  const symbols = ['◆', '●', '▲'];
  return <div className="overlay"><section className="modal task-modal"><button className="close" onClick={onClose}>×</button><div className="eyebrow">{fake ? 'GIẢ LÀM NHIỆM VỤ' : 'NHIỆM VỤ'}</div><h2>{station.name}</h2>
    {id === 'wires' && <><p>Nối các dây cùng màu.</p><div className="wire-grid">{[0, 1, 2].map(n => <button key={`left-${n}`} className={n < step ? 'done' : firstWire === n ? 'selected' : ''} style={{ borderColor: ['#ef7989', '#75e2dc', '#e9c76c'][n] }} onClick={() => setFirstWire(n)}>{['Đỏ', 'Xanh', 'Vàng'][n]}</button>)}{[2, 0, 1].map(n => <button key={`right-${n}`} className={n < step ? 'done' : ''} style={{ borderColor: ['#ef7989', '#75e2dc', '#e9c76c'][n] }} onClick={() => { if (firstWire !== n || n !== step) { setFirstWire(null); return; } setFirstWire(null); if (step === 2) finish(); else setStep(step + 1); }}>{['Vàng', 'Đỏ', 'Xanh'][[2, 0, 1].indexOf(n)]}</button>)}</div></>}
    {id === 'fuel' && <><p>Nhấn để nạp đầy bình nhiên liệu.</p><div className="task-gauge"><i style={{ width: `${step * 12.5}%` }} /></div><button className="task-control" disabled={completed.current} onClick={() => { if (step >= 7) finish(); setStep(Math.min(8, step + 1)); }}>NẠP NHIÊN LIỆU</button><div>{Math.round(step * 12.5)}%</div></>}
    {(id === 'scan' || id === 'upload') && <><p>{id === 'scan' ? 'Đang quét mẫu sinh học…' : 'Đang tải dữ liệu về tàu…'}</p><div className="task-gauge"><i style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></>}
    {id === 'calibrate' && <><p>Nhấn các ký hiệu theo thứ tự.</p><div className="sequence">{symbols.map((symbol, i) => <span key={i} className={i < step ? 'done' : i === step ? 'current' : ''}>{symbol}</span>)}</div><div className="symbol-buttons">{[...symbols].reverse().map(symbol => <button key={symbol} onClick={() => { if (symbol !== symbols[step]) { setStep(0); return; } if (step === 2) finish(); else setStep(step + 1); }}>{symbol}</button>)}</div></>}
    <small>{completed.current ? 'Đang xác nhận…' : fake ? 'Giữ bí mật vai trò của bạn.' : 'Ở gần trạm cho đến khi hoàn thành.'}</small>
  </section></div>;
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
  const [copied, setCopied] = useState(false);
  const [, setClock] = useState(0);
  const socket = useRef<WebSocket | null>(null);
  const desired = useRef<{ code: string; name: string } | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keys = useRef(new Set<string>());
  const snapshotRef = useRef<Snapshot | null>(null);
  snapshotRef.current = snapshot;

  useEffect(() => {
    const timer = setInterval(() => setClock(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

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
    const ws = new WebSocket(`${wsBase}/ws/${normalized}?name=${encodeURIComponent(playerName.trim())}&token=${encodeURIComponent(saved)}`);
    socket.current = ws;
    ws.onopen = () => setStatus('Đã kết nối');
    ws.onmessage = event => {
      let message: ServerMessage;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'welcome') sessionStorage.setItem(`starship-token-${normalized}`, message.token);
      else if (message.type === 'snapshot') { setSnapshot(message); setError(''); }
      else if (message.type === 'error') setError(message.message);
    };
    ws.onerror = () => setStatus('Mất kết nối');
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
      if (g?.phase !== 'playing') return;
      const k = keys.current;
      const dx = Number(k.has('d') || k.has('arrowright')) - Number(k.has('a') || k.has('arrowleft'));
      const dy = Number(k.has('s') || k.has('arrowdown')) - Number(k.has('w') || k.has('arrowup'));
      if (dx || dy) send(socket.current, { type: 'move', dx, dy });
    }, 125);
    return () => { clearInterval(timer); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const createRoom = async () => {
    if (!apiBase) { setError('Thiếu VITE_REALTIME_URL trong cấu hình Vercel.'); return; }
    if (!name.trim()) { setError('Hãy nhập tên trước.'); return; }
    setError(''); setStatus('Đang tạo phòng…');
    try {
      const response = await fetch(`${apiBase}/rooms`, { method: 'POST' });
      const data = await response.json() as { code?: string; error?: string };
      if (!response.ok || !data.code) throw new Error(data.error || 'Không tạo được phòng.');
      connect(data.code, name);
    } catch (e) {
      setError(e instanceof TypeError ? 'Không kết nối được Worker. Kiểm tra VITE_REALTIME_URL và WEB_ORIGIN.' : e instanceof Error ? e.message : 'Không kết nối được máy chủ.');
      setStatus('');
    }
  };

  const me = snapshot?.players.find(p => p.id === snapshot.me);
  const nearStation = snapshot && me ? STATIONS.find(s => distance(s, me) <= INTERACT_RANGE && (snapshot.tasks.includes(s.id) || snapshot.role === 'impostor')) : null;
  const nearBody = snapshot && me ? snapshot.bodies.find(b => distance(b, me) <= INTERACT_RANGE) : null;
  const nearTarget = snapshot && me && snapshot.role === 'impostor' ? snapshot.players.find(p => p.id !== me.id && p.alive && !snapshot.allies.includes(p.id) && distance(p, me) <= KILL_RANGE) : null;
  const nearVent = snapshot && me ? VENTS.findIndex(v => distance(v, me) <= INTERACT_RANGE) : -1;
  const nearReactor = snapshot && me ? REACTOR_FIXES.findIndex(v => distance(v, me) <= INTERACT_RANGE) : -1;
  const nearEmergency = snapshot && me && distance(me, EMERGENCY) <= INTERACT_RANGE;
  const seconds = (target: number) => Math.max(0, Math.ceil((target - Date.now()) / 1000));
  const invite = `${location.origin}/?room=${code}`;
  const openTask = (id: string) => {
    if (!snapshot || snapshot.completedTasks.includes(id)) return;
    setTask(id);
    if (snapshot.role === 'crew') send(socket.current, { type: 'taskStart', id });
  };
  const interact = () => {
    if (!snapshot || snapshot.phase !== 'playing') return;
    if (nearBody && me?.alive) send(socket.current, { type: 'report', body: nearBody.id });
    else if (snapshot.sabotage === 'reactor' && nearReactor >= 0) send(socket.current, { type: 'fix', point: nearReactor });
    else if (snapshot.sabotage === 'lights' && nearStation?.id === 'wires') send(socket.current, { type: 'fix' });
    else if (nearStation) openTask(nearStation.id);
    else if (nearEmergency && me?.alive && !snapshot.emergencyUsed) send(socket.current, { type: 'emergency' });
  };

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key.toLowerCase() === 'e') interact();
      if (event.key.toLowerCase() === 'q' && nearTarget) send(socket.current, { type: 'kill', target: nearTarget.id });
      if (event.key.toLowerCase() === 'v' && nearVent >= 0) send(socket.current, { type: 'vent', index: nearVent });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [snapshot, task]);

  if (!snapshot) return <main className="landing">
    <div className="stars" />
    <section className="landing-card">
      <div className="eyebrow">SOCIAL DEDUCTION • ONLINE</div>
      <h1>STARSHIP<br /><span>SUSPECTS</span></h1>
      <p>Một con tàu. Hai phe. Không phải ai cũng nói thật.</p>
      <label>TÊN CỦA BẠN<input value={name} maxLength={16} placeholder="Nhập tên phi hành gia" onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createRoom()} /></label>
      <button className="primary large" onClick={createRoom}>Tạo phòng mới <span>→</span></button>
      <div className="divider">HOẶC THAM GIA</div>
      <div className="join"><input value={codeInput} maxLength={6} placeholder="MÃ PHÒNG" onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && connect(codeInput, name)} /><button onClick={() => connect(codeInput, name)}>Vào phòng</button></div>
      {status && <div className="status">{status}</div>}{error && <div className="error">{error}</div>}
      <p className="small">Chơi bằng máy tính · WASD di chuyển · E tương tác · Q hạ gục · V thông hơi</p>
    </section>
  </main>;

  const share = async () => { await navigator.clipboard.writeText(invite); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const leave = () => { desired.current = null; const current = socket.current; socket.current = null; current?.close(); setSnapshot(null); setCode(''); setStatus(''); history.replaceState(null, '', '/'); };
  const meeting = snapshot.meeting;
  return <div className="app-shell">
    <header className="topbar"><div className="brand">✦ STARSHIP <strong>SUSPECTS</strong></div><div className="room-code">PHÒNG <strong>{code}</strong></div><div className="connection"><span className="online-dot" /> {status}</div><button className="ghost-button" onClick={leave}>Rời phòng</button></header>
    {snapshot.phase === 'lobby' ? <main className="lobby">
      <div className="lobby-main"><div className="eyebrow">SẢNH CHỜ · {snapshot.players.length}/10 NGƯỜI</div><h2>Chuẩn bị lên tàu</h2><p>Gửi link hoặc mã phòng để mời bạn bè. Cần ít nhất 4 người để bắt đầu.</p>
        <div className="invite"><span>{invite}</span><button onClick={share}>{copied ? 'Đã sao chép' : 'Sao chép link'}</button></div>
        <div className="code-display">{code.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
        {snapshot.host === snapshot.me ? <button className="primary large" disabled={snapshot.players.length < 4} onClick={() => send(socket.current, { type: 'start' })}>Bắt đầu trận <span>→</span></button> : <div className="waiting">Đang chờ host bắt đầu…</div>}
      </div><div className="lobby-list"><h3>PHI HÀNH ĐOÀN</h3>{snapshot.players.map(p => <div className="player-row" key={p.id}><span className="player-dot" style={{ background: p.color }} /><strong>{p.name}</strong>{p.id === snapshot.host && <small>HOST</small>}{!p.connected && <small>MẤT KẾT NỐI</small>}</div>)}</div>
    </main> : <main className="game-layout">
      <section className="map-panel">
        <div className="map-header"><div><span className="eyebrow">{snapshot.phase === 'ended' ? 'KẾT THÚC' : snapshot.phase === 'meeting' ? 'HỌP KHẨN CẤP' : 'ĐANG CHƠI'}</span><h2>{snapshot.role === 'impostor' ? 'Kẻ phá hoại' : 'Phi hành đoàn'}</h2></div><div className="progress"><span>NHIỆM VỤ {Math.round(snapshot.taskProgress * 100)}%</span><div><i style={{ width: `${snapshot.taskProgress * 100}%` }} /></div></div></div>
        <div className="canvas-wrap"><GameCanvas game={snapshot} onInteract={interact} /></div>
        <div className="map-footer"><span>W A S D / ↑ ↓ ← → di chuyển</span><span>E tương tác</span><span>{snapshot.role === 'impostor' ? 'Q hạ gục · V thông hơi' : 'Hoàn thành nhiệm vụ để thắng'}</span></div>
      </section>
      <aside className="sidebar"><div className={`role-card ${snapshot.role === 'impostor' ? 'impostor' : ''}`}><div className="eyebrow">VAI TRÒ BÍ MẬT</div><h3>{snapshot.role === 'impostor' ? 'KẺ PHÁ HOẠI' : 'PHI HÀNH ĐOÀN'}</h3><p>{snapshot.role === 'impostor' ? 'Hạ gục, phá hoại và đánh lạc hướng đoàn.' : 'Làm nhiệm vụ và tìm ra kẻ phá hoại.'}</p>{!me?.alive && <div className="dead-badge">BẠN ĐÃ CHẾT · {snapshot.role === 'crew' ? 'TIẾP TỤC LÀM NHIỆM VỤ' : 'THEO DÕI TRẬN'}</div>}</div>
        {snapshot.sabotage && <div className="alert">{snapshot.sabotage === 'reactor' ? `⚠ LÒ PHẢN ỨNG: ${seconds(snapshot.reactorDeadline)}s` : snapshot.sabotage === 'lights' ? '⚠ MẤT ĐIỆN · SỬA TẠI PHÒNG ĐIỆN' : '⚠ CỬA ĐANG KHÓA'}</div>}
        <div className="panel"><h3>HÀNH ĐỘNG</h3><div className="actions">
          {nearBody && me?.alive && <button className="danger" onClick={() => send(socket.current, { type: 'report', body: nearBody.id })}>Báo cáo xác <kbd>E</kbd></button>}
          {snapshot.sabotage === 'reactor' && nearReactor >= 0 && me?.alive && snapshot.role === 'crew' && <button onClick={() => send(socket.current, { type: 'fix', point: nearReactor })}>Sửa lò phản ứng <kbd>E</kbd></button>}
          {snapshot.sabotage === 'lights' && nearStation?.id === 'wires' && snapshot.role === 'crew' && me?.alive && <button onClick={() => send(socket.current, { type: 'fix' })}>Sửa đèn <kbd>E</kbd></button>}
          {nearStation && snapshot.role === 'crew' && !snapshot.completedTasks.includes(nearStation.id) && <button onClick={() => openTask(nearStation.id)}>Làm: {nearStation.name} <kbd>E</kbd></button>}
          {nearEmergency && me?.alive && !snapshot.emergencyUsed && <button onClick={() => send(socket.current, { type: 'emergency' })}>Họp khẩn cấp <kbd>E</kbd></button>}
          {nearTarget && me?.alive && <button className="danger" disabled={seconds(snapshot.killReadyAt) > 0} onClick={() => send(socket.current, { type: 'kill', target: nearTarget.id })}>Hạ gục {nearTarget.name} {seconds(snapshot.killReadyAt) || <kbd>Q</kbd>}</button>}
          {snapshot.role === 'impostor' && nearVent >= 0 && me?.alive && <button onClick={() => send(socket.current, { type: 'vent', index: nearVent })}>Đi thông hơi <kbd>V</kbd></button>}
          {snapshot.phase === 'playing' && !nearBody && !nearStation && !nearTarget && <div className="muted">{me?.alive ? 'Đến gần trạm hoặc người chơi để tương tác.' : 'Ma phe thiện vẫn có thể làm nhiệm vụ.'}</div>}
        </div></div>
        {snapshot.role === 'impostor' && snapshot.phase === 'playing' && me?.alive && <div className="panel"><h3>PHÁ HOẠI</h3><div className="sabotage-actions">{(['lights', 'doors', 'reactor'] as const).map(kind => <button key={kind} disabled={!!snapshot.sabotage || seconds(snapshot.sabotageReadyAt) > 0} onClick={() => send(socket.current, { type: 'sabotage', kind })}>{kind === 'lights' ? 'Tắt đèn' : kind === 'doors' ? 'Khóa cửa' : 'Lò phản ứng'}</button>)}</div><small>Hồi chiêu: {seconds(snapshot.sabotageReadyAt)}s</small></div>}
        <div className="panel"><h3>{snapshot.role === 'crew' ? 'NHIỆM VỤ' : 'NGƯỜI CHƠI'}</h3>{snapshot.role === 'crew' ? STATIONS.map(s => <div className="task-row" key={s.id}><span>{snapshot.completedTasks.includes(s.id) ? '✓' : '○'}</span>{s.name}</div>) : snapshot.players.map(p => <div className="task-row" key={p.id}><span style={{ color: p.color }}>●</span>{p.name}{snapshot.allies.includes(p.id) && ' ◆'}</div>)}</div>
      </aside>
    </main>}
    {task && snapshot.phase === 'playing' && <TaskModal key={task} id={task} fake={snapshot.role === 'impostor'} onClose={() => setTask(null)} onComplete={() => { if (snapshot.role === 'crew') send(socket.current, { type: 'taskComplete', id: task }); setTask(null); }} />}
      {meeting && snapshot.phase === 'meeting' && <div className="overlay"><section className="modal meeting-modal"><div className="eyebrow">{meeting.reason.toUpperCase()} · {meeting.stage === 'discussion' ? 'THẢO LUẬN' : meeting.stage === 'voting' ? 'BỎ PHIẾU' : 'KẾT QUẢ'}</div><h2>{meeting.stage === 'result' ? meeting.ejected ? `${snapshot.players.find(p => p.id === meeting.ejected)?.name || 'Một người'} đã bị loại` : 'Không ai bị loại' : 'Ai là kẻ phá hoại?'}</h2><div className="timer">{seconds(meeting.endsAt)}s</div><div className="meeting-grid"><div className="vote-list">{snapshot.players.map(p => <button key={p.id} disabled={!p.alive || meeting.stage !== 'voting' || !me?.alive || meeting.votesCast.includes(snapshot.me)} onClick={() => send(socket.current, { type: 'vote', target: p.id })}><span className="player-dot" style={{ background: p.color }} />{p.name}{!p.alive && ' · đã chết'}{meeting.votesCast.includes(p.id) && <small>ĐÃ BỎ PHIẾU</small>}</button>)}{meeting.stage === 'voting' && <button disabled={!me?.alive || meeting.votesCast.includes(snapshot.me)} onClick={() => send(socket.current, { type: 'vote', target: null })}>Bỏ qua phiếu</button>}</div><div className="chat"><div className="messages">{snapshot.chat.map(m => <div key={m.id}><strong>{m.name}: </strong>{m.text}</div>)}</div><form onSubmit={e => { e.preventDefault(); send(socket.current, { type: 'chat', text: chatText }); setChatText(''); }}><input value={chatText} maxLength={180} placeholder={me?.alive ? 'Nhắn trong cuộc họp…' : 'Chỉ ma khác thấy tin nhắn…'} onChange={e => setChatText(e.target.value)} /><button disabled={!chatText.trim()}>Gửi</button></form></div></div></section></div>}
    {snapshot.phase === 'ended' && <div className="overlay"><section className="modal end-modal"><div className="eyebrow">VÁN ĐẤU KẾT THÚC</div><h2 className={snapshot.winner === 'impostor' ? 'red' : 'cyan'}>{snapshot.winner === 'impostor' ? 'KẺ PHÁ HOẠI THẮNG' : 'PHI HÀNH ĐOÀN THẮNG'}</h2><p>{snapshot.winnerReason}</p><div className="winner-list">{snapshot.players.map(p => <span key={p.id} style={{ color: p.color }}>{p.name}{snapshot.allies.includes(p.id) ? ' ◆' : ''}</span>)}</div>{snapshot.host === snapshot.me ? <button className="primary large" onClick={() => send(socket.current, { type: 'restart' })}>Chơi ván mới →</button> : <p>Đang chờ host mở ván mới…</p>}</section></div>}
    {error && <div className="toast" onClick={() => setError('')}>{error} ×</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<App />);
