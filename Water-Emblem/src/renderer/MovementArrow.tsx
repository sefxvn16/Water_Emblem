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
        zIndex: 15,
      }}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
    >
      <defs>
        <filter id="fe-arrow-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* 1. Base dark outline for contrast across all terrain types */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#0f172a"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Main cyan/blue tactical shaft */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#fe-arrow-glow)"
      />

      {/* 3. Inner core white highlight */}
      <polyline
        points={pointsStr}
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 6"
      />

      {/* 4. Origin tile anchor dot */}
      <circle
        cx={origin.x}
        cy={origin.y}
        r="6"
        fill="#38bdf8"
        stroke="#0f172a"
        strokeWidth="2.5"
      />

      {/* 5. Destination pulsing indicator ring */}
      <circle
        cx={dest.x}
        cy={dest.y}
        r="26"
        fill="rgba(56, 189, 248, 0.18)"
        stroke="#38bdf8"
        strokeWidth="2.5"
        strokeDasharray="5 3"
      />

      {/* 6. Destination Fire Emblem arrowhead oriented along arrival vector */}
      <g transform={`translate(${dest.x}, ${dest.y}) rotate(${angle})`}>
        {/* Dark outline */}
        <path
          d="M -18,-13 L 8,0 L -18,13 L -10,0 Z"
          fill="#0f172a"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Vibrant cyan fill */}
        <path
          d="M -16,-10 L 6,0 L -16,10 L -8,0 Z"
          fill="#38bdf8"
        />
        {/* White inner accent */}
        <path
          d="M -11,-4 L 1,0 L -11,4 L -5,0 Z"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
};
