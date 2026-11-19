import { describe, expect, it } from 'vitest';
import { chapter01Data } from '../../src/core/data/chapterData';
import itemsJson from '../../data/items.json';
import type { ItemDefinition } from '../../src/core/combat/types';
import { changeMountedState, getAttackRange, isWeaponUsable, promoteUnit, promoteWithoutItem, useVulnerary } from '../../src/core/class/classRules';

describe('class rules', () => {
  it('lets ground cavalry dismount and remount without healing or losing identity', () => {
    const jagen = structuredClone(chapter01Data.units.find(({ unit }) => unit.id === 'jagen')!);
    jagen.stats.hp = 1;
    const foot = changeMountedState(jagen, false)!;
    expect(foot.unit.classId).toBe('paladin');
    expect(foot.unit.mountedClassId).toBe('cataphract');
    expect(foot.unit.moveType).toBe('foot');
    expect(foot.stats.hp).toBe(1);
    const horse = changeMountedState(foot, true)!;
    expect(horse.unit.classId).toBe('cataphract');
    expect(horse.unit.mountedClassId).toBeUndefined();
    expect(horse.stats.hp).toBe(1);
    expect(changeMountedState(horse, true)).toBeNull();
    const full = changeMountedState(chapter01Data.units.find(({ unit }) => unit.id === 'jagen')!, false)!;
    expect(full.stats.hp).toBe(22);
    expect(full.stats.maxHp).toBe(22);
  });

  it('keeps fliers mounted and returns Warlord to Lord', () => {
    const caeda = chapter01Data.units.find(({ unit }) => unit.id === 'caeda')!;
    expect(changeMountedState(caeda, false)).toBeNull();
    const marth = chapter01Data.units.find(({ unit }) => unit.id === 'marth')!;
    const promoted = promoteUnit({ ...marth, level: 10 }, 'warlord', true)!;
    const foot = changeMountedState(promoted, false)!;
    expect(foot.unit.classId).toBe('lord');
    expect(foot.unit.mountedClassId).toBe('warlord');
  });

  it('applies the selected promotion and class range', () => {
    const gordin = chapter01Data.units.find(({ unit }) => unit.id === 'gordin')!;
    const promoted = promoteUnit({ ...gordin, level: 10, exp: 80 }, 'sniper', true)!;
    expect(getAttackRange(promoted.unit, gordin.weapon)).toEqual({ min: 2, max: 3 });
    expect(promoted.stats.maxHp).toBeGreaterThan(gordin.stats.maxHp);
    expect(promoted.level).toBe(1);
    expect(promoted.exp).toBe(0);
    expect(promoteUnit(gordin, 'sniper', true)).toBeNull();
    expect(promoteUnit({ ...gordin, level: 10 }, 'sniper', false)).toBeNull();
    expect(promoteUnit({ ...gordin, level: 10 }, 'warlord', true)).toBeNull();
  });

  it('checks weapon rank and class before an attack', () => {
    const jagen = chapter01Data.units.find(({ unit }) => unit.id === 'jagen')!;
    const marth = chapter01Data.units.find(({ unit }) => unit.id === 'marth')!;
    expect(isWeaponUsable(jagen.unit, jagen.weapon!)).toBe(true);
    expect(isWeaponUsable(marth.unit, jagen.weapon!)).toBe(false);
    expect(getAttackRange(marth.unit, jagen.weapon)).toEqual({ min: 1, max: 0 });
  });

  it('uses one Vulnerary charge and never heals above maximum HP', () => {
    const marth = structuredClone(chapter01Data.units.find(({ unit }) => unit.id === 'marth')!);
    const vulnerary = itemsJson.items.find((item) => item.id === 'vulnerary') as ItemDefinition;
    marth.inventory.push({ itemId: 'vulnerary', uses: 2 });
    marth.stats.hp = marth.stats.maxHp - 3;
    const healed = useVulnerary(marth, vulnerary)!;
    expect(healed.stats.hp).toBe(marth.stats.maxHp);
    expect(healed.inventory.find((item) => item.itemId === 'vulnerary')?.uses).toBe(1);
    expect(marth.stats.hp).toBe(marth.stats.maxHp - 3);
    expect(useVulnerary(healed, vulnerary)).toBeNull();
  });

  it('promotes without any item at level 10+ (PLAN item 95)', () => {
    const gordin = structuredClone(chapter01Data.units.find(({ unit }) => unit.id === 'gordin')!);
    expect(promoteWithoutItem(gordin, 'sniper')).toBeNull();
    const eligible = { ...gordin, level: 10 };
    expect(promoteWithoutItem(eligible, 'warlord')).toBeNull();
    const promoted = promoteWithoutItem(eligible, 'sniper')!;
    expect(promoted.unit.classId).toBe('sniper');
    expect(promoted.level).toBe(1);
    expect(promoted.inventory).toEqual(eligible.inventory);
  });
});
