import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import { applyCombatDurability } from '../../src/core/combat/durability';
import type { CombatResult, ItemDefinition, SingleAttackEvent } from '../../src/core/combat/types';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import itemsJson from '../../data/items.json';

const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));

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

function usesOf(entry: ExtendedUnitState, itemId: string): number | undefined {
  return entry.inventory.find((item) => item.itemId === itemId)?.uses;
}

describe('weapon durability (PLAN item 84)', () => {
  it('physical weapon loses 1 use per hit, counter included', () => {
    const units = freshUnits();
    const result = makeResult(units, [
      strike('marth', 'enemy_pirate_5', true),
      strike('enemy_pirate_5', 'marth', true),
      strike('marth', 'enemy_pirate_5', true),
    ]);
    const pirateWeapon = find(units, 'enemy_pirate_5').weapon!;
    const pirateUsesBefore = usesOf(find(units, 'enemy_pirate_5'), pirateWeapon.id)!;

    const updated = applyCombatDurability(units, result, itemById);

    expect(usesOf(find(updated, 'marth'), 'rapier')).toBe(26);
    expect(usesOf(find(updated, 'enemy_pirate_5'), pirateWeapon.id)).toBe(pirateUsesBefore - 1);
  });

  it('a missed physical strike does not consume durability', () => {
    const units = freshUnits();
    const result = makeResult(units, [strike('marth', 'enemy_pirate_5', false)]);

    const updated = applyCombatDurability(units, result, itemById);

    expect(usesOf(find(updated, 'marth'), 'rapier')).toBe(28);
  });

  it('a magic weapon loses durability even on a miss', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    const tome: ItemDefinition = { ...marth.weapon!, id: 'test_tome', type: 'tome', isMagic: true, maxUses: 10 };
    marth.weapon = tome;
    marth.inventory = [{ itemId: 'test_tome', uses: 10 }];
    const localItems = new Map(itemById).set('test_tome', tome);
    const result = makeResult(units, [strike('marth', 'enemy_pirate_5', false)]);

    const updated = applyCombatDurability(units, result, localItems);

    expect(usesOf(find(updated, 'marth'), 'test_tome')).toBe(9);
  });

  it('a broken weapon disappears and the next usable weapon is equipped', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 1 },
      { itemId: 'iron_sword', uses: 40 },
    ];
    const result = makeResult(units, [strike('marth', 'enemy_pirate_5', true)]);

    const updated = applyCombatDurability(units, result, itemById);
    const updatedMarth = find(updated, 'marth');

    expect(usesOf(updatedMarth, 'rapier')).toBeUndefined();
    expect(updatedMarth.weapon?.id).toBe('iron_sword');
    expect(usesOf(updatedMarth, 'iron_sword')).toBe(40);
  });

  it('breaking the last weapon leaves the unit unarmed', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [{ itemId: 'rapier', uses: 1 }];
    const result = makeResult(units, [strike('marth', 'enemy_pirate_5', true)]);

    const updated = applyCombatDurability(units, result, itemById);
    const updatedMarth = find(updated, 'marth');

    expect(updatedMarth.weapon).toBeUndefined();
    expect(updatedMarth.inventory).toEqual([]);
  });

  it('does not mutate the input units', () => {
    const units = freshUnits();
    const result = makeResult(units, [strike('marth', 'enemy_pirate_5', true)]);

    applyCombatDurability(units, result, itemById);

    expect(usesOf(find(units, 'marth'), 'rapier')).toBe(28);
  });
});
