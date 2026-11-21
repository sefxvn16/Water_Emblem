import React, { useEffect } from 'react';
import type { CombatPopupData, CombatPopupSide } from './combatPopupData';

interface CombatResultPopupProps {
  /** Entry currently shown (head of the queue), or null. */
  entry: CombatPopupData | null;
  onDismiss: () => void;
}

export const POPUP_DURATION_MS = 1400;

const SidePanel: React.FC<{ side: CombatPopupSide }> = ({ side }) => {
  const enemy = side.faction === 'enemy';
  const percentBefore = side.maxHp > 0 ? Math.max(0, Math.min(100, (side.hpBefore / side.maxHp) * 100)) : 0;
  const percentAfter = side.maxHp > 0 ? Math.max(0, Math.min(100, (side.hpAfter / side.maxHp) * 100)) : 0;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '10px 12px',
        backgroundColor: enemy ? '#7f1d1d' : '#1e3a8a',
        border: `2px solid ${enemy ? '#ef5350' : '#60a5fa'}`,
        borderRadius: '6px',
        color: '#fff',
        fontSize: '12px',
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{side.name}</div>
      <div style={{ color: enemy ? '#fecaca' : '#bfdbfe' }}>{side.className} · LV {side.level}</div>
      <div>{side.weaponName}</div>
      <div style={{ margin: '6px 0 2px' }}>HP {side.hpBefore} ➔ <strong>{side.hpAfter}</strong> / {side.maxHp}</div>
      <div style={{ height: '10px', backgroundColor: '#0f172a', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
        {/* Vệt đỏ biểu thị lượng máu bị mất trượt chậm theo sau */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${percentBefore}%`,
            height: '100%',
            backgroundColor: '#ef4444',
            transition: 'width 0.55s cubic-bezier(0.4, 0, 0.2, 1) 0.15s',
          }}
        />
        {/* Lượng máu thực tế còn lại trượt mượt mà */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${percentAfter}%`,
            height: '100%',
            backgroundColor: '#4ade80',
            transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <div style={{ marginTop: '6px', minHeight: '18px', color: '#fde68a' }}>
        {side.strikes.length === 0 ? '—' : side.strikes.join(' · ')}
        {side.defeated && <strong style={{ color: '#fca5a5' }}> · Defeated</strong>}
      </div>
    </div>
  );
};

/** FE3-style result panels docked at the bottom centre. Never intercepts the pointer; any click or key dismisses. */
export const CombatResultPopup: React.FC<CombatResultPopupProps> = ({ entry, onDismiss }) => {
  const entryId = entry?.id;
  useEffect(() => {
    if (entryId === undefined) return;
    const shownAt = performance.now();
    const timer = window.setTimeout(onDismiss, POPUP_DURATION_MS);
    // Ignore the very input event that triggered the combat (it may still be bubbling).
    const dismissOnInput = (event: Event) => {
      if (event.timeStamp >= shownAt) onDismiss();
    };
    document.addEventListener('mousedown', dismissOnInput);
    document.addEventListener('keydown', dismissOnInput);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', dismissOnInput);
      document.removeEventListener('keydown', dismissOnInput);
    };
  }, [entryId]);

  if (!entry) return null;
  const hasCrit = entry.sides.some((s) => s.strikes.some((str) => str.toLowerCase().includes('crit')));

  return (
    <div
      data-testid="combat-result-popup"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '16px',
        transform: 'translateX(-50%)',
        width: 'min(560px, calc(100vw - 32px))',
        display: 'flex',
        gap: '8px',
        boxSizing: 'border-box',
        zIndex: 950,
        pointerEvents: 'none',
        boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
        animation: hasCrit ? 'we-crit-shake 0.24s ease-in-out' : 'we-hit-pulse 0.15s ease-out',
      }}
    >
      <style>{`
        @keyframes we-crit-shake {
          0% { transform: translateX(-50%) translate(0, 0); }
          15% { transform: translateX(-50%) translate(-6px, 3px); }
          30% { transform: translateX(-50%) translate(5px, -4px); }
          45% { transform: translateX(-50%) translate(-4px, -2px); }
          60% { transform: translateX(-50%) translate(3px, 3px); }
          75% { transform: translateX(-50%) translate(-2px, 1px); }
          100% { transform: translateX(-50%) translate(0, 0); }
        }
        @keyframes we-hit-pulse {
          0% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.02); }
          100% { transform: translateX(-50%) scale(1); }
        }
      `}</style>
      <SidePanel side={entry.sides[0]} />
      <SidePanel side={entry.sides[1]} />
      <div
        style={{
          position: 'absolute',
          bottom: '-16px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: '#94a3b8',
          textShadow: '0 1px 2px #000',
          whiteSpace: 'nowrap',
        }}
      >
        Click or press any key to dismiss
      </div>
    </div>
  );
};
