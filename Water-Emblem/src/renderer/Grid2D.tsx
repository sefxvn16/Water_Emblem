import React, { useRef } from 'react';
import type { BoardView } from '../core/grid/boardView';
import { getFactionTone } from '../core/grid/factionTones';
import type { Position, UnitFaction } from '../core/grid/types';
import { TERRAIN_COLORS } from './terrainStyle2d';
import { MovementArrow } from './MovementArrow';

export interface UnitDisplay {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly faction: UnitFaction;
  readonly hasActed: boolean;
  readonly avatarUrl?: string;
  /** Display-only origin marker (PLAN item 79): reinforcement tone when true. */
  readonly isReinforcement?: boolean;
}

interface Grid2DProps {
  board: BoardView;
  movementPath?: readonly Position[] | null;
  pendingDestination?: Position | null;
  activeMovingUnit?: { unitId: string; pos: Position } | null;
  getUnitDisplay: (unitId: string) => UnitDisplay | undefined;
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number, y: number) => void;
  /** Right-click or ~500 ms touch hold on a tile. */
  onTileInspect?: (x: number, y: number) => void;
}

const LONG_PRESS_MS = 500;
const FALLBACK_TERRAIN = { bg: '#333', icon: '' };

/** Avatar + HP bar for one unit. Stationary units render in the overlay layer
    above the movement arrow; the traveling unit renders at its animated
    position — so the arrow never covers a unit. */
const UnitToken: React.FC<{ unit: UnitDisplay; selected: boolean; traveling: boolean }> = ({
  unit,
  selected,
  traveling,
}) => {
  const hpRatio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
  const hpColor = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
  const tone = getFactionTone(unit.faction, unit.isReinforcement);
  const avatarBg = !traveling && unit.hasActed ? '#4b5563' : tone.tokenBg;
  const avatarBorder = traveling
    ? `2px solid ${tone.tokenBorder}`
    : selected
      ? '2px solid #FFEB3B'
      : unit.hasActed
        ? '2px solid #6b7280'
        : `2px solid ${tone.tokenBorder}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        pointerEvents: 'none',
      }}
    >
      {/* Character Avatar */}
      <div
        style={{
          width: '42px',
          height: '42px',
          boxSizing: 'border-box',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: avatarBg,
          border: avatarBorder,
          boxShadow: selected
            ? '0 0 8px #facc15'
            : traveling
              ? '0 4px 12px rgba(0,0,0,0.7)'
              : '0 2px 6px rgba(0,0,0,0.6)',
          filter: !traveling && unit.hasActed ? 'grayscale(90%) opacity(0.65)' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {unit.avatarUrl ? (
          <img
            src={unit.avatarUrl}
            alt={unit.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>
            {unit.name.substring(0, 3)}
          </div>
        )}
      </div>

      {/* HP Bar */}
      <div
        style={{
          width: '46px',
          height: '10px',
          boxSizing: 'border-box',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(0, 0, 0, 0.95)',
          borderRadius: '2px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, hpRatio * 100))}%`,
            backgroundColor: hpColor,
            transition: 'width 0.2s ease',
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8.5px',
            fontWeight: 'bold',
            lineHeight: 1,
            color: '#ffffff',
            textShadow: '0 0 2px #000, 1px 1px 1px #000',
            letterSpacing: '-0.3px',
            userSelect: 'none',
          }}
        >
          {`${unit.hp}/${unit.maxHp}`}
        </span>
      </div>
    </div>
  );
};

export const Grid2D: React.FC<Grid2DProps> = ({
  board,
  movementPath,
  pendingDestination,
  activeMovingUnit,
  getUnitDisplay,
  onTileClick,
  onTileHover,
  onTileInspect,
}) => {
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const cancelPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <div
      style={{
        position: 'relative',
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
      {/* 1. Tactical movement path arrow */}
      <MovementArrow
        path={movementPath ?? null}
        boardWidth={board.width}
        boardHeight={board.height}
      />

      {/* 2. Map tiles */}
      {board.tiles.map((row) =>
        row.map(({ x, y, key, terrainId, unitId, overlay }) => {
          const terrain = TERRAIN_COLORS[terrainId] ?? FALLBACK_TERRAIN;
          const unit = unitId === null ? undefined : getUnitDisplay(unitId);
          const isPendingDest = pendingDestination && pendingDestination.x === x && pendingDestination.y === y;
          const { reachable, danger, attackTarget, selected, inspected } = overlay;

          return (
            <div
              key={key}
              data-testid={`tile-${x}-${y}`}
              data-attack-target={attackTarget ? 'true' : undefined}
              data-inspected={inspected ? 'true' : undefined}
              data-pending-dest={isPendingDest ? 'true' : undefined}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                onTileHover(x, y);
                onTileClick(x, y);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                onTileInspect?.(x, y);
              }}
              onTouchStart={() => {
                longPressed.current = false;
                cancelPress();
                pressTimer.current = window.setTimeout(() => {
                  pressTimer.current = null;
                  longPressed.current = true;
                  onTileInspect?.(x, y);
                }, LONG_PRESS_MS);
              }}
              onTouchMove={cancelPress}
              onTouchEnd={(event) => {
                cancelPress();
                if (longPressed.current && event.cancelable) event.preventDefault();
              }}
              onTouchCancel={cancelPress}
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
                  : inspected
                  ? '3px solid #EF5350'
                  : isPendingDest
                  ? '2px dashed #38bdf8'
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
              {isPendingDest && !unit && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(56, 189, 248, 0.22)', pointerEvents: 'none' }} />
              )}

              <span style={{ fontSize: '18px', opacity: 0.7, zIndex: 1 }}>{terrain.icon}</span>

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

      {/* 3. Stationary unit avatars: a separate layer above the movement
          arrow (z 1), so the arrow never covers a unit. Pointer-events none
          so tile clicks pass through to the tiles below. */}
      {board.tiles.flatMap((row) =>
        row.map(({ x, y, unitId, overlay }) => {
          if (unitId === null) return null;
          if (activeMovingUnit && unitId === activeMovingUnit.unitId) return null;
          const unit = getUnitDisplay(unitId);
          if (!unit) return null;
          return (
            <div
              key={`unit-token-${unitId}`}
              data-testid={`unit-token-${unitId}`}
              style={{
                position: 'absolute',
                left: `${4 + x * 66 + 32}px`,
                top: `${4 + y * 66 + 32}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
                pointerEvents: 'none',
              }}
            >
              <UnitToken unit={unit} selected={overlay.selected} traveling={false} />
            </div>
          );
        }),
      )}

      {/* 4. Traveling unit avatar with smooth position transition */}
      {activeMovingUnit && (() => {
        const unit = getUnitDisplay(activeMovingUnit.unitId);
        if (!unit) return null;
        const center = {
          x: 4 + activeMovingUnit.pos.x * 66 + 32,
          y: 4 + activeMovingUnit.pos.y * 66 + 32,
        };

        return (
          <div
            data-testid="moving-unit-avatar"
            style={{
              position: 'absolute',
              left: `${center.x}px`,
              top: `${center.y}px`,
              transform: 'translate(-50%, -50%)',
              transition: 'left 60ms linear, top 60ms linear',
              zIndex: 25,
              pointerEvents: 'none',
            }}
          >
            <UnitToken unit={unit} selected={false} traveling />
          </div>
        );
      })()}
    </div>
  );
};
