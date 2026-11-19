import { describe, expect, it } from 'vitest';
import charactersJson from '../../data/characters.json';
import classesJson from '../../data/classes.json';
import { testChapter01Data } from '../../src/core/data/chapterData';
import { getEffectiveGrowthRates } from '../../src/core/progression/experience';

// PLAN item 157 (scope a, owner 2026-11-20): character/class stats follow
// FE11 for Book 1 and FE12 for Book 2. Sources: Serenes Forest FE11 full
// growth rates + FE11 player class growth rates; FE12 Phina (Feena) base
// stats and growth rates (Fire Emblem Wiki, CharStats DS).
const KEYS = ['hp', 'str', 'mag', 'skill', 'spd', 'lck', 'def', 'res'] as const;

function character(id: string) {
  const found = charactersJson.characters.find((entry) => entry.id === id);
  if (!found) throw new Error(`character ${id} not found`);
  return found;
}

function classGrowths(id: string) {
  const found = classesJson.classes.find((entry) => entry.id === id);
  if (!found?.growths) throw new Error(`class ${id} growths not found`);
  return found.growths;
}

function asArray(record: Record<string, number>): number[] {
  return KEYS.map((key) => record[key] ?? 0);
}

describe('FE11/FE12 stats (PLAN item 157)', () => {
  it('Julian base stats and growths match FE11', () => {
    const julian = character('julian');
    expect(asArray(julian.baseStats)).toEqual([17, 4, 0, 6, 12, 7, 4, 0]);
    expect(asArray(julian.growths)).toEqual([80, 50, 0, 50, 50, 80, 30, 2]);
  });

  it('Lena growths match FE11 (HP 15)', () => {
    expect(asArray(character('lena').growths)).toEqual([15, 0, 25, 25, 20, 60, 0, 50]);
  });

  it('Tiki base stats and growths match FE11', () => {
    const tiki = character('tiki');
    expect(asArray(tiki.baseStats)).toEqual([18, 3, 0, 3, 4, 12, 3, 10]);
    expect(asArray(tiki.growths)).toEqual([90, 50, 10, 80, 80, 90, 20, 2]);
  });

  it('Xane growths match FE11', () => {
    expect(asArray(character('xane').growths)).toEqual([40, 30, 0, 30, 30, 20, 15, 2]);
  });

  it('Feena base stats and growths match FE12', () => {
    const feena = character('feena');
    expect(asArray(feena.baseStats)).toEqual([16, 2, 0, 2, 13, 8, 5, 0]);
    expect(asArray(feena.growths)).toEqual([60, 60, 0, 80, 90, 80, 15, 5]);
  });

  it('class growths match FE11 player classes', () => {
    expect(asArray(classGrowths('paladin'))).toEqual([40, 15, -10, 25, 10, 0, 15, -5]);
    expect(asArray(classGrowths('manakete'))).toEqual([50, 20, 10, 30, 20, 0, 10, -10]);
    expect(asArray(classGrowths('chameleon'))).toEqual([40, 30, -20, 30, 30, 0, 15, -15]);
  });

  it('effective in-game growths recreate the FE totals for Tiki, Xane and Feena', () => {
    const tiki = testChapter01Data.units.find((entry) => entry.unit.id === 'tiki')!;
    expect(asArray(getEffectiveGrowthRates(tiki))).toEqual([90, 50, 10, 80, 80, 90, 20, 2]);
    const xane = testChapter01Data.units.find((entry) => entry.unit.id === 'xane')!;
    expect(asArray(getEffectiveGrowthRates(xane))).toEqual([40, 30, 0, 30, 30, 20, 15, 2]);
    const feena = testChapter01Data.units.find((entry) => entry.unit.id === 'feena')!;
    expect(asArray(getEffectiveGrowthRates(feena))).toEqual([60, 60, 0, 80, 90, 80, 15, 5]);
  });
});
