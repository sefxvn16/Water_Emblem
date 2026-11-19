import React, { useState } from 'react';
import type { Position } from '../core/grid/types';

export interface PendingActions {
  unitName: string | undefined;
  canSeize: boolean;
  talkTargetName: string | null;
  canUseVulnerary: boolean;
  promotions: readonly { id: string; name: string }[];
  villageName: string | null;
  hasAttackTargets: boolean;
  targetPositions?: readonly Position[];
  /** Usable weapons that can be equipped instead (PLAN item 85). */
  equipOptions: readonly { itemId: string; name: string }[];
  /** An adjacent ally can trade (PLAN item 87). */
  canTrade: boolean;
  /** False after trading: FE3 ends movement on trade exit (PLAN item 87). */
  canCancelMove: boolean;
  /** Marth or adjacent to Marth: Storage available (PLAN item 88). */
  canStorage: boolean;
  /** Usable heal staves with at least one target (PLAN item 89). */
  staffOptions: readonly { itemId: string; name: string }[];
  /** Standing on a shop tile: Shop available (PLAN item 91). */
  canShop: boolean;
  /** Standing on a closed chest this unit can open (PLAN item 92). */
  canOpenChest: boolean;
  /** Adjacent to a closed door this unit can open (PLAN item 92). */
  canOpenDoor: boolean;
  /** Standing on an arena tile, armed, with gold to wager (PLAN item 93). */
  canArena: boolean;
  /** Standing on an escape tile in an escape chapter (PLAN item 109). */
  canEscape: boolean;
  /** Manakete ready to transform (PLAN item 121). */
  canTransform: boolean;
  /** Adjacent acted ally a dancer can refresh (PLAN item 124). */
  danceTargetName: string | null;
  /** Adjacent ally Xane can imitate (PLAN item 124). */
  imitateTargetName: string | null;
}

interface ActionMenuWindowProps {
  /** Kept for compatibility; the bar is fixed at the bottom-right (PLAN item 98). */
  anchorTile: Position | null;
  avoidPositions?: readonly Position[];
  mountLabel: string | null;
  actions: PendingActions | null;
  onToggleMount: () => void;
  onAttack: () => void;
  onEquip: (itemId: string) => void;
  onTrade: () => void;
  onStorage: () => void;
  onStaff: (itemId: string) => void;
  onShop: () => void;
  onOpenChest: () => void;
  onOpenDoor: () => void;
  onArena: () => void;
  onSeize: () => void;
  onEscape: () => void;
  onTransform: () => void;
  onDance: () => void;
  onImitate: () => void;
  onTalk: () => void;
  onUseVulnerary: () => void;
  onPromote: (classId: string) => void;
  onVisitVillage: () => void;
  onWait: () => void;
  onCancelMove: () => void;
}

/**
 * Action bar (PLAN item 98): a row of circular, slightly glossy buttons at
 * the bottom-right of the screen — navy enamel with a muted-gold ring in
 * the classic European FE style. Attack is the gold primary; Cancel Move
 * carries the red ring. Labels stay as text under each button.
 */
export const ActionMenuWindow: React.FC<ActionMenuWindowProps> = (props) => {
  const { mountLabel, actions } = props;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (mountLabel === null && actions === null) return null;

  const renderButton = (
    key: string,
    glyph: string,
    label: string,
    onClick: () => void,
    variant: 'primary' | 'normal' | 'danger' = 'normal',
  ) => {
    const isHovered = hoveredKey === key;
    const ring = variant === 'danger' ? '#ef4444' : variant === 'primary' ? '#fde047' : '#c9a227';
    const face = variant === 'primary'
      ? 'radial-gradient(circle at 32% 28%, #fef9c3 0%, #facc15 45%, #eab308 70%, #a16207 100%)'
      : variant === 'danger'
        ? 'radial-gradient(circle at 32% 28%, #7f1d1d 0%, #450a0a 60%, #2b0606 100%)'
        : 'radial-gradient(circle at 32% 28%, #3b5bb5 0%, #16296b 55%, #0c1e5b 100%)';
    return (
      <div
        key={key}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '64px' }}
      >
        <button
          type="button"
          data-testid={`action-${key}`}
          aria-label={label}
          title={label}
          onClick={onClick}
          onMouseEnter={() => setHoveredKey(key)}
          onMouseLeave={() => setHoveredKey(null)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            padding: 0,
            background: face,
            border: `2px solid ${ring}`,
            boxShadow: isHovered
              ? `inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -5px 8px rgba(0,0,0,0.5), 0 0 14px ${ring}88, 0 5px 12px rgba(0,0,0,0.65)`
              : 'inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -5px 8px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.6)',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <span aria-hidden="true">{glyph}</span>
        </button>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            color: variant === 'danger' ? '#fca5a5' : '#e2e8f0',
            textShadow: '1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.8)',
            textAlign: 'center',
            maxWidth: '72px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      </div>
    );
  };

  return (
    <div
      data-testid="action-menu"
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {actions !== null && (
        <div
          style={{
            fontWeight: 'bold',
            color: '#fde047',
            fontSize: '12px',
            letterSpacing: '0.02em',
            backgroundColor: 'rgba(12, 30, 91, 0.92)',
            border: '1px solid #c9a227',
            borderRadius: '999px',
            padding: '3px 12px',
            boxShadow: '0 3px 8px rgba(0,0,0,0.55)',
          }}
        >
          {`Actions (${actions.unitName})`}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
      >
        {mountLabel !== null && renderButton('mount', '🐴', mountLabel, props.onToggleMount)}
        {actions !== null && (
          <>
            {actions.hasAttackTargets && renderButton('attack', '⚔️', 'Attack', props.onAttack, 'primary')}
            {actions.equipOptions.map((option) =>
              renderButton(`equip-${option.itemId}`, '🗡️', `Equip: ${option.name}`, () => props.onEquip(option.itemId))
            )}
            {actions.canTrade && renderButton('trade', '🔁', 'Trade', props.onTrade)}
            {actions.canStorage && renderButton('storage', '📦', 'Storage', props.onStorage)}
            {actions.staffOptions.map((option) =>
              renderButton(`staff-${option.itemId}`, '✨', `Staff: ${option.name}`, () => props.onStaff(option.itemId))
            )}
            {actions.canSeize && renderButton('seize', '👑', 'Seize Gate', props.onSeize)}
            {actions.canEscape && renderButton('escape', '🏃', 'Escape', props.onEscape, 'primary')}
            {actions.canTransform && renderButton('transform', '🐉', 'Transform', props.onTransform, 'primary')}
            {actions.danceTargetName !== null && renderButton('dance', '💃', `Dance: ${actions.danceTargetName}`, props.onDance)}
            {actions.imitateTargetName !== null && renderButton('imitate', '🎭', `Imitate: ${actions.imitateTargetName}`, props.onImitate)}
            {actions.talkTargetName !== null && renderButton('talk', '💬', `Talk: ${actions.talkTargetName}`, props.onTalk)}
            {actions.canUseVulnerary && renderButton('vulnerary', '🧪', 'Use Vulnerary', props.onUseVulnerary)}
            {actions.promotions.map((p) =>
              renderButton(`promote-${p.id}`, '⬆️', `Promote: ${p.name}`, () => props.onPromote(p.id))
            )}
            {actions.villageName !== null && renderButton('village', '🏠', `Visit (${actions.villageName})`, props.onVisitVillage)}
            {actions.canShop && renderButton('shop', '🏪', 'Shop', props.onShop)}
            {actions.canOpenChest && renderButton('chest', '🎁', 'Open Chest', props.onOpenChest)}
            {actions.canOpenDoor && renderButton('door', '🚪', 'Open Door', props.onOpenDoor)}
            {actions.canArena && renderButton('arena', '🏟️', 'Arena', props.onArena)}
            {renderButton('wait', '⏳', 'Wait', props.onWait)}
            {actions.canCancelMove && renderButton('cancel', '↩️', 'Cancel Move', props.onCancelMove, 'danger')}
          </>
        )}
      </div>
    </div>
  );
};
