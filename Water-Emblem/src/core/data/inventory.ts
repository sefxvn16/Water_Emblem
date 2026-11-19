import type { ExtendedUnitState } from './chapterData';
import balanceConfig from '../../../data/balance.json';

/**
 * Split inventory limits (PLAN item 86; rules in Game_Design/battle.md
 * "Giới hạn túi đồ"): FE3 gives each unit two stores — 4 weapon slots
 * and 4 item slots. Staves occupy the item store, not weapon slots
 * (research 2026-11-19, FE3 §1.22). Consumables and key items
 * (master_key, master_seal) are item-store entries too.
 *
 * Pure helpers: inputs are not mutated. The item lookup only needs each
 * item's `type`, so callers may pass full ItemDefinitions or lighter
 * records (chapter events pass ItemInfo). Slot counts are declared in
 * data/balance.json (PLAN item 134).
 */
export const WEAPON_SLOTS: number = balanceConfig.inventory.weaponSlots;
export const ITEM_SLOTS: number = balanceConfig.inventory.itemSlots;

export type SlotKind = 'weapon' | 'item';

export interface ItemTypeInfo {
  readonly type: string;
}

export function slotKind(definition: ItemTypeInfo): SlotKind {
  return definition.type === 'staff' || definition.type === 'consumable' ? 'item' : 'weapon';
}

export interface SlotCounts {
  weapons: number;
  items: number;
}

export function countSlots(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemTypeInfo>,
): SlotCounts {
  const counts: SlotCounts = { weapons: 0, items: 0 };
  for (const item of entry.inventory) {
    const definition = itemById.get(item.itemId);
    if (!definition) continue;
    if (slotKind(definition) === 'weapon') counts.weapons += 1;
    else counts.items += 1;
  }
  return counts;
}

export function hasRoomFor(
  entry: ExtendedUnitState,
  itemId: string,
  itemById: ReadonlyMap<string, ItemTypeInfo>,
): boolean {
  const definition = itemById.get(itemId);
  if (!definition) return false;
  const counts = countSlots(entry, itemById);
  return slotKind(definition) === 'weapon'
    ? counts.weapons < WEAPON_SLOTS
    : counts.items < ITEM_SLOTS;
}

/** Add an item when its store has room; returns null when full. */
export function addItemToInventory(
  entry: ExtendedUnitState,
  itemId: string,
  uses: number,
  itemById: ReadonlyMap<string, ItemTypeInfo>,
): ExtendedUnitState | null {
  if (!hasRoomFor(entry, itemId, itemById)) return null;
  return { ...entry, inventory: [...entry.inventory, { itemId, uses }] };
}

/**
 * Resolve a full-inventory gain (PLAN item 86): `discardItemId` names an
 * inventory entry of the same store to drop so the new item fits; null
 * discards the new item instead. When the dropped entry was the equipped
 * weapon, the unit becomes unarmed (weapon: undefined) — the player can
 * equip another weapon with PLAN item 85 controls. Returns the same
 * array reference when nothing changes.
 */
export function resolveOverflow(
  units: readonly ExtendedUnitState[],
  unitId: string,
  newItemId: string,
  newUses: number,
  discardItemId: string | null,
  itemById: ReadonlyMap<string, ItemTypeInfo>,
): ExtendedUnitState[] {
  if (discardItemId === null) return units as ExtendedUnitState[];
  const entry = units.find((candidate) => candidate.unit.id === unitId);
  if (!entry) return units as ExtendedUnitState[];
  const discardIndex = entry.inventory.findIndex((item) => item.itemId === discardItemId);
  if (discardIndex < 0) return units as ExtendedUnitState[];
  const withoutDiscarded: ExtendedUnitState = {
    ...entry,
    inventory: entry.inventory.filter((_, index) => index !== discardIndex),
    weapon: entry.weapon?.id === discardItemId ? undefined : entry.weapon,
  };
  const withNew = addItemToInventory(withoutDiscarded, newItemId, newUses, itemById);
  if (!withNew) return units as ExtendedUnitState[];
  return units.map((candidate) => (candidate.unit.id === unitId ? withNew : candidate));
}
