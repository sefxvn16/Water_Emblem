import type { ExtendedUnitState } from '../data/chapterData';
import type { SeededRNG } from '../combat/rng';
import { awardExperience } from '../progression/experience';

export interface DanceResult {
  readonly dancer: ExtendedUnitState;
  readonly refreshedTarget: ExtendedUnitState;
  readonly updatedUnits: readonly ExtendedUnitState[];
  readonly gainedLevel: boolean;
  readonly message: string;
}

/**
 * Checks whether a dancer can perform for a target unit.
 * Rules:
 * - Dancer classId must be 'dancer' and not dead.
 * - Target must be living, friendly (same faction), different unit, and has already acted.
 * - Distance must be adjacent (1 tile).
 */
export function canDanceFor(
  dancer: ExtendedUnitState,
  target: ExtendedUnitState,
  distance: number,
): boolean {
  if (dancer.unit.isDead || target.unit.isDead) return false;
  if (dancer.unit.classId !== 'dancer') return false;
  if (dancer.unit.faction !== target.unit.faction) return false;
  if (dancer.unit.id === target.unit.id) return false;
  if (!target.unit.hasActed) return false;
  return distance === 1;
}

/**
 * Pure function executing the Dance action.
 * - Refreshes target (hasActed = false).
 * - Flags dancer as acted (hasActed = true).
 * - Awards dance experience to the dancer (default 18 EXP).
 */
export function executeDance(
  dancer: ExtendedUnitState,
  target: ExtendedUnitState,
  allUnits: readonly ExtendedUnitState[],
  expAmount = 18,
  rng?: SeededRNG,
): DanceResult {
  const refreshedTarget: ExtendedUnitState = {
    ...target,
    unit: { ...target.unit, hasActed: false },
  };

  let updatedDancer: ExtendedUnitState = {
    ...dancer,
    unit: { ...dancer.unit, hasActed: true },
  };

  let gainedLevel = false;
  if (rng && expAmount > 0) {
    const award = awardExperience(updatedDancer, expAmount, rng);
    updatedDancer = award.entry;
    gainedLevel = award.gainedLevel;
  } else if (expAmount > 0) {
    updatedDancer = {
      ...updatedDancer,
      exp: Math.min(99, updatedDancer.exp + expAmount),
    };
  }

  const updatedUnits = allUnits.map((u) => {
    if (u.unit.id === target.unit.id) return refreshedTarget;
    if (u.unit.id === dancer.unit.id) return updatedDancer;
    return u;
  });

  const message = `💃 ${dancer.unit.name} dances for ${target.unit.name}!`;

  return {
    dancer: updatedDancer,
    refreshedTarget,
    updatedUnits,
    gainedLevel,
    message,
  };
}
