import React from 'react';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { Position } from '../core/grid/types';
import { DS_COLORS, DS_RADII, DS_Z, primaryButtonStyle, sharedPanelStyle } from './designSystem';
import { getTileRect } from './tileAnchor';
import { useAnchoredOverlay, type OverlayCorner } from './overlayAnchor';
import { getItemIcon } from './itemIcon';

interface UnitHoverWindowProps {
  unit: ExtendedUnitState;
  tile: Position;
  hasActionBar?: boolean;
  onInspect?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/** Basic unit info popup: horizontal banner matching FE3 layout (Image 4). */
export const UnitHoverWindow: React.FC<UnitHoverWindowProps> = ({
  unit: u,
  tile,
  hasActionBar,
  onInspect,
  onMouseEnter,
  onMouseLeave,
}) => {
  // The banner sits on the side opposite the tile's horizontal half, and flips
  // when the map scrolls or the window resizes (hud-basic-info R4/R6).
  // When an action menu is active at bottom-right (PLAN item 164), prefer bottom-left
  // and avoid the action bar so the two never overlap.
  const rect = getTileRect(tile);
  const tileCenterX = rect ? (rect.left + rect.right) / 2 : null;
  const prefer: OverlayCorner = hasActionBar
    ? 'bottom-left'
    : (tileCenterX === null || typeof window === 'undefined' || tileCenterX >= window.innerWidth / 2
      ? 'bottom-left'
      : 'bottom-right');
  const { ref, style: anchorStyle } = useAnchoredOverlay({
    tile,
    width: 440,
    prefer,
    avoidHudCluster: true,
    avoidActionBar: hasActionBar,
  });
  const weaponIcon = u.weapon ? getItemIcon(u.weapon.id, u.weapon.type) : '';
  const className = getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—';
  const equippedInv = u.weapon ? u.inventory.find((inv) => inv.itemId === u.weapon!.id) : undefined;
  const weaponUses = equippedInv ? equippedInv.uses : (u.weapon?.maxUses ?? 0);

  return (
    <div
      ref={ref}
      data-testid="hover-banner"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...sharedPanelStyle,
        ...anchorStyle,
        width: 'min(440px, calc(100vw - 32px))',
        zIndex: DS_Z.hover,
        pointerEvents: 'auto',
        padding: '12px 14px',
        borderRadius: DS_RADII.panel,
        fontSize: '13px',
        lineHeight: 1.45,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {/* Column 1: Identity & HP */}
      <div style={{ minWidth: '105px', flexShrink: 0, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 'bold', fontSize: '15px', color: DS_COLORS.text }}>
          {u.unit.name}
        </div>
        <div style={{ color: '#93c5fd', fontSize: '12px' }}>
          {className}
        </div>
        <div style={{ color: DS_COLORS.muted, fontSize: '12px' }}>
          LV {u.level} · EX {u.exp < 100 ? u.exp : '--'}
        </div>
        <div style={{ color: DS_COLORS.hpRemainingText, fontWeight: 'bold', fontSize: '13px', marginTop: '1px' }}>
          HP {u.stats.hp} / {u.stats.maxHp}
        </div>
        {/* Modern 2-color HP gauge */}
        <div
          data-testid="hover-hp-bar"
          style={{
            marginTop: '4px',
            width: '100%',
            height: '5px',
            backgroundColor: '#1e293b',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, (u.stats.hp / Math.max(1, u.stats.maxHp)) * 100))}%`,
              background:
                u.stats.hp / Math.max(1, u.stats.maxHp) > 0.5
                  ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                  : u.stats.hp / Math.max(1, u.stats.maxHp) > 0.25
                    ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                    : 'linear-gradient(90deg, #b91c1c, #ef4444)',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Column 2: Center Portrait Avatar */}
      <div
        style={{
          width: '62px',
          height: '62px',
          flexShrink: 0,
          backgroundColor: DS_COLORS.navyDark,
          borderRadius: '4px',
          border: `1.5px solid ${DS_COLORS.gold}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {u.avatarUrl ? (
          <img
            src={u.avatarUrl}
            alt={u.unit.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={{ fontSize: '24px' }}>👤</span>
        )}
      </div>

      {/* Column 3: Equipped Weapon & Details Action */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '62px', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.weapon?.name ?? 'Unarmed'}
          </span>
          <span style={{ color: DS_COLORS.muted, fontSize: '13px' }}>/{weaponUses}</span>
          {weaponIcon && (
            <img
              src={weaponIcon}
              alt=""
              style={{ width: '18px', height: '18px', imageRendering: 'pixelated', verticalAlign: 'middle', flexShrink: 0 }}
            />
          )}
        </div>

        {u.weapon && (
          <div
            data-testid="hover-combat-preview"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            <span>Mt <strong style={{ color: '#f8fafc' }}>{u.weapon.might ?? '—'}</strong></span>
            <span>Hit <strong style={{ color: '#f8fafc' }}>{u.weapon.hit ?? '—'}%</strong></span>
          </div>
        )}

        {onInspect && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: DS_COLORS.caption }}>Tap for full stats</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              style={{
                ...primaryButtonStyle(),
                padding: '10px 14px',
                fontSize: '13px',
              }}
            >
              Details ℹ️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
