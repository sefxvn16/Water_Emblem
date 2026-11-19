import { calculateMovementRange, PathfindingContext } from './pathfinding';
import type { GridUnit, Position } from './types';

/**
 * One unit's threat inputs for the enemy-range display (PLAN item 145):
 * the unit, its weapon reach, and whether it stays on its own tile.
 */
export interface ThreatSource {
  readonly unit: GridUnit;
  readonly attackRange: { min: number; max: number };
  /** Stationary AI role: threatens only from its current tile. */
  readonly stationary: boolean;
}

function tileKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

/**
 * Tiles a unit can attack on its next phase: every tile within weapon range
 * of any tile it can move to — the Fire Emblem enemy-range display. A
 * stationary unit threatens only from its current tile. Pure: reads the
 * movement range through the shared pathfinding context, mutates nothing.
 */
export function computeUnitThreatKeys(source: ThreatSource, context: PathfindingContext): Set<string> {
  const { unit, attackRange, stationary } = source;
  const threat = new Set<string>();
  if (attackRange.max <= 0) return threat;

  const candidateTiles = stationary
    ? [unit.position]
    : Array.from(calculateMovementRange(unit, context).values(), ({ position }) => position);

  const { map } = context;
  for (const tile of candidateTiles) {
    for (let dx = -attackRange.max; dx <= attackRange.max; dx++) {
      for (let dy = -attackRange.max; dy <= attackRange.max; dy++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist < attackRange.min || dist > attackRange.max) continue;
        const nx = tile.x + dx;
        const ny = tile.y + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          threat.add(tileKey({ x: nx, y: ny }));
        }
      }
    }
  }
  return threat;
}

/** Combined danger zone: the union of every source's threat tiles. */
export function computeCombinedThreatKeys(
  sources: readonly ThreatSource[],
  context: PathfindingContext,
): Set<string> {
  const danger = new Set<string>();
  for (const source of sources) {
    for (const key of computeUnitThreatKeys(source, context)) danger.add(key);
  }
  return danger;
}
