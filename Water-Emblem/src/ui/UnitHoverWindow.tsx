import React from 'react';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { HUD_EDGE } from './BattleSettingsMenu';
import { HUD_CLEAR_BOTTOM, getTileRect } from './tileAnchor';
import { getItemIcon } from './itemIcon';

interface UnitHoverWindowProps {
  unit: ExtendedUnitState;
  terrainId: string;
  tile: Position;
  onInspect?: () => void;
}

/** Compact hover window: sits on the side opposite the hovered tile. */
export const UnitHoverWindow: React.FC<UnitHoverWindowProps> = ({ unit: u, terrainId, tile, onInspect }) => {
  const rect = getTileRect(tile);
  const tileCenterX = rect ? (rect.left + rect.right) / 2 : null;
  const terrain = defaultTerrainRegistry.get(terrainId);
  const onLeft = tileCenterX === null || typeof window === 'undefined' || tileCenterX >= window.innerWidth / 2;
  const player = u.unit.faction === 'player';
  const weaponIcon = getItemIcon(u.weapon.id, u.weapon.type);

  return (
    <div
      onClick={onInspect}
      role="button"
      tabIndex={0}
      aria-label={`${u.unit.name} summary. Click or tap for full details.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect?.();
        }
      }}
      style={{
        position: 'fixed',
        ...(onLeft ? { left: '16px', bottom: '16px' } : { right: `${HUD_EDGE}px`, bottom: `${HUD_CLEAR_BOTTOM}px` }),
        width: '280px',
        boxSizing: 'border-box',
        zIndex: 800,
        pointerEvents: 'auto',
        cursor: onInspect ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 12px',
        backgroundColor: '#1b1b22',
        borderRadius: '8px',
        border: `1px solid ${player ? '#3b82f6' : '#ef4444'}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '12px',
        lineHeight: 1.45,
        color: '#e5e7eb',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {u.avatarUrl && (
          <img
            src={u.avatarUrl}
            alt={u.unit.name}
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '6px',
              objectFit: 'cover',
              flexShrink: 0,
              backgroundColor: '#0f172a',
              border: `1.5px solid ${player ? '#3b82f6' : '#ef4444'}`,
            }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>
            {u.unit.name}
          </div>
          <div style={{ color: '#93c5fd' }}>
            {getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—'} · LV {u.level}
          </div>
          <div style={{ color: '#4ade80', fontWeight: 'bold' }}>
            HP {u.stats.hp} / {u.stats.maxHp}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <img src={weaponIcon} alt="" style={{ width: '14px', height: '14px', imageRendering: 'pixelated' }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.weapon.name}</span>
          </div>
        </div>
      </div>

      {terrain && (
        <div style={{ color: '#86efac', fontSize: '11px', borderTop: '1px solid #27272a', paddingTop: '4px' }}>
          {terrain.name} ({tile.x}, {tile.y}) · Avo +{terrain.avoidBonus}% · Def +{terrain.defenseBonus}
        </div>
      )}

      {onInspect && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', borderTop: '1px solid #27272a', paddingTop: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Tap or hold to inspect</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect();
            }}
            style={{
              backgroundColor: '#27272e',
              border: '1px solid #3f3f46',
              color: '#f3f4f6',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              lineHeight: 1.4,
            }}
          >
            Details ℹ️
          </button>
        </div>
      )}
    </div>
  );
};
