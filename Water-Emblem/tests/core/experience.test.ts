import { describe, expect, it } from 'vitest';
import { chapter01Data } from '../../src/core/data/chapterData';
import { SeededRNG } from '../../src/core/combat/rng';
import { awardExperience, calculateCombatExp, getEffectiveGrowthRates } from '../../src/core/progression/experience';
import charactersJson from '../../data/characters.json';
import { getClassDefinition } from '../../src/core/class/classRules';

describe('experience and growth', () => {
  it('grants one EXP for a missed or zero damage combat and no EXP after death', () => {
    const marth = chapter01Data.units.find(({ unit }) => unit.id === 'marth')!;
    const gazzak = chapter01Data.units.find(({ unit }) => unit.id === 'gazzak')!;
    expect(calculateCombatExp(marth, gazzak, false, false)).toBe(1);
    expect(calculateCombatExp(marth, gazzak, true, true))
      .toBeGreaterThan(calculateCombatExp(marth, { ...gazzak, isBoss: false }, true, true));
    const dead = structuredClone(marth);
    dead.stats.hp = 0;
    expect(calculateCombatExp(dead, gazzak, true, true)).toBe(0);
  });

  it('uses guaranteed points above 100 percent and respects HP/stat caps', () => {
    const marth = structuredClone(chapter01Data.units.find(({ unit }) => unit.id === 'marth')!);
    marth.unit = { ...marth.unit, id: 'growth_test_unit' };
    marth.exp = 99;
    marth.stats.str = 30;
    marth.stats.maxHp = 59;
    marth.stats.hp = 50;
    marth.growths = { hp: 150, str: 200, mag: 0, skill: 0, spd: 0, lck: 0, def: 0, res: 0 };
    const result = awardExperience(marth, 1, new SeededRNG(1));
    expect(result.gainedLevel).toBe(true);
    expect(result.entry.level).toBe(2);
    expect(result.entry.exp).toBe(0);
    expect(result.entry.stats.str).toBe(30);
    expect(result.entry.stats.maxHp).toBe(60);
    expect(result.entry.stats.hp).toBe(51);
    expect(marth.level).toBe(1);
  });

  it('does not raise a level twenty unit', () => {
    const marth = structuredClone(chapter01Data.units.find(({ unit }) => unit.id === 'marth')!);
    marth.level = 20;
    expect(awardExperience(marth, 100, new SeededRNG(1)).entry).toBe(marth);
  });

  it('combines sourced FE11 personal and class growths without double counting', () => {
    const marth = chapter01Data.units.find(({ unit }) => unit.id === 'marth')!;
    expect(getEffectiveGrowthRates(marth)).toEqual(marth.growths);
    const promoted = { ...marth, unit: { ...marth.unit, classId: 'warlord' } };
    expect(getEffectiveGrowthRates(promoted)).toMatchObject({ hp: 80, str: 50, skill: 45, spd: 40, def: 30 });
    const dismounted = { ...promoted, unit: { ...promoted.unit, classId: 'lord', mountedClassId: 'warlord' } };
    expect(getEffectiveGrowthRates(dismounted)).toEqual(getEffectiveGrowthRates(promoted));
    const navarre = { ...marth, unit: { ...marth.unit, id: 'navarre', classId: 'mercenary' } };
    expect(getEffectiveGrowthRates(navarre)).toMatchObject({ hp: 100, str: 40, mag: 0, skill: 45, spd: 45, lck: 40, def: 10, res: 0 });
  });

  it('recreates every sourced player growth rate at the starting class', () => {
    let checked = 0;
    for (const character of charactersJson.characters) {
      if (!('personalGrowths' in character) || !character.personalGrowths) continue;
      const classGrowths = getClassDefinition(character.classId)?.growths;
      expect(classGrowths, character.id).toBeDefined();
      for (const key of ['hp', 'str', 'mag', 'skill', 'spd', 'lck', 'def', 'res'] as const) {
        expect(Math.max(0, character.personalGrowths[key] + (classGrowths?.[key] ?? 0)), `${character.id}.${key}`)
          .toBe(character.growths[key]);
      }
      checked += 1;
    }
    expect(checked).toBe(17);
  });
});
