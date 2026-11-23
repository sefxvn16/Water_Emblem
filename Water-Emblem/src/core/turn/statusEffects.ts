import type { ExtendedUnitState } from '../data/chapterData';
import type { StatusEffect } from '../combat/types';

export interface StatusEffectTickEvent {
  readonly unitId: string;
  readonly effectType: 'barrier' | 'silence';
  readonly kind: 'decay' | 'expire';
  readonly value: number;
}

export interface StatusEffectTickResult {
  readonly units: ExtendedUnitState[];
  readonly events: readonly StatusEffectTickEvent[];
}

/**
 * Ticks turn-based status effects at the start of a phase for units belonging
 * to `activePhaseFaction` (PLAN item 209).
 *
 * Rules:
 * - Only living units of `activePhaseFaction` are ticked.
 * - Barrier: duration - 1, value - 1, stats.res - 1. When duration <= 0 or value <= 0,
 *   the effect is removed and any leftover bonus is cleanly restored.
 * - Silence: duration - 1. When duration <= 0, the effect is removed.
 * - Pure function: inputs are never mutated.
 */
export function tickStatusEffects(
  units: readonly ExtendedUnitState[],
  activePhaseFaction: 'player' | 'enemy',
): StatusEffectTickResult {
  const events: StatusEffectTickEvent[] = [];

  const updatedUnits = units.map((entry) => {
    if (entry.unit.isDead || entry.unit.faction !== activePhaseFaction) {
      return entry;
    }
    const currentEffects = entry.statusEffects;
    if (!currentEffects || currentEffects.length === 0) {
      return entry;
    }

    let currentRes = entry.stats.res;
    const remainingEffects: StatusEffect[] = [];

    for (const effect of currentEffects) {
      if (effect.type === 'barrier') {
        const nextDuration = effect.duration - 1;
        const nextValue = effect.value - 1;
        currentRes = Math.max(0, currentRes - 1);

        if (nextDuration > 0 && nextValue > 0) {
          remainingEffects.push({
            type: 'barrier',
            value: nextValue,
            duration: nextDuration,
          });
          events.push({
            unitId: entry.unit.id,
            effectType: 'barrier',
            kind: 'decay',
            value: nextValue,
          });
        } else {
          // If there was any remaining value > 1 when duration ended, ensure it's subtracted
          if (nextValue > 0) {
            currentRes = Math.max(0, currentRes - nextValue);
          }
          events.push({
            unitId: entry.unit.id,
            effectType: 'barrier',
            kind: 'expire',
            value: 0,
          });
        }
      } else if (effect.type === 'silence') {
        const nextDuration = effect.duration - 1;
        if (nextDuration > 0) {
          remainingEffects.push({
            type: 'silence',
            value: effect.value,
            duration: nextDuration,
          });
          events.push({
            unitId: entry.unit.id,
            effectType: 'silence',
            kind: 'decay',
            value: effect.value,
          });
        } else {
          events.push({
            unitId: entry.unit.id,
            effectType: 'silence',
            kind: 'expire',
            value: 0,
          });
        }
      } else {
        remainingEffects.push(effect);
      }
    }

    return {
      ...entry,
      stats: {
        ...entry.stats,
        res: currentRes,
      },
      statusEffects: remainingEffects,
    };
  });

  return {
    units: updatedUnits,
    events,
  };
}
