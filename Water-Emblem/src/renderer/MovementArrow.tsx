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
  const dest = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const origin = pts[0];

  if (!dest || !prev || !origin) {
    return null;
  }

  const pointsStr = pts.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const angle = Math.atan2(dest.y - prev.y, dest.x - prev.x) * (180 / Math.PI);

  const totalWidth = padding * 2 + boardWidth * tileSize + Math.max(0, boardWidth - 1) * gap;
  const totalHeight = padding * 2 + boardHeight * tileSize + Math.max(0, boardHeight - 1) * gap;

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
      {/* 1. Base dark outline for contrast across all terrain types */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#0f172a"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* 2. Main white shaft: thick, solid, slightly transparent */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#ffffff"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />

      {/* 3. Origin tile anchor dot */}
      <circle
        cx={origin.x}
        cy={origin.y}
        r="6"
        fill="#ffffff"
        fillOpacity="0.85"
        stroke="#0f172a"
        strokeWidth="2.5"
      />

      {/* 4. Destination indicator ring */}
      <circle
        cx={dest.x}
        cy={dest.y}
        r="26"
        fill="rgba(255, 255, 255, 0.15)"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="2.5"
      />

      {/* 5. Destination arrowhead: bold block triangle (reference shape),
          oriented along the arrival vector */}
      <g transform={`translate(${dest.x}, ${dest.y}) rotate(${angle})`}>
        <path
          d="M 20,0 L -14,-22 L -7,0 L -14,22 Z"
          fill="#ffffff"
          fillOpacity="0.85"
          stroke="#0f172a"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
