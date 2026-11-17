import React, { useEffect } from 'react';
import type { CombatPopupData, CombatPopupSide } from './combatPopupData';

interface CombatResultPopupProps {
  /** Entry currently shown (head of the queue), or null. */
  entry: CombatPopupData | null;
  onDismiss: () => void;
}

export const POPUP_DURATION_MS = 2500;

const SidePanel: React.FC<{ side: CombatPopupSide }> = ({ side }) => {
  const enemy = side.faction === 'enemy';
  const percent = side.maxHp > 0 ? Math.max(0, Math.min(100, (side.hpAfter / side.maxHp) * 100)) : 0;
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
      <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: '#4ade80' }} />
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
      }}
    >
      <SidePanel side={entry.sides[0]} />
      <SidePanel side={entry.sides[1]} />
    </div>
  );
};
