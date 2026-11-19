import type { CombatResult } from './types';
import type { ExtendedUnitState } from '../data/chapterData';
import type { WeaponRank } from '../grid/types';
import balanceConfig from '../../../data/balance.json';

/**
 * Weapon experience (PLAN item 90; FE5 rules in Game_Design/battle.md
 * "Rank vũ khí (WEx)"): 1 WEx per strike that hits, thresholds
 * E→D 50, D→C 100, C→B 150, B→A 200. This game's ranks cap at A (no
 * S/★ weapons in data). Staff WEx per use by staff rank is a [Giả định]
 * within the researched FE5 range of 1–10. Thresholds are declared in
 * data/balance.json (PLAN item 134).
 *
 * Pure helpers: inputs are not mutated.
 */
export const WEX_THRESHOLDS: Partial<Record<WeaponRank, number>> = balanceConfig.weaponExp.thresholds;

export const STAFF_WEX_BY_RANK: Record<WeaponRank, number> = balanceConfig.weaponExp.staffWexByRank;

const RANK_ORDER: WeaponRank[] = ['E', 'D', 'C', 'B', 'A'];

/** Add WEx toward the next rank of `weaponType`; ranks up when a threshold is met. */
export function gainWeaponExp(
  entry: ExtendedUnitState,
  weaponType: string,
  amount: number,
): ExtendedUnitState {
  if (amount <= 0) return entry;
  const ranks = { ...(entry.unit.weaponRanks ?? {}) };
  const progress = { ...(entry.unit.weaponExp ?? {}) };
  let rank: WeaponRank = ranks[weaponType] ?? 'E';
  let points = (progress[weaponType] ?? 0) + amount;
  let threshold = WEX_THRESHOLDS[rank];
  while (threshold !== undefined && points >= threshold) {
    points -= threshold;
    rank = RANK_ORDER[RANK_ORDER.indexOf(rank) + 1] ?? rank;
    threshold = WEX_THRESHOLDS[rank];
  }
  ranks[weaponType] = rank;
  progress[weaponType] = rank === 'A' ? 0 : points;
  return { ...entry, unit: { ...entry.unit, weaponRanks: ranks, weaponExp: progress } };
}

/** Award 1 WEx per landed strike to the weapon type used in the combat. */
export function applyCombatWeaponExp(
  units: readonly ExtendedUnitState[],
  result: CombatResult,
): ExtendedUnitState[] {
  const sides = [result.forecast.attacker, result.forecast.defender];
  return units.map((entry) => {
    const side = sides.find((candidate) => candidate.unit.id === entry.unit.id);
    if (!side?.weapon) return entry;
    const hits = result.events.filter(
      (event) => event.attackerId === entry.unit.id && event.isHit,
    ).length;
    return hits > 0 ? gainWeaponExp(entry, side.weapon.type, hits) : entry;
  });
}
