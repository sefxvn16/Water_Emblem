import React from 'react';
import type { Position } from '../core/grid/types';
import { defaultTerrainRegistry } from '../core/grid/terrain';
import { DS_COLORS, DS_RADII, DS_Z, sharedPanelStyle } from './designSystem';
import { getTileRect } from './tileAnchor';
import { useAnchoredOverlay, type OverlayCorner } from './overlayAnchor';

interface TerrainInfoWindowProps {
  terrainId: string;
  tile: Position;
}

/** FE3-style terrain info popup: compact box showing terrain name and avoid bonus (Image 2). */
export const TerrainInfoWindow: React.FC<TerrainInfoWindowProps> = ({ terrainId, tile }) => {
  const terrain = defaultTerrainRegistry.get(terrainId);
  // Same side rule as the hover banner; flips when the map scrolls or resizes.
  const rect = getTileRect(tile);
  const tileCenterX = rect ? (rect.left + rect.right) / 2 : null;
  const prefer: OverlayCorner =
    tileCenterX === null || typeof window === 'undefined' || tileCenterX >= window.innerWidth / 2
      ? 'bottom-left'
      : 'bottom-right';
  const { ref, style: anchorStyle } = useAnchoredOverlay({
    tile,
    width: 160,
    prefer,
    avoidHudCluster: true,
  });

  if (!terrain) return null;

  return (
    <div
      ref={ref}
      data-testid="terrain-window"
      role="status"
      aria-label={`Terrain: ${terrain.name}, Avoid: ${terrain.avoidBonus}%`}
      style={{
        ...sharedPanelStyle,
        ...anchorStyle,
        minWidth: '120px',
        zIndex: DS_Z.hover,
        pointerEvents: 'none',
        padding: '12px',
        borderRadius: DS_RADII.panel,
        fontSize: '13px',
        lineHeight: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '15px', color: DS_COLORS.text }}>
        {terrain.name}
      </div>
      <div style={{ color: DS_COLORS.goldText, fontSize: '13px' }}>
        {`Avoid : ${terrain.avoidBonus}%`}{terrain.defenseBonus > 0 ? ` · Def : +${terrain.defenseBonus}` : ''}
      </div>
    </div>
  );
};
