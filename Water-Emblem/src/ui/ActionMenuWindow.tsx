import React, { useLayoutEffect, useRef, useState } from 'react';
import type { Position } from '../core/grid/types';
import { ACTION_MENU_WIDTH, computeActionMenuPosition, getTileRect } from './tileAnchor';

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
  /** Tile of the acting unit; the menu anchors directly beside it on grid. */
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
 * Modern Fire Emblem Action Menu (FE11/FE12, Awakening, Three Houses inspired).
 * Vertically stacked tactile command banner column dynamically anchored beside
 * the acting unit tile, dodging interactable and enemy targets.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const isSoloMountAction = actions === null && mountLabel !== null;

  useLayoutEffect(() => {
    if (isSoloMountAction) {
      setPos(null);
      return;
    }
    const box = rootRef.current;
    const anchor = getTileRect(props.anchorTile);
    let next: { left: number; top: number } | null = null;
    if (box && anchor) {
      const avoids = (props.actions?.targetPositions ?? props.avoidPositions ?? [])
        .map(getTileRect)
        .filter((r): r is NonNullable<typeof r> => r !== null);
      next = computeActionMenuPosition(
        anchor,
        avoids,
        box.offsetWidth || ACTION_MENU_WIDTH,
        box.offsetHeight || 280,
        window.innerWidth,
        window.innerHeight,
      );
    }
    setPos((prev) => (prev?.left === next?.left && prev?.top === next?.top ? prev : next));
  });

  if (mountLabel === null && actions === null) return null;

  const descriptors: ActionDescriptor[] = [];
  if (actions !== null) {
    // Fixed action order per Fire Emblem canon:
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
    const isCancel = key === 'cancel';

    return (
      <button
        key={key}
        type="button"
        className={variant === 'primary' ? 'we-action-primary' : undefined}
        data-testid={`action-${key}`}
        aria-label={label}
        title={isCancel ? `${label} (Right Click / Esc)` : label}
        onClick={onClick}
        onMouseEnter={() => setHoveredKey(key)}
        onMouseLeave={() => setHoveredKey(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          minHeight: '44px',
          padding: '6px 12px',
          borderRadius: '5px',
          background: isHovered
            ? (variant === 'danger'
                ? 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 100%)'
                : 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)')
            : (variant === 'danger'
                ? 'rgba(69, 10, 10, 0.65)'
                : variant === 'primary'
                  ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.22) 0%, rgba(30, 58, 138, 0.6) 100%)'
                  : 'rgba(15, 23, 42, 0.6)'),
          border: isHovered
            ? (variant === 'danger' ? '1.5px solid #ef4444' : '1.5px solid #facc15')
            : (variant === 'primary' ? '1.5px solid #eab308' : '1px solid rgba(234, 179, 8, 0.3)'),
          boxShadow: isHovered
            ? (variant === 'danger' ? '0 0 10px rgba(239, 68, 68, 0.45)' : '0 0 10px rgba(250, 204, 21, 0.45)')
            : 'none',
          transform: isHovered ? 'translateX(3px)' : 'none',
          transition: 'transform 0.1s ease, background 0.1s ease, border-color 0.1s ease',
          cursor: 'pointer',
          textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontSize: '18px',
            lineHeight: 1,
            width: '24px',
            textAlign: 'center',
            flexShrink: 0,
            filter: isHovered ? 'drop-shadow(0 0 4px #fde047)' : 'none',
          }}
          aria-hidden="true"
        >
          {glyph}
        </span>
        <span
          style={{
            fontSize: '13.5px',
            fontWeight: 800,
            color: variant === 'danger' ? '#fca5a5' : isHovered || variant === 'primary' ? '#fde047' : '#ffffff',
            letterSpacing: '0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={rootRef}
      data-testid="action-menu"
      className="we-action-bar"
      style={{
        position: 'fixed',
        ...(isSoloMountAction
          ? { left: '16px', bottom: '72px', width: 'auto' }
          : (pos ? { top: `${pos.top}px`, left: `${pos.left}px`, width: 'clamp(180px, 15vw, 220px)' } : { right: '16px', bottom: '16px', width: 'clamp(180px, 15vw, 220px)' })),
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backgroundColor: 'rgba(11, 26, 66, 0.96)',
        border: '1.5px solid #c9a227',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.75), inset 0 1px 0 rgba(254,240,138,0.25)',
        padding: '6px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <style>{`
        @keyframes we-action-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(253,224,71,0.4), inset 0 1px 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 18px rgba(253,224,71,0.85), inset 0 1px 0 rgba(255,255,255,0.4); }
        }
        .we-action-primary { animation: we-action-glow 1.6s ease-in-out infinite; }
      `}</style>
      {actions !== null && (
        <div
          style={{
            fontWeight: 800,
            color: '#fde047',
            fontSize: '13px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '4px 8px 6px',
            borderBottom: '1px solid rgba(201, 162, 39, 0.4)',
            marginBottom: '4px',
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {`Actions (${actions.unitName})`}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
        }}
      >
        {descriptors.map(renderButton)}
      </div>
    </div>
  );
};
