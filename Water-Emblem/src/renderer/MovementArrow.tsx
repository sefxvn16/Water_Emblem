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

  // Origin node: outer diameter = 1/3 of the tile width (PLAN item 81).
  // Ring stroke centre sits half the dark underlay width inside that edge.
  const nodeRingRadius = Number((tileSize / 6 - 2.5).toFixed(2));

  const svgBaseStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: `${totalWidth}px`,
    height: `${totalHeight}px`,
    pointerEvents: 'none',
  };

  return (
    <>
      <svg
        data-testid="movement-arrow-svg"
        style={{
          ...svgBaseStyle,
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
      </svg>

      {/* Origin node, centered on the start tile. Rendered above the avatar
          overlay (z 25) so it stays visible — the 42px avatar would otherwise
          cover the 1/3-tile node entirely (PLAN item 83). The line itself
          stays below the avatars (item 78). Hollow ring: outer diameter =
          1/3 of the tile width, portrait stays visible through the centre. */}
      <svg
        data-testid="movement-origin-node"
        style={{ ...svgBaseStyle, zIndex: 26 }}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      >
        <circle
          cx={origin.x}
          cy={origin.y}
          r={nodeRingRadius}
          fill="none"
          stroke="#0f172a"
          strokeWidth="5"
          opacity="0.85"
        />
        <circle
          cx={origin.x}
          cy={origin.y}
          r={nodeRingRadius}
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          opacity="0.9"
        />
      </svg>
    </>
  );
};
