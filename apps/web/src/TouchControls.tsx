import { useEffect, useRef, useState, type PointerEvent } from 'react';

export type Direction = { dx: number; dy: number };

export function TouchControls({ direction, disabled, action, actionLabel, canAct, kill, canKill, vent, canVent, map, tasks, sabotage, isImpostor }: {
  direction: { current: Direction }; action: () => void; actionLabel: string; canAct: boolean;
  disabled: boolean;
  kill: () => void; canKill: boolean; vent: () => void; canVent: boolean;
  map: () => void; tasks: () => void; sabotage: () => void; isImpostor: boolean;
}) {
  const pointer = useRef<number | null>(null);
  const [position, setPosition] = useState<Direction>({ dx: 0, dy: 0 });
  useEffect(() => { if (disabled) { pointer.current = null; direction.current = { dx: 0, dy: 0 }; setPosition({ dx: 0, dy: 0 }); } }, [disabled, direction]);
  const update = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - rect.left - rect.width / 2) / (rect.width * .34);
    const dy = (event.clientY - rect.top - rect.height / 2) / (rect.height * .34);
    const length = Math.hypot(dx, dy);
    const next = length > 1 ? { dx: dx / length, dy: dy / length } : { dx, dy };
    direction.current = next;
    setPosition(next);
  };
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    direction.current = { dx: 0, dy: 0 };
    setPosition({ dx: 0, dy: 0 });
  };
  return <div className="touch-controls" aria-label="Điều khiển cảm ứng">
    <div className="touch-shortcuts"><button onClick={map}>Bản đồ</button><button onClick={tasks}>Nhiệm vụ</button>{isImpostor && <button onClick={sabotage}>Phá hoại</button>}</div>
    <div className="touch-joystick" role="group" aria-label="Cần điều khiển di chuyển" onPointerDown={event => { if (disabled || pointer.current !== null) return; pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event); }} onPointerMove={event => { if (!disabled && pointer.current === event.pointerId) update(event); }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
      <div className="touch-stick" style={{ transform: `translate(${position.dx * 37}px, ${position.dy * 37}px)` }} />
    </div>
    <div className="touch-actions"><button className="touch-action-primary" disabled={!canAct} onClick={action}>{actionLabel}</button>{isImpostor && <div className="touch-action-secondary"><button disabled={!canKill} onClick={kill}>Hạ gục</button><button disabled={!canVent} onClick={vent}>Thông hơi</button></div>}</div>
  </div>;
}
