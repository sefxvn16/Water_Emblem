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
  /** Adjacent drawbridge lever unit can lower (FE3 menuCommands, PLAN item 178). */
  canLowerBridge?: boolean;
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
  onLowerBridge?: () => void;
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
 * Action bar (PLAN items 98/126/130): a row of circular, glossy 3D buttons
 * at the bottom-right — navy enamel with a muted-gold ring in the classic
 * European FE style. Buttons are ordered by priority; the highest-priority
 * available action is gold and pulses. Size scales with the viewport
 * (56px floor on small screens, 84px = 1.5× on large ones).
 */

interface ActionDescriptor {
  key: string;
  glyph: string;
  label: string;
  onClick: () => void;
  priority: number;
  danger?: boolean;
}

export const ActionMenuWindow: React.FC<ActionMenuWindowProps> = (props) => {
  const { mountLabel, actions } = props;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (mountLabel === null && actions === null) return null;

  const descriptors: ActionDescriptor[] = [];
  if (actions !== null) {
    // PLAN item 139: Fixed action order per Fire Emblem canon:
    // Talk > Visit > Seize > Escape > Chest > Door > Shop > Arena > Attack > Staff > Equip > Vulnerary > Trade > Storage > Transform > Dance > Imitate > Promote > Mount > Wait > Cancel Move
    if (actions.talkTargetName !== null) descriptors.push({ key: 'talk', glyph: '💬', label: `Talk: ${actions.talkTargetName}`, onClick: props.onTalk, priority: 1 });
    if (actions.villageName !== null) descriptors.push({ key: 'village', glyph: '🏠', label: `Visit (${actions.villageName})`, onClick: props.onVisitVillage, priority: 2 });
    if (actions.canSeize) descriptors.push({ key: 'seize', glyph: '👑', label: 'Seize Gate', onClick: props.onSeize, priority: 3 });
    if (actions.canEscape) descriptors.push({ key: 'escape', glyph: '🏃', label: 'Escape', onClick: props.onEscape, priority: 4 });
    if (actions.canOpenChest) descriptors.push({ key: 'chest', glyph: '🎁', label: 'Open Chest', onClick: props.onOpenChest, priority: 5 });
    if (actions.canOpenDoor) descriptors.push({ key: 'door', glyph: '🚪', label: 'Open Door', onClick: props.onOpenDoor, priority: 6 });
    if (actions.canLowerBridge && props.onLowerBridge) {
      descriptors.push({ key: 'lower-bridge', glyph: '🌉', label: 'Lower Bridge', onClick: props.onLowerBridge, priority: 6.5 });
    }
    if (actions.canShop) descriptors.push({ key: 'shop', glyph: '🏪', label: 'Shop', onClick: props.onShop, priority: 7 });
    if (actions.canArena) descriptors.push({ key: 'arena', glyph: '🏟️', label: 'Arena', onClick: props.onArena, priority: 8 });
    if (actions.hasAttackTargets) descriptors.push({ key: 'attack', glyph: '⚔️', label: 'Attack', onClick: props.onAttack, priority: 9 });
    for (const option of actions.staffOptions) {
      descriptors.push({ key: `staff-${option.itemId}`, glyph: '✨', label: `Staff: ${option.name}`, onClick: () => props.onStaff(option.itemId), priority: 10 });
    }
    for (const option of actions.equipOptions) {
      descriptors.push({ key: `equip-${option.itemId}`, glyph: '🗡️', label: `Equip: ${option.name}`, onClick: () => props.onEquip(option.itemId), priority: 11 });
    }
    if (actions.canUseVulnerary) descriptors.push({ key: 'vulnerary', glyph: '🧪', label: 'Use Vulnerary', onClick: props.onUseVulnerary, priority: 12 });
    if (actions.canTrade) descriptors.push({ key: 'trade', glyph: '🔁', label: 'Trade', onClick: props.onTrade, priority: 13 });
    if (actions.canStorage) descriptors.push({ key: 'storage', glyph: '📦', label: 'Storage', onClick: props.onStorage, priority: 14 });
    if (actions.canTransform) descriptors.push({ key: 'transform', glyph: '🐉', label: 'Transform', onClick: props.onTransform, priority: 15 });
    if (actions.danceTargetName !== null) descriptors.push({ key: 'dance', glyph: '💃', label: `Dance: ${actions.danceTargetName}`, onClick: props.onDance, priority: 16 });
    if (actions.imitateTargetName !== null) descriptors.push({ key: 'imitate', glyph: '🎭', label: `Imitate: ${actions.imitateTargetName}`, onClick: props.onImitate, priority: 17 });
    for (const p of actions.promotions) {
      descriptors.push({ key: `promote-${p.id}`, glyph: '⬆️', label: `Promote: ${p.name}`, onClick: () => props.onPromote(p.id), priority: 18 });
    }
    descriptors.push({ key: 'wait', glyph: '⏳', label: 'Wait', onClick: props.onWait, priority: 20 });
    if (actions.canCancelMove) descriptors.push({ key: 'cancel', glyph: '↩️', label: 'Cancel Move', onClick: props.onCancelMove, priority: 21, danger: true });
  }
  if (mountLabel !== null) {
    const isDismount = mountLabel.toLowerCase().includes('dismount');
    descriptors.push({ key: 'mount', glyph: isDismount ? '🚶' : '🐴', label: mountLabel, onClick: props.onToggleMount, priority: 19 });
  }
  descriptors.sort((a, b) => a.priority - b.priority);
  const topKey = descriptors.find((d) => d.key !== 'wait' && d.key !== 'cancel')?.key;

  const renderButton = (descriptor: ActionDescriptor) => {
    const { key, glyph, label, onClick } = descriptor;
    const variant = descriptor.danger ? 'danger' : key === topKey ? 'primary' : 'normal';
    const isHovered = hoveredKey === key;
    const ring = variant === 'danger' ? '#ef4444' : variant === 'primary' ? '#fde047' : '#c9a227';
    const face = variant === 'primary'
      ? 'radial-gradient(circle at 32% 28%, #fef9c3 0%, #facc15 45%, #eab308 70%, #a16207 100%)'
      : variant === 'danger'
        ? 'radial-gradient(circle at 32% 28%, #991b1b 0%, #581c1c 55%, #2b0606 100%)'
        : 'radial-gradient(circle at 32% 28%, #3b5bb5 0%, #16296b 55%, #0c1e5b 100%)';
    const isCancel = key === 'cancel';
    return (
      <div
        key={key}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          width: 'clamp(64px, 9vw, 96px)',
          ...(isCancel ? { marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px dashed rgba(239, 68, 68, 0.4)' } : {}),
        }}
      >
        <button
          type="button"
          className={variant === 'primary' ? 'we-action-primary' : undefined}
          data-testid={`action-${key}`}
          aria-label={label}
          title={isCancel ? `${label} (Right Click)` : label}
          onClick={onClick}
          onMouseEnter={() => setHoveredKey(key)}
          onMouseLeave={() => setHoveredKey(null)}
          style={{
            width: 'clamp(56px, 8vw, 84px)',
            height: 'clamp(56px, 8vw, 84px)',
            borderRadius: '50%',
            padding: 0,
            background: face,
            border: `2.5px solid ${ring}`,
            boxShadow: isHovered
              ? `inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -5px 8px rgba(0,0,0,0.5), 0 0 16px ${ring}aa, 0 5px 12px rgba(0,0,0,0.65)`
              : isCancel
                ? 'inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -5px 8px rgba(0,0,0,0.55), 0 0 10px rgba(239,68,68,0.45), 0 4px 10px rgba(0,0,0,0.6)'
                : 'inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -5px 8px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.6)',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(24px, 3.4vw, 36px)',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          <span aria-hidden="true">{glyph}</span>
        </button>
        <span
          style={{
            fontSize: 'clamp(10px, 1.5vw, 13px)',
            fontWeight: 'bold',
            color: variant === 'danger' ? '#fca5a5' : '#e2e8f0',
            textShadow: '1px 1px 0 #000, 0 0 4px rgba(0,0,0,0.8)',
            textAlign: 'center',
            maxWidth: 'clamp(72px, 10vw, 104px)',
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
      className="we-action-bar"
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
      <style>{`
        @keyframes we-action-glow {
          0%, 100% { box-shadow: inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -5px 8px rgba(0,0,0,0.5), 0 0 10px rgba(253,224,71,0.55), 0 4px 10px rgba(0,0,0,0.6); }
          50% { box-shadow: inset 0 2px 3px rgba(255,255,255,0.4), inset 0 -5px 8px rgba(0,0,0,0.5), 0 0 26px rgba(253,224,71,0.95), 0 4px 10px rgba(0,0,0,0.6); }
        }
        .we-action-primary { animation: we-action-glow 1.6s ease-in-out infinite; }
        /* PLAN item 128: on narrow screens the bar sits above the unit
           summary card instead of covering it. */
        @media (max-width: 640px) {
          .we-action-bar { bottom: 132px !important; }
        }
      `}</style>
      {actions !== null && (
        <div
          style={{
            fontWeight: 'bold',
            color: '#fde047',
            fontSize: 'clamp(12px, 1.6vw, 15px)',
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
        {descriptors.map(renderButton)}
      </div>
    </div>
  );
};
