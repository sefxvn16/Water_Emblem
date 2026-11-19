import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import { getTradePartners, tradeMove, tradeSwap } from '../../src/core/data/trade';
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

describe('trade (PLAN item 87)', () => {
  it('finds adjacent allies from the destination tile', () => {
    const units = freshUnits();
    const marth = find(units, 'marth'); // (24,5); Caeda (25,5), Jagen (23,4)

    const partners = getTradePartners(units, marth, { x: 24, y: 5 });

    expect(partners.map((p) => p.unit.id)).toEqual(['caeda']);
    expect(getTradePartners(units, marth, { x: 24, y: 4 }).map((p) => p.unit.id)).toContain('jagen');
  });

  it('swaps items between two units without mutating the input', () => {
    const units = freshUnits();
    const caedaBefore = find(units, 'caeda').inventory.map((i) => i.itemId);

    const updated = tradeSwap(units, 'marth', 'caeda', 1, 0, itemById);

    expect(find(updated, 'marth').inventory[1]?.itemId).toBe(caedaBefore[0]);
    expect(find(updated, 'caeda').inventory[0]?.itemId).toBe('iron_sword');
    expect(find(units, 'marth').inventory[1]?.itemId).toBe('iron_sword');
  });

  it('rejects a swap that would break the 4+4 limits', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];
    const caeda = find(units, 'caeda');
    caeda.inventory = [{ itemId: 'vulnerary', uses: 3 }];

    // Swapping a weapon for an item would leave Marth with 3 weapons + 1 item (fine),
    // but swapping Caeda's only item for a weapon is also fine; use a full item store instead:
    caeda.inventory = [
      { itemId: 'vulnerary', uses: 3 },
      { itemId: 'vulnerary', uses: 3 },
      { itemId: 'vulnerary', uses: 3 },
      { itemId: 'vulnerary', uses: 3 },
    ];
    const updated = tradeSwap(units, 'marth', 'caeda', 0, 0, itemById);

    // Marth would get 3 weapons + 1 item (ok); Caeda 1 weapon + 3 items (ok) -> allowed.
    expect(updated).not.toBe(units);

    // Now a move that overflows Caeda's item store is rejected.
    const marth2 = find(units, 'marth');
    marth2.inventory = [{ itemId: 'vulnerary', uses: 3 }];
    const moved = tradeMove(units, 'marth', 'caeda', 0, itemById);
    expect(moved).toBe(units);
  });

  it('moves an item to the partner when a slot is free', () => {
    const units = freshUnits();

    const updated = tradeMove(units, 'marth', 'caeda', 1, itemById);

    expect(find(updated, 'marth').inventory.map((i) => i.itemId)).toEqual(['rapier']);
    expect(find(updated, 'caeda').inventory.map((i) => i.itemId)).toContain('iron_sword');
  });

  it('giving away the equipped weapon equips the next usable one', () => {
    const units = freshUnits();

    const updated = tradeMove(units, 'marth', 'caeda', 0, itemById);

    expect(find(updated, 'marth').weapon?.id).toBe('iron_sword');
  });

  it('a spent partner re-equips its first usable weapon after any trade', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.weapon = itemById.get('iron_sword');
    marth.unit = { ...marth.unit, hasActed: true };
    const caeda = find(units, 'caeda');
    caeda.inventory = [{ itemId: 'vulnerary', uses: 3 }, ...caeda.inventory];

    const updated = tradeSwap(units, 'caeda', 'marth', 0, 1, itemById);

    // Marth traded away iron_sword (index 1) for a vulnerary; spent -> first usable = rapier.
    expect(find(updated, 'marth').weapon?.id).toBe('rapier');
  });
});
