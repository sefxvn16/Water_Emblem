import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import { applyCombatWeaponExp, gainWeaponExp } from '../../src/core/combat/weaponExp';
import type { CombatResult, SingleAttackEvent } from '../../src/core/combat/types';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';

function freshUnits(): ExtendedUnitState[] {
  return structuredClone(initialChapterData.units);
}

function find(units: ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

function strike(attackerId: string, defenderId: string, isHit: boolean): SingleAttackEvent {
  return { attackerId, defenderId, isHit, isCrit: false, damageDealt: isHit ? 5 : 0, defenderHpAfter: 10 };
}

function makeResult(units: ExtendedUnitState[], events: SingleAttackEvent[]): CombatResult {
  const marth = find(units, 'marth');
  const pirate = find(units, 'enemy_pirate_5');
  const forecast = calculateCombatForecast(
    marth.unit, marth.stats, marth.weapon,
    pirate.unit, pirate.stats, pirate.weapon,
    1, defaultTerrainRegistry, 'plains', 'plains',
    units.map((u) => u.unit),
  );
  return { forecast, events };
}

describe('weapon experience (PLAN item 90)', () => {
  it('accumulates progress toward the next rank', () => {
    const marth = find(freshUnits(), 'marth');

    const updated = gainWeaponExp(marth, 'sword', 30);

    expect(updated.unit.weaponExp?.sword).toBe(30);
    expect(updated.unit.weaponRanks?.sword).toBe(marth.unit.weaponRanks?.sword ?? 'E');
    expect(marth.unit.weaponExp).toBeUndefined();
  });

  it('ranks up at the FE5 threshold and carries the remainder', () => {
    const marth = find(freshUnits(), 'marth');
    marth.unit = { ...marth.unit, weaponRanks: { sword: 'E' }, weaponExp: { sword: 49 } };

    const updated = gainWeaponExp(marth, 'sword', 3);

    expect(updated.unit.weaponRanks?.sword).toBe('D');
    expect(updated.unit.weaponExp?.sword).toBe(2);
  });

  it('caps at rank A', () => {
    const marth = find(freshUnits(), 'marth');
    marth.unit = { ...marth.unit, weaponRanks: { sword: 'B' }, weaponExp: { sword: 199 } };

    const updated = gainWeaponExp(marth, 'sword', 50);

    expect(updated.unit.weaponRanks?.sword).toBe('A');
    expect(updated.unit.weaponExp?.sword).toBe(0);
  });

  it('awards 1 WEx per landed strike in combat, misses excluded', () => {
    const units = freshUnits();
    const result = makeResult(units, [
      strike('marth', 'enemy_pirate_5', true),
      strike('enemy_pirate_5', 'marth', false),
      strike('marth', 'enemy_pirate_5', true),
    ]);

    const updated = applyCombatWeaponExp(units, result);

    expect(find(updated, 'marth').unit.weaponExp?.sword).toBe(2);
    expect(find(updated, 'enemy_pirate_5').unit.weaponExp).toBeUndefined();
  });
});
