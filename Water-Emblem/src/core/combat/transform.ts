import type { ExtendedUnitState } from '../data/chapterData';
import type { ItemDefinition, UnitCombatStats } from './types';
import { getClassDefinition } from '../class/classRules';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };

/**
 * Manakete transformation (PLAN item 121, A13) and Xane imitation
 * (PLAN item 124, A16). Pure helpers; App ticks them at player-phase
 * start.
 *
 * Transform (owner decision A13): no dragonstone needed; lasts 5 turns
 * (+1 when Luck >= 15 [Giả định]), then a 2-turn cooldown. While
 * transformed: +5 Str/Def/Res, +3 Spd [Giả định] and the Dragon Breath
 * weapon is equipped.
 *
 * Imitate: copies an ally's stats and weapon for 5 turns [Giả định],
 * then reverts to the saved backup.
 *
 * PLAN item 134: durations, thresholds and bonuses are declared in
 * data/balance.json; which classes transform/imitate and the transform
 * weapon are declared in data/classes.json.
 */

export const TRANSFORM_TURNS: number = balanceConfig.transform.turns;
export const TRANSFORM_LUCK_THRESHOLD: number = balanceConfig.transform.luckThreshold;
export const TRANSFORM_COOLDOWN: number = balanceConfig.transform.cooldown;
export const IMITATE_TURNS: number = balanceConfig.imitate.turns;

const TRANSFORM_BONUS: Partial<Record<keyof UnitCombatStats, number>> = balanceConfig.transform.statBonus;

function applyBonus(stats: UnitCombatStats, sign: 1 | -1): UnitCombatStats {
  const next = { ...stats };
  for (const [key, bonus] of Object.entries(TRANSFORM_BONUS)) {
    const statKey = key as keyof UnitCombatStats;
    (next as Record<string, number>)[statKey] = (next[statKey] as number) + sign * (bonus ?? 0);
  }
  return next;
}

export function canTransform(entry: ExtendedUnitState): boolean {
  return getClassDefinition(entry.unit.classId)?.canTransform === true
    && !entry.unit.isDead
    && (entry.unit.transformTurns ?? 0) <= 0
    && (entry.unit.transformCooldown ?? 0) <= 0;
}

export function transformUnit(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState | null {
  if (!canTransform(entry)) return null;
  const breathId = getClassDefinition(entry.unit.classId)?.transformWeaponId;
  const breath = breathId ? itemById.get(breathId) : undefined;
  if (!breath || !breathId) return null;
  const turns = TRANSFORM_TURNS + (entry.stats.lck >= TRANSFORM_LUCK_THRESHOLD ? balanceConfig.transform.luckBonusTurns : 0);
  const hasBreath = entry.inventory.some((item) => item.itemId === breathId);
  return {
    ...entry,
    stats: applyBonus(entry.stats, 1),
    weapon: breath,
    inventory: hasBreath ? entry.inventory : [...entry.inventory, { itemId: breathId, uses: breath.maxUses }],
    unit: { ...entry.unit, transformTurns: turns },
  };
}

export function revertTransform(entry: ExtendedUnitState): ExtendedUnitState {
  if ((entry.unit.transformTurns ?? 0) <= 0) return entry;
  return {
    ...entry,
    stats: applyBonus(entry.stats, -1),
    unit: { ...entry.unit, transformTurns: 0, transformCooldown: TRANSFORM_COOLDOWN },
  };
}

export function imitateUnit(
  entry: ExtendedUnitState,
  target: ExtendedUnitState,
): ExtendedUnitState | null {
  if (getClassDefinition(entry.unit.classId)?.canImitate !== true || entry.unit.isDead || target.unit.isDead) return null;
  if ((entry.unit.imitateTurns ?? 0) > 0) return null;
  return {
    ...entry,
    stats: { ...target.stats, hp: Math.min(entry.stats.hp, target.stats.maxHp) },
    weapon: target.weapon,
    imitateBackup: { stats: entry.stats, ...(entry.weapon ? { weaponId: entry.weapon.id } : {}) },
    unit: { ...entry.unit, imitateTurns: IMITATE_TURNS },
  };
}

export function revertImitate(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState {
  if ((entry.unit.imitateTurns ?? 0) <= 0 || !entry.imitateBackup) return entry;
  const backup = entry.imitateBackup;
  const weapon = backup.weaponId ? itemById.get(backup.weaponId) : undefined;
  return {
    ...entry,
    stats: { ...backup.stats, hp: Math.min(entry.stats.hp, backup.stats.maxHp) },
    weapon,
    imitateBackup: undefined,
    unit: { ...entry.unit, imitateTurns: 0 },
  };
}

export interface SpecialStateEvent {
  unitId: string;
  unitName: string;
  kind: 'transform_end' | 'imitate_end';
}

/** Ticks transformation/imitation timers by one turn (phase start). */
export function tickSpecialStates(
  units: readonly ExtendedUnitState[],
  itemById: ReadonlyMap<string, ItemDefinition>,
): { units: ExtendedUnitState[]; events: SpecialStateEvent[] } {
  const events: SpecialStateEvent[] = [];
  const next = units.map((entry) => {
    if (entry.unit.isDead) return entry;
    let updated = entry;
    const transformTurns = updated.unit.transformTurns ?? 0;
    if (transformTurns > 0) {
      if (transformTurns - 1 <= 0) {
        updated = revertTransform(updated);
        events.push({ unitId: entry.unit.id, unitName: entry.unit.name, kind: 'transform_end' });
      } else {
        updated = { ...updated, unit: { ...updated.unit, transformTurns: transformTurns - 1 } };
      }
    } else if ((updated.unit.transformCooldown ?? 0) > 0) {
      updated = { ...updated, unit: { ...updated.unit, transformCooldown: (updated.unit.transformCooldown ?? 0) - 1 } };
    }
    const imitateTurns = updated.unit.imitateTurns ?? 0;
    if (imitateTurns > 0) {
      if (imitateTurns - 1 <= 0) {
        updated = revertImitate(updated, itemById);
        events.push({ unitId: entry.unit.id, unitName: entry.unit.name, kind: 'imitate_end' });
      } else {
        updated = { ...updated, unit: { ...updated.unit, imitateTurns: imitateTurns - 1 } };
      }
    }
    return updated;
  });
  return { units: next, events };
}
