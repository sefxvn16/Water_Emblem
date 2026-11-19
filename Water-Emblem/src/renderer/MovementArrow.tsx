import React from 'react';
import type { Position } from '../core/grid/types';

export interface MovementArrowProps {
  readonly path: readonly Position[] | null;
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly tileSize?: number;
  readonly gap?: number;
  readonly padding?: number;
}

const DEFAULT_TILE_SIZE = 64;
const DEFAULT_GAP = 2;
const DEFAULT_PADDING = 4;

export const MovementArrow: React.FC<MovementArrowProps> = ({
  path,
  boardWidth,
  boardHeight,
  tileSize = DEFAULT_TILE_SIZE,
  gap = DEFAULT_GAP,
  padding = DEFAULT_PADDING,
}) => {
  if (!path || path.length < 2) {
    return null;
  }

  const getCenter = (p: Position) => ({
    x: padding + p.x * (tileSize + gap) + tileSize / 2,
    y: padding + p.y * (tileSize + gap) + tileSize / 2,
  });

  const pts = path.map(getCenter);
  const origin = pts[0];

  if (!origin) {
    return null;
  }

  const pointsStr = pts.map((pt) => `${pt.x},${pt.y}`).join(' ');

  const totalWidth = padding * 2 + boardWidth * tileSize + Math.max(0, boardWidth - 1) * gap;
  const totalHeight = padding * 2 + boardHeight * tileSize + Math.max(0, boardHeight - 1) * gap;

  // Origin node: diameter = 1/3 of the tile width (PLAN item 81).
  const nodeRadius = Number((tileSize / 6).toFixed(2));

  return (
    <svg
      data-testid="movement-arrow-svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${totalWidth}px`,
        height: `${totalHeight}px`,
        pointerEvents: 'none',
        // Above the tile backgrounds, below the unit avatars (overlay z 25).
        zIndex: 1,
      }}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
    >
      {/* 1. Dark underlay for contrast across all terrain types */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#0f172a"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* 2. Thin white solid line */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* 3. Origin node, centered on the start tile */}
      <circle
        cx={origin.x}
        cy={origin.y}
        r={nodeRadius}
        fill="#ffffff"
        fillOpacity="0.9"
        stroke="#0f172a"
        strokeWidth="2"
      />
    </svg>
  );
};
