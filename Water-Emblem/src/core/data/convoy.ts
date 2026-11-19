import type { ItemDefinition } from '../combat/types';
import { getUsableWeapons } from '../combat/equip';
import type { ExtendedUnitState, InventoryEntry } from './chapterData';
import { hasRoomFor } from './inventory';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };

/**
 * Convoy through Marth (PLAN item 88; FE3 rules in Game_Design/battle.md
 * "Kho đồ"): Marth is the convoy with 128 shared slots. Depositing the
 * equipped weapon re-equips the first usable weapon (or unarmed), like
 * trading. Withdrawal respects the 4+4 split (PLAN item 86).
 *
 * Pure helpers: invalid operations return null. The slot count is
 * declared in data/balance.json (PLAN item 134).
 */
export const CONVOY_SLOTS: number = balanceConfig.convoySlots;

export interface ConvoyResult {
  units: ExtendedUnitState[];
  convoy: InventoryEntry[];
}

/** Re-equip the first usable weapon when the equipped one left the inventory. */
export function reequipAfterRemoval(entry: ExtendedUnitState, itemById: ReadonlyMap<string, ItemDefinition>): ExtendedUnitState {
  const stillHoldsEquipped = entry.weapon !== undefined
    && entry.inventory.some((item) => item.itemId === entry.weapon!.id);
  if (stillHoldsEquipped) return entry;
  const firstUsable = getUsableWeapons(entry, itemById)[0];
  return { ...entry, weapon: firstUsable?.definition };
}

export function depositToConvoy(
  units: readonly ExtendedUnitState[],
  convoy: readonly InventoryEntry[],
  unitId: string,
  inventoryIndex: number,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ConvoyResult | null {
  if (convoy.length >= CONVOY_SLOTS) return null;
  const entry = units.find((candidate) => candidate.unit.id === unitId);
  const item = entry?.inventory[inventoryIndex];
  if (!entry || !item) return null;
  const nextEntry = reequipAfterRemoval(
    { ...entry, inventory: entry.inventory.filter((_, index) => index !== inventoryIndex) },
    itemById,
  );
  return {
    units: units.map((candidate) => (candidate.unit.id === unitId ? nextEntry : candidate)),
    convoy: [...convoy, item],
  };
}

export function withdrawFromConvoy(
  units: readonly ExtendedUnitState[],
  convoy: readonly InventoryEntry[],
  unitId: string,
  convoyIndex: number,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ConvoyResult | null {
  const entry = units.find((candidate) => candidate.unit.id === unitId);
  const item = convoy[convoyIndex];
  if (!entry || !item) return null;
  if (!hasRoomFor(entry, item.itemId, itemById)) return null;
  const nextEntry: ExtendedUnitState = { ...entry, inventory: [...entry.inventory, item] };
  return {
    units: units.map((candidate) => (candidate.unit.id === unitId ? nextEntry : candidate)),
    convoy: convoy.filter((_, index) => index !== convoyIndex),
  };
}

/** Send an overflow gain straight to the convoy (PLAN items 86+88). */
export function sendToConvoy(
  convoy: readonly InventoryEntry[],
  itemId: string,
  uses: number,
): InventoryEntry[] | null {
  if (convoy.length >= CONVOY_SLOTS) return null;
  return [...convoy, { itemId, uses }];
}
