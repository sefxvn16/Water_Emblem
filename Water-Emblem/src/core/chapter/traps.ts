import type { Position } from '../grid/types';
import type { ChapterTrap, ExtendedUnitState } from '../data/chapterData';

/**
 * Trap tiles (PLAN item 105, V08): a trap triggers once when a unit ends
 * its movement on the trap tile, dealing fixed damage that never reduces
 * HP below 1 [Giả định]. Triggered trap ids are tracked by App and saved.
 * Pure helpers.
 */

export function trapAt(
  traps: readonly ChapterTrap[],
  triggeredTrapIds: ReadonlySet<string>,
  pos: Position,
): ChapterTrap | undefined {
  return traps.find(
    (trap) => !triggeredTrapIds.has(trap.id) && trap.position.x === pos.x && trap.position.y === pos.y,
  );
}

export function applyTrapDamage(
  units: readonly ExtendedUnitState[],
  unitId: string,
  damage: number,
): ExtendedUnitState[] {
  return units.map((entry) => {
    if (entry.unit.id !== unitId || entry.unit.isDead) return entry;
    const hp = Math.max(1, entry.stats.hp - damage);
    return { ...entry, stats: { ...entry.stats, hp } };
  });
}
