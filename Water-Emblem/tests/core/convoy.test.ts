import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState, type InventoryEntry } from '../../src/core/data/chapterData';
import { CONVOY_SLOTS, depositToConvoy, sendToConvoy, withdrawFromConvoy } from '../../src/core/data/convoy';
import { buildNewGameSnapshot, isGameSnapshot } from '../../src/storage/saveLoad';
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

describe('convoy (PLAN item 88)', () => {
  it('deposits an item into the convoy without mutating inputs', () => {
    const units = freshUnits();
    const convoy: InventoryEntry[] = [];

    const result = depositToConvoy(units, convoy, 'marth', 1, itemById);

    expect(result).not.toBeNull();
    expect(find(result!.units, 'marth').inventory.map((i) => i.itemId)).toEqual(['rapier']);
    expect(result!.convoy).toEqual([{ itemId: 'iron_sword', uses: 40 }]);
    expect(find(units, 'marth').inventory).toHaveLength(2);
    expect(convoy).toHaveLength(0);
  });

  it('depositing the equipped weapon equips the next usable one', () => {
    const units = freshUnits();

    const result = depositToConvoy(units, [], 'marth', 0, itemById);

    expect(find(result!.units, 'marth').weapon?.id).toBe('iron_sword');
  });

  it('withdraws an item when the unit store has room', () => {
    const units = freshUnits();
    const convoy: InventoryEntry[] = [{ itemId: 'vulnerary', uses: 3 }];

    const result = withdrawFromConvoy(units, convoy, 'marth', 0, itemById);

    expect(result).not.toBeNull();
    expect(find(result!.units, 'marth').inventory.map((i) => i.itemId)).toContain('vulnerary');
    expect(result!.convoy).toHaveLength(0);
  });

  it('rejects withdrawal into a full store and deposit into a full convoy', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.inventory = [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
      { itemId: 'steel_sword', uses: 35 },
      { itemId: 'killing_edge', uses: 20 },
    ];

    expect(withdrawFromConvoy(units, [{ itemId: 'armorslayer', uses: 20 }], 'marth', 0, itemById)).toBeNull();

    const fullConvoy: InventoryEntry[] = Array.from({ length: CONVOY_SLOTS }, () => ({ itemId: 'vulnerary', uses: 3 }));
    expect(depositToConvoy(units, fullConvoy, 'marth', 0, itemById)).toBeNull();
    expect(sendToConvoy(fullConvoy, 'vulnerary', 3)).toBeNull();
  });

  it('sendToConvoy appends an overflow gain', () => {
    expect(sendToConvoy([], 'iron_sword', 40)).toEqual([{ itemId: 'iron_sword', uses: 40 }]);
  });

  it('saves carry the convoy and validate it', () => {
    const snapshot = buildNewGameSnapshot('chapter_01', 12345);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.convoy).toEqual([]);
    expect(isGameSnapshot(snapshot)).toBe(true);

    const withConvoy = { ...snapshot!, convoy: [{ itemId: 'iron_sword', uses: 40 }] };
    expect(isGameSnapshot(withConvoy)).toBe(true);

    const badConvoy = { ...snapshot!, convoy: [{ itemId: 'iron_sword', uses: 999 }] };
    expect(isGameSnapshot(badConvoy)).toBe(false);
  });
});
