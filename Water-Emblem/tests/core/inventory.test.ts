import { describe, expect, it } from 'vitest';
import {
  chapters,
  initialChapterData,
  type ExtendedUnitState,
} from '../../src/core/data/chapterData';
import {
  ITEM_SLOTS,
  WEAPON_SLOTS,
  addItemToInventory,
  countSlots,
  hasRoomFor,
  resolveOverflow,
  slotKind,
} from '../../src/core/data/inventory';
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

describe('split inventory limits (PLAN item 86)', () => {
  it('staves and consumables count as items, weapons as weapons', () => {
    expect(slotKind(itemById.get('iron_sword')!)).toBe('weapon');
    expect(slotKind(itemById.get('heal_staff')!)).toBe('item');
    expect(slotKind(itemById.get('vulnerary')!)).toBe('item');
    expect(slotKind(itemById.get('master_key')!)).toBe('item');
    expect(slotKind(itemById.get('master_seal')!)).toBe('item');
  });

  it('counts slots per store', () => {
    const marth = find(freshUnits(), 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'vulnerary', uses: 3 },
      { itemId: 'heal_staff', uses: 20 },
    ];

    expect(countSlots(marth, itemById)).toEqual({ weapons: 2, items: 2 });
  });

  it('a full weapon store rejects weapons but still accepts items', () => {
    const marth = find(freshUnits(), 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];

    expect(hasRoomFor(marth, 'armorslayer', itemById)).toBe(false);
    expect(hasRoomFor(marth, 'vulnerary', itemById)).toBe(true);
    expect(addItemToInventory(marth, 'armorslayer', 20, itemById)).toBeNull();

    const withItem = addItemToInventory(marth, 'vulnerary', 3, itemById);
    expect(withItem?.inventory).toHaveLength(5);
    expect(marth.inventory).toHaveLength(4);
  });

  it('resolveOverflow discards a held item to make room, or the new item', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];

    const discardedNew = resolveOverflow(units, 'marth', 'armorslayer', 20, null, itemById);
    expect(discardedNew).toBe(units);

    const swapped = resolveOverflow(units, 'marth', 'armorslayer', 20, 'steel_sword', itemById);
    expect(find(swapped, 'marth').inventory.map((i) => i.itemId)).toEqual([
      'rapier',
      'iron_sword',
      'killing_edge',
      'armorslayer',
    ]);
    expect(find(units, 'marth').inventory).toHaveLength(4);
  });

  it('discarding the equipped weapon leaves the unit unarmed', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];

    const swapped = resolveOverflow(units, 'marth', 'armorslayer', 20, 'rapier', itemById);

    expect(find(swapped, 'marth').weapon).toBeUndefined();
  });

  it('no chapter unit starts over the 4+4 limits', () => {
    for (const chapter of Object.values(chapters)) {
      for (const entry of chapter.units) {
        const counts = countSlots(entry, itemById);
        expect(counts.weapons, `${chapter.id}/${entry.unit.id} weapons`).toBeLessThanOrEqual(WEAPON_SLOTS);
        expect(counts.items, `${chapter.id}/${entry.unit.id} items`).toBeLessThanOrEqual(ITEM_SLOTS);
      }
    }
  });
});
