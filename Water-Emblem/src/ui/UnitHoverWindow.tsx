import React from 'react';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { Position } from '../core/grid/types';
import { HUD_EDGE } from './BattleSettingsMenu';
import { HUD_CLEAR_BOTTOM, getTileRect } from './tileAnchor';
import { getItemIcon } from './itemIcon';

interface UnitHoverWindowProps {
  unit: ExtendedUnitState;
  tile: Position;
  onInspect?: () => void;
}

/** Basic unit info popup: horizontal banner matching FE3 layout (Image 4). */
export const UnitHoverWindow: React.FC<UnitHoverWindowProps> = ({ unit: u, tile, onInspect }) => {
  const rect = getTileRect(tile);
  const tileCenterX = rect ? (rect.left + rect.right) / 2 : null;
  const onLeft = tileCenterX === null || typeof window === 'undefined' || tileCenterX >= window.innerWidth / 2;
  const weaponIcon = getItemIcon(u.weapon.id, u.weapon.type);
  const className = getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—';
  const equippedInv = u.inventory.find((inv) => inv.itemId === u.weapon.id);
  const weaponUses = equippedInv ? equippedInv.uses : (u.weapon.maxUses ?? 40);

  return (
    <div
      onClick={onInspect}
      role="button"
      tabIndex={0}
      aria-label={`${u.unit.name} summary. Tap or click for full details.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect?.();
        }
      }}
      style={{
        position: 'fixed',
        ...(onLeft ? { left: '16px', bottom: '16px' } : { right: `${HUD_EDGE}px`, bottom: `${HUD_CLEAR_BOTTOM}px` }),
        width: 'min(440px, calc(100vw - 32px))',
        boxSizing: 'border-box',
        zIndex: 800,
        pointerEvents: 'auto',
        cursor: onInspect ? 'pointer' : 'default',
        padding: '10px 14px',
        backgroundColor: '#0c1e5b',
        borderRadius: '6px',
        border: '2px solid #eab308',
        boxShadow: '0 6px 20px rgba(0,0,0,0.7)',
        color: '#ffffff',
        fontSize: '13px',
        lineHeight: 1.45,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      {/* Column 1: Identity & HP */}
      <div style={{ minWidth: '105px', flexShrink: 0, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#ffffff' }}>
          {u.unit.name}
        </div>
        <div style={{ color: '#93c5fd', fontSize: '12px' }}>
          {className}
        </div>
        <div style={{ color: '#cbd5e1', fontSize: '12px' }}>
          LV {u.level} · EX {u.exp < 100 ? u.exp : '--'}
        </div>
        <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '13px', marginTop: '1px' }}>
          HP {u.stats.hp} / {u.stats.maxHp}
        </div>
      </div>

      {/* Column 2: Center Portrait Avatar */}
      <div
        style={{
          width: '62px',
          height: '62px',
          flexShrink: 0,
          backgroundColor: '#07123d',
          borderRadius: '4px',
          border: '1.5px solid #eab308',
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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '62px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.weapon.name}
          </span>
          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>/{weaponUses}</span>
          <img
            src={weaponIcon}
            alt=""
            style={{ width: '18px', height: '18px', imageRendering: 'pixelated', verticalAlign: 'middle', flexShrink: 0 }}
          />
        </div>

        {onInspect && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Tap for full stats</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #eab308',
                color: '#fde047',
                borderRadius: '3px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: 1.3,
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
