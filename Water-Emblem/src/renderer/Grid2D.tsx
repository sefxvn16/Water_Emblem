import React from 'react';
import type { BoardView } from '../core/grid/boardView';
import type { UnitFaction } from '../core/grid/types';
import { TERRAIN_COLORS } from './terrainStyle2d';

export interface UnitDisplay {
  readonly name: string;
  readonly hp: number;
  readonly faction: UnitFaction;
  readonly hasActed: boolean;
}

interface Grid2DProps {
  board: BoardView;
  getUnitDisplay: (unitId: string) => UnitDisplay | undefined;
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number, y: number) => void;
}

const FALLBACK_TERRAIN = { bg: '#333', icon: '' };

export const Grid2D: React.FC<Grid2DProps> = ({ board, getUnitDisplay, onTileClick, onTileHover }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${board.width}, 64px)`,
      gridTemplateRows: `repeat(${board.height}, 64px)`,
      gap: '2px',
      backgroundColor: '#000',
      padding: '4px',
      borderRadius: '4px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      margin: 'auto',
      flexShrink: 0,
    }}
  >
    {board.tiles.map((row) =>
      row.map(({ x, y, key, terrainId, unitId, overlay }) => {
        const terrain = TERRAIN_COLORS[terrainId] ?? FALLBACK_TERRAIN;
        const unit = unitId === null ? undefined : getUnitDisplay(unitId);
        const { reachable, danger, attackTarget, selected } = overlay;
        return (
          <div
            key={key}
            data-testid={`tile-${x}-${y}`}
            onClick={() => onTileClick(x, y)}
            onMouseEnter={() => onTileHover(x, y)}
            style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              backgroundColor: terrain.bg,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              border: selected
                ? '2px solid #FFEB3B'
                : attackTarget
                ? '2px solid #FF1744'
                : '1px solid rgba(255,255,255,0.05)',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
            }}
          >
            {danger && !reachable && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(239, 83, 80, 0.25)', pointerEvents: 'none' }} />
            )}
            {reachable && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(33, 150, 243, 0.45)',
                  border: '1px dashed #90CAF9',
                  pointerEvents: 'none',
                }}
              />
            )}
            {attackTarget && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255, 23, 68, 0.35)', pointerEvents: 'none' }} />
            )}

            <span style={{ fontSize: '18px', opacity: 0.7, zIndex: 1 }}>{terrain.icon}</span>

            {unit && (
              <div
                style={{
                  zIndex: 2,
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#fff',
                  backgroundColor: unit.hasActed ? '#616161' : unit.faction === 'player' ? '#1E88E5' : '#E53935',
                  border: selected ? '2px solid #FFEB3B' : '2px solid rgba(0,0,0,0.4)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                }}
              >
                <div>{unit.name.substring(0, 3)}</div>
                <div style={{ fontSize: '9px', opacity: 0.9 }}>HP:{unit.hp}</div>
              </div>
            )}

            <span
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '3px',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.4)',
                zIndex: 1,
              }}
            >
              {x},{y}
            </span>
          </div>
        );
      }),
    )}
  </div>
);
