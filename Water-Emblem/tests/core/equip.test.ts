import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  canAttackAtDistance,
  equipWeapon,
  findWeaponForDistance,
  getAttackWeapons,
  getUsableWeapons,
} from '../../src/core/combat/equip';
import type { ItemDefinition } from '../../src/core/combat/types';
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

describe('weapon switching (PLAN item 85)', () => {
  it('lists usable weapons in inventory order, equipped flagged', () => {
    const abel = find(freshUnits(), 'abel');

    const usable = getUsableWeapons(abel, itemById);

    expect(usable.map((w) => w.itemId)).toEqual(['iron_sword', 'javelin']);
    expect(usable[0]?.equipped).toBe(true);
    expect(usable[1]?.equipped).toBe(false);
  });

  it('excludes consumables, class-unusable weapons, and spent weapons', () => {
    const marth = find(freshUnits(), 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'vulnerary', uses: 3 },
      { itemId: 'iron_bow', uses: 40 },
      { itemId: 'iron_sword', uses: 0 },
    ];

    const usable = getUsableWeapons(marth, itemById);

    expect(usable.map((w) => w.itemId)).toEqual(['rapier']);
  });

  it('equips another usable weapon without mutating the input', () => {
    const units = freshUnits();

    const updated = equipWeapon(units, 'abel', 'javelin', itemById);

    expect(find(updated, 'abel').weapon?.id).toBe('javelin');
    expect(find(units, 'abel').weapon?.id).toBe('iron_sword');
    expect(find(updated, 'gordin')).toBe(find(units, 'gordin'));
  });

  it('returns the same array when the equip is a no-op', () => {
    const units = freshUnits();

    expect(equipWeapon(units, 'marth', 'rapier', itemById)).toBe(units);
    expect(equipWeapon(units, 'marth', 'iron_bow', itemById)).toBe(units);
    expect(equipWeapon(units, 'marth', 'steel_sword', itemById)).toBe(units);
    expect(equipWeapon(units, 'no_such_unit', 'iron_sword', itemById)).toBe(units);
  });

  it('staves are equippable but not attack weapons', () => {
    const healer = find(freshUnits(), 'marth');
    healer.unit = { ...healer.unit, classId: 'curate', weaponRanks: { staff: 'E' } };
    healer.inventory = [{ itemId: 'heal_staff', uses: 20 }];
    healer.weapon = itemById.get('heal_staff');

    expect(getUsableWeapons(healer, itemById).map((w) => w.itemId)).toEqual(['heal_staff']);
    expect(getAttackWeapons(healer, itemById)).toEqual([]);
    expect(canAttackAtDistance(healer, itemById, 1)).toBe(false);
  });

  it('attack reach follows weapon ranges', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    const gordin = find(units, 'gordin');

    expect(canAttackAtDistance(marth, itemById, 1)).toBe(true);
    expect(canAttackAtDistance(marth, itemById, 2)).toBe(false);
    expect(canAttackAtDistance(gordin, itemById, 1)).toBe(false);
    expect(canAttackAtDistance(gordin, itemById, 2)).toBe(true);
  });

  it('findWeaponForDistance prefers the equipped weapon, else the first reaching one', () => {
    const marth = find(freshUnits(), 'marth');
    const rangedSword: ItemDefinition = {
      ...itemById.get('iron_sword')!,
      id: 'test_ranged_sword',
      minRange: 2,
      maxRange: 2,
    };
    const localItems = new Map(itemById).set('test_ranged_sword', rangedSword);
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'test_ranged_sword', uses: 10 },
    ];

    expect(findWeaponForDistance(marth, localItems, 1)?.id).toBe('rapier');
    expect(findWeaponForDistance(marth, localItems, 2)?.id).toBe('test_ranged_sword');
    expect(findWeaponForDistance(marth, localItems, 3)).toBeUndefined();
  });
});
