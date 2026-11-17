import React from 'react';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { HUD_EDGE } from './BattleSettingsMenu';
import { HUD_CLEAR_BOTTOM, getTileRect } from './tileAnchor';

interface UnitHoverWindowProps {
  unit: ExtendedUnitState;
  terrainId: string;
  tile: Position;
}

/** Compact hover window (FE3 unit info panel): sits on the side of the screen opposite the hovered tile. */
export const UnitHoverWindow: React.FC<UnitHoverWindowProps> = ({ unit: u, terrainId, tile }) => {
  const rect = getTileRect(tile);
  const tileCenterX = rect ? (rect.left + rect.right) / 2 : null;
  const terrain = defaultTerrainRegistry.get(terrainId);
  const onLeft = tileCenterX === null || tileCenterX >= window.innerWidth / 2;
  const player = u.unit.faction === 'player';
  return (
    <div
      style={{
        position: 'fixed',
        ...(onLeft ? { left: '16px', bottom: '16px' } : { right: `${HUD_EDGE}px`, bottom: `${HUD_CLEAR_BOTTOM}px` }),
        width: '260px',
        boxSizing: 'border-box',
        zIndex: 800,
        pointerEvents: 'none',
        display: 'flex',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        border: `1px solid ${player ? '#42a5f5' : '#ef5350'}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        fontSize: '12px',
        lineHeight: 1.5,
        color: '#e5e7eb',
      }}
    >
      {u.avatarUrl && (
        <img
          src={u.avatarUrl}
          alt={u.unit.name}
          style={{ width: '56px', height: '56px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0, backgroundColor: '#0f172a' }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{u.unit.name}</div>
        <div>{getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—'} · LV {u.level}</div>
        <div>HP {u.stats.hp} / {u.stats.maxHp}</div>
        <div>{u.weapon.name}</div>
        {terrain && (
          <div style={{ color: '#86efac' }}>
            {terrain.name} ({tile.x}, {tile.y}) · Avo +{terrain.avoidBonus}% · Def +{terrain.defenseBonus}
          </div>
        )}
      </div>
    </div>
  );
};
