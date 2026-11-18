import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Position } from '../core/grid/types';
import { HUD_CLEAR_BOTTOM, getTileRect } from './tileAnchor';

export interface PendingActions {
  unitName: string | undefined;
  canSeize: boolean;
  talkTargetName: string | null;
  canUseVulnerary: boolean;
  promotions: readonly { id: string; name: string }[];
  villageName: string | null;
  hasAttackTargets: boolean;
}

interface ActionMenuWindowProps {
  /** Tile of the acting unit; the menu opens beside it. */
  anchorTile: Position | null;
  mountLabel: string | null;
  actions: PendingActions | null;
  onToggleMount: () => void;
  onSeize: () => void;
  onTalk: () => void;
  onUseVulnerary: () => void;
  onPromote: (classId: string) => void;
  onVisitVillage: () => void;
  onWait: () => void;
  onCancelMove: () => void;
}

const MENU_WIDTH = 190;
const MENU_GAP = 8;
const HUD_CLUSTER_WIDTH = 200;

export const ActionMenuWindow: React.FC<ActionMenuWindowProps> = (props) => {
  const { mountLabel, actions } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const anchor = getTileRect(props.anchorTile);
  const hidden = mountLabel === null && actions === null;

  useLayoutEffect(() => {
    const box = rootRef.current;
    let next: { left: number; top: number } | null = null;
    if (box && anchor) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = anchor.right + MENU_GAP;
      if (left + MENU_WIDTH > vw - MENU_GAP) left = anchor.left - MENU_GAP - MENU_WIDTH;
      left = Math.max(MENU_GAP, Math.min(left, vw - MENU_GAP - MENU_WIDTH));
      const bottomLimit = left + MENU_WIDTH > vw - HUD_CLUSTER_WIDTH ? vh - HUD_CLEAR_BOTTOM : vh - MENU_GAP;
      const top = Math.max(MENU_GAP, Math.min(Math.max(anchor.top, MENU_GAP), bottomLimit - box.offsetHeight));
      next = { left, top };
    }
    setPos((prev) => (prev?.left === next?.left && prev?.top === next?.top ? prev : next));
  });

  if (hidden) return null;

  const renderItem = (
    key: string,
    label: string,
    onClick: () => void,
    isDanger = false,
  ) => {
    const isHovered = hoveredKey === key;
    return (
      <div
        key={key}
        onMouseEnter={() => setHoveredKey(key)}
        onMouseLeave={() => setHoveredKey(null)}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '6px',
            visibility: isHovered ? 'visible' : 'hidden',
            color: '#f59e0b',
            fontSize: '15px',
            transform: 'scaleX(1.1)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          👉
        </span>
        <button
          onClick={onClick}
          style={{
            width: '100%',
            padding: '6px 10px 6px 28px',
            backgroundColor: 'transparent',
            border: 'none',
            color: isDanger ? (isHovered ? '#fca5a5' : '#ef4444') : isHovered ? '#fde047' : '#ffffff',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            textAlign: 'left',
            textShadow: '1px 1px 0 #000',
            borderRadius: '4px',
            transition: 'color 0.1s ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </button>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: 'fixed',
        ...(pos ? { top: `${pos.top}px`, left: `${pos.left}px` } : { top: '16px', right: '28px' }),
        width: `${MENU_WIDTH}px`,
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 900,
        backgroundColor: '#0c1e5b',
        border: '2px solid #eab308',
        borderRadius: '6px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      {mountLabel !== null && renderItem('mount', mountLabel, props.onToggleMount)}

      {actions !== null && (
        <>
          <div
            style={{
              fontWeight: 'bold',
              color: '#93c5fd',
              fontSize: '13px',
              padding: '4px 8px 6px',
              borderBottom: '1px solid rgba(234, 179, 8, 0.4)',
              marginBottom: '2px',
              letterSpacing: '0.02em',
            }}
          >
            Actions ({actions.unitName})
          </div>
          {actions.hasAttackTargets && (
            <div style={{ padding: '4px 8px', fontSize: '12px', color: '#fde047', borderBottom: '1px solid rgba(234,179,8,0.3)', marginBottom: '4px' }}>
              🎯 Click red tile to attack
            </div>
          )}

          {actions.canSeize && renderItem('seize', '👑 Seize Gate', props.onSeize)}
          {actions.talkTargetName !== null && renderItem('talk', `Talk: ${actions.talkTargetName}`, props.onTalk)}
          {actions.canUseVulnerary && renderItem('vulnerary', 'Use Vulnerary', props.onUseVulnerary)}
          {actions.promotions.map((p) =>
            renderItem(`promote-${p.id}`, `Promote: ${p.name}`, () => props.onPromote(p.id))
          )}
          {actions.villageName !== null && renderItem('village', `Visit (${actions.villageName})`, props.onVisitVillage)}

          {renderItem('wait', '✓ Wait', props.onWait)}
          {renderItem('cancel', 'Cancel Move', props.onCancelMove, true)}
        </>
      )}
    </div>
  );
};
