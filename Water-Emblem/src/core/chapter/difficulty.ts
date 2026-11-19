import type { ExtendedUnitState } from '../data/chapterData';

/**
 * Difficulty levels (PLAN item 115, Q04). Chosen for a playthrough and
 * stored in the save; enemy units receive flat stat bonuses when a
 * chapter is loaded [Giả định]: Hard +4 HP / +2 all other stats,
 * Lunatic +8 HP / +4 all other stats.
 */

export type Difficulty = 'normal' | 'hard' | 'lunatic';

export const DIFFICULTIES: readonly Difficulty[] = ['normal', 'hard', 'lunatic'];

const BONUS: Record<Difficulty, { hp: number; stat: number }> = {
  normal: { hp: 0, stat: 0 },
  hard: { hp: 4, stat: 2 },
  lunatic: { hp: 8, stat: 4 },
};

export function applyDifficulty(
  units: readonly ExtendedUnitState[],
  difficulty: Difficulty,
): ExtendedUnitState[] {
  const bonus = BONUS[difficulty];
  if (bonus.hp === 0 && bonus.stat === 0) return [...units];
  return units.map((entry) => {
    if (entry.unit.faction !== 'enemy') return entry;
    const s = entry.stats;
    return {
      ...entry,
      stats: {
        hp: s.hp + bonus.hp,
        maxHp: s.maxHp + bonus.hp,
        str: s.str + bonus.stat,
        mag: s.mag + bonus.stat,
        skill: s.skill + bonus.stat,
        spd: s.spd + bonus.stat,
        lck: s.lck + bonus.stat,
        def: s.def + bonus.stat,
        res: s.res + bonus.stat,
      },
    };
  });
}
