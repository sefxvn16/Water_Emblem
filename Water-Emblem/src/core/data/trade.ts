import type { ItemDefinition } from '../combat/types';
import { getUsableWeapons } from '../combat/equip';
import type { Position } from '../grid/types';
import type { ExtendedUnitState, InventoryEntry } from './chapterData';
import { ITEM_SLOTS, WEAPON_SLOTS, countSlots } from './inventory';

/**
 * Trading between adjacent allies (PLAN item 87; FE3 rules in
 * Game_Design/battle.md "Trao đổi đồ"):
 * - Two adjacent player units swap or move inventory entries, respecting
 *   the 4 weapons + 4 items split (PLAN item 86).
 * - After a trade, a unit whose equipped weapon left its inventory
 *   equips its first usable weapon. A unit that already acted (spent)
 *   always re-equips its first usable weapon when its inventory is
 *   rearranged (the FE3 enemy-phase equip trick).
 * - Initiating trade once per turn and the movement lock are enforced by
 *   the caller via GridUnit.hasTraded.
 *
 * Pure helpers: inputs are not mutated; invalid trades return the same
 * array reference.
 */
export function getTradePartners(
  units: readonly ExtendedUnitState[],
  initiator: ExtendedUnitState,
  fromPos: Position,
): ExtendedUnitState[] {
  return units.filter(
    (candidate) =>
      candidate.unit.id !== initiator.unit.id
      && candidate.unit.faction === 'player'
      && !candidate.unit.isDead
      && Math.abs(candidate.unit.position.x - fromPos.x)
        + Math.abs(candidate.unit.position.y - fromPos.y) === 1,
  );
}

function respectsLimits(
  inventory: readonly InventoryEntry[],
  itemById: ReadonlyMap<string, ItemDefinition>,
): boolean {
  const probe = { inventory: [...inventory] } as ExtendedUnitState;
  const counts = countSlots(probe, itemById);
  return counts.weapons <= WEAPON_SLOTS && counts.items <= ITEM_SLOTS;
}

function reequip(entry: ExtendedUnitState, itemById: ReadonlyMap<string, ItemDefinition>): ExtendedUnitState {
  const stillHoldsEquipped = entry.weapon !== undefined
    && entry.inventory.some((item) => item.itemId === entry.weapon!.id);
  if (stillHoldsEquipped && !entry.unit.hasActed) return entry;
  const firstUsable = getUsableWeapons(entry, itemById)[0];
  return { ...entry, weapon: firstUsable?.definition };
}

function withInventories(
  units: readonly ExtendedUnitState[],
  a: ExtendedUnitState,
  b: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState[] {
  const nextA = reequip(a, itemById);
  const nextB = reequip(b, itemById);
  return units.map((candidate) => {
    if (candidate.unit.id === nextA.unit.id) return nextA;
    if (candidate.unit.id === nextB.unit.id) return nextB;
    return candidate;
  });
}

/** Swap one inventory entry between two units (by inventory index). */
export function tradeSwap(
  units: readonly ExtendedUnitState[],
  aId: string,
  bId: string,
  aIndex: number,
  bIndex: number,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState[] {
  const a = units.find((candidate) => candidate.unit.id === aId);
  const b = units.find((candidate) => candidate.unit.id === bId);
  if (!a || !b || a === b) return units as ExtendedUnitState[];
  const aItem = a.inventory[aIndex];
  const bItem = b.inventory[bIndex];
  if (!aItem || !bItem) return units as ExtendedUnitState[];

  const nextAInventory = a.inventory.map((item, index) => (index === aIndex ? bItem : item));
  const nextBInventory = b.inventory.map((item, index) => (index === bIndex ? aItem : item));
  if (!respectsLimits(nextAInventory, itemById) || !respectsLimits(nextBInventory, itemById)) {
    return units as ExtendedUnitState[];
  }
  return withInventories(
    units,
    { ...a, inventory: nextAInventory },
    { ...b, inventory: nextBInventory },
    itemById,
  );
}

/** Move one inventory entry from one unit to the other (needs a free slot). */
export function tradeMove(
  units: readonly ExtendedUnitState[],
  fromId: string,
  toId: string,
  fromIndex: number,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState[] {
  const from = units.find((candidate) => candidate.unit.id === fromId);
  const to = units.find((candidate) => candidate.unit.id === toId);
  if (!from || !to || from === to) return units as ExtendedUnitState[];
  const item = from.inventory[fromIndex];
  if (!item) return units as ExtendedUnitState[];

  const nextFromInventory = from.inventory.filter((_, index) => index !== fromIndex);
  const nextToInventory = [...to.inventory, item];
  if (!respectsLimits(nextToInventory, itemById)) return units as ExtendedUnitState[];
  return withInventories(
    units,
    { ...from, inventory: nextFromInventory },
    { ...to, inventory: nextToInventory },
    itemById,
  );
}
