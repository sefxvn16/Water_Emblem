import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState, type InventoryEntry } from '../../src/core/data/chapterData';
import { CONVOY_SLOTS } from '../../src/core/data/convoy';
import { buyItem, getShopStock, sellItem, sellValue } from '../../src/core/data/shop';
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

describe('shop (PLAN item 91)', () => {
  it('every item in items.json carries a price', () => {
    for (const item of itemsJson.items as ItemDefinition[]) {
      // Key items that can never be sold (Fire Emblem, PLAN item 92) carry 0.
      expect(item.price, item.id).toBeGreaterThanOrEqual(0);
    }
    for (const definition of getShopStock(itemById)) {
      expect(definition.price, definition.id).toBeGreaterThan(0);
    }
  });

  it('stock excludes personal weapons, Master Seal, Devil Axe and Warp', () => {
    const stockIds = getShopStock(itemById).map((definition) => definition.id);
    expect(stockIds).toContain('iron_sword');
    expect(stockIds).toContain('vulnerary');
    expect(stockIds).toContain('heal_staff');
    expect(stockIds).not.toContain('rapier');
    expect(stockIds).not.toContain('wing_spear');
    expect(stockIds).not.toContain('master_seal');
    expect(stockIds).not.toContain('devil_axe');
    expect(stockIds).not.toContain('warp_staff');
  });

  it('sell value is half the price scaled by remaining uses (FE11)', () => {
    const ironSword = itemById.get('iron_sword')!;
    expect(sellValue(ironSword, 40)).toBe(200);
    expect(sellValue(ironSword, 20)).toBe(100);
    expect(sellValue(ironSword, 1)).toBe(5);
    expect(sellValue({ ...ironSword, price: undefined }, 40)).toBe(0);
  });

  it('buys into the inventory and deducts gold without mutating inputs', () => {
    const units = freshUnits();
    const convoy: InventoryEntry[] = [];

    const result = buyItem(units, convoy, 1000, 'marth', 'vulnerary', itemById);

    expect(result).not.toBeNull();
    expect(result!.gold).toBe(640);
    expect(find(result!.units, 'marth').inventory.map((i) => i.itemId)).toContain('vulnerary');
    expect(result!.convoy).toEqual([]);
    expect(find(units, 'marth').inventory).toHaveLength(2);
    expect(convoy).toHaveLength(0);
  });

  it('refuses a purchase the gold cannot cover or that is not for sale', () => {
    const units = freshUnits();
    expect(buyItem(units, [], 399, 'marth', 'iron_sword', itemById)).toBeNull();
    expect(buyItem(units, [], 99999, 'marth', 'rapier', itemById)).toBeNull();
    expect(buyItem(units, [], 99999, 'marth', 'master_seal', itemById)).toBeNull();
    expect(buyItem(units, [], 99999, 'nobody', 'iron_sword', itemById)).toBeNull();
  });

  it('routes a purchase to the convoy when the buyer store is full', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];

    const result = buyItem(units, [], 1000, 'marth', 'armorslayer', itemById);

    expect(result).not.toBeNull();
    expect(result!.gold).toBe(0);
    expect(result!.convoy).toEqual([{ itemId: 'armorslayer', uses: 20 }]);
    expect(find(result!.units, 'marth').inventory).toHaveLength(4);
  });

  it('refuses a purchase when both the store and the convoy are full', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];
    const fullConvoy: InventoryEntry[] = Array.from(
      { length: CONVOY_SLOTS },
      () => ({ itemId: 'vulnerary', uses: 3 }),
    );

    expect(buyItem(units, fullConvoy, 1000, 'marth', 'armorslayer', itemById)).toBeNull();
  });

  it('sells an item for gold and re-equips when the equipped weapon is sold', () => {
    const units = freshUnits();

    const soldVuln = sellItem(units, 0, 'marth', 1, itemById);
    expect(soldVuln).not.toBeNull();
    expect(soldVuln!.gold).toBe(180);
    expect(find(soldVuln!.units, 'marth').inventory.map((i) => i.itemId)).toEqual(['rapier']);

    const soldEquipped = sellItem(units, 0, 'abel', 0, itemById);
    expect(soldEquipped).not.toBeNull();
    expect(soldEquipped!.gold).toBe(200);
    expect(find(soldEquipped!.units, 'abel').weapon?.id).toBe('javelin');

    expect(sellItem(units, 0, 'marth', 99, itemById)).toBeNull();
  });
});
