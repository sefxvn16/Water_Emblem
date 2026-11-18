import React from 'react';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { HUD_EDGE } from './BattleSettingsMenu';
import { HUD_CLEAR_BOTTOM, getTileRect } from './tileAnchor';

interface TerrainInfoWindowProps {
  terrainId: string;
  tile: Position;
}

/** FE3-style terrain info popup: compact box showing terrain name and avoid bonus (Image 2). */
export const TerrainInfoWindow: React.FC<TerrainInfoWindowProps> = ({ terrainId, tile }) => {
  const terrain = defaultTerrainRegistry.get(terrainId);
  const rect = getTileRect(tile);
  const tileCenterX = rect ? (rect.left + rect.right) / 2 : null;
  const onLeft = tileCenterX === null || typeof window === 'undefined' || tileCenterX >= window.innerWidth / 2;

  if (!terrain) return null;

  return (
    <div
      role="status"
      aria-label={`Terrain: ${terrain.name}, Avoid: ${terrain.avoidBonus}%`}
      style={{
        position: 'fixed',
        ...(onLeft ? { left: '16px', bottom: '16px' } : { right: `${HUD_EDGE}px`, bottom: `${HUD_CLEAR_BOTTOM}px` }),
        minWidth: '120px',
        boxSizing: 'border-box',
        zIndex: 800,
        pointerEvents: 'none',
        padding: '8px 12px',
        backgroundColor: '#0c1e5b',
        borderRadius: '6px',
        border: '2px solid #eab308',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        color: '#ffffff',
        fontSize: '13px',
        lineHeight: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ffffff' }}>
        {terrain.name}
      </div>
      <div style={{ color: '#fde047', fontSize: '13px' }}>
        {`Avoid : ${terrain.avoidBonus}%`}{terrain.defenseBonus > 0 ? ` · Def : +${terrain.defenseBonus}` : ''}
      </div>
    </div>
  );
};
