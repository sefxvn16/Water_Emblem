import type { ItemDefinition } from '../combat/types';
import type { ExtendedUnitState, InventoryEntry } from './chapterData';
import { CONVOY_SLOTS, reequipAfterRemoval } from './convoy';
import { hasRoomFor } from './inventory';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };

/**
 * Shops (PLAN item 91; FE3 rules in Game_Design/battle.md "Tiệm"):
 * one shared army gold fund, Visit/Shop ends the unit's action.
 * Prices come from data/items.json (`price`, FE11 values; slim_lance,
 * devil_axe and warp_staff are [Giả định] — FE11 does not sell the last
 * two and has no Slim Lance). Items flagged `buyable: false` (Rapier,
 * Wing Spear, Master Seal, Devil Axe, Warp) are never shop stock but
 * keep a price for sell-back value.
 *
 * Sell-back follows FE11: half of the remaining-uses share of the price,
 * rounded down. A bought item goes to the buyer's inventory when its
 * store (PLAN item 86, 4+4) has room, else to the convoy (PLAN item 88)
 * when it has room; with no room anywhere the purchase fails.
 *
 * Pure helpers: invalid operations return null, inputs are not mutated.
 */
export interface ShopResult {
  units: ExtendedUnitState[];
  convoy: InventoryEntry[];
  gold: number;
}

/**
 * Hàng của một tiệm. `goods` là danh sách mặt hàng của tiệm đó trong chương
 * (atlas FE3 ghi từng tiệm bán gì — PLAN mục 206); không truyền thì tiệm bán
 * mọi món mua được trong catalog như trước mục 206.
 */
export function getShopStock(
  itemById: ReadonlyMap<string, ItemDefinition>,
  goods?: readonly string[],
): ItemDefinition[] {
  const sellable = (definition: ItemDefinition) =>
    definition.price !== undefined && definition.buyable !== false;
  if (goods) {
    return goods.flatMap((itemId) => {
      const definition = itemById.get(itemId);
      return definition && sellable(definition) ? [definition] : [];
    });
  }
  return [...itemById.values()].filter(sellable);
}

/** Gold received for selling one entry (FE11: half, scaled by remaining uses; divisor in data/balance.json). */
export function sellValue(definition: ItemDefinition, uses: number): number {
  if (definition.price === undefined || definition.maxUses <= 0) return 0;
  return Math.floor((definition.price * uses) / definition.maxUses / balanceConfig.shop.sellBackDivisor);
}

export function buyItem(
  units: readonly ExtendedUnitState[],
  convoy: readonly InventoryEntry[],
  gold: number,
  unitId: string,
  itemId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ShopResult | null {
  const definition = itemById.get(itemId);
  const entry = units.find((candidate) => candidate.unit.id === unitId);
  if (!definition || definition.price === undefined || definition.buyable === false || !entry) {
    return null;
  }
  if (gold < definition.price) return null;
  const bought: InventoryEntry = { itemId, uses: definition.maxUses };
  if (hasRoomFor(entry, itemId, itemById)) {
    const nextEntry: ExtendedUnitState = { ...entry, inventory: [...entry.inventory, bought] };
    return {
      units: units.map((candidate) => (candidate.unit.id === unitId ? nextEntry : candidate)),
      convoy: [...convoy],
      gold: gold - definition.price,
    };
  }
  if (convoy.length < CONVOY_SLOTS) {
    return {
      units: [...units],
      convoy: [...convoy, bought],
      gold: gold - definition.price,
    };
  }
  return null;
}

export function sellItem(
  units: readonly ExtendedUnitState[],
  gold: number,
  unitId: string,
  inventoryIndex: number,
  itemById: ReadonlyMap<string, ItemDefinition>,
): { units: ExtendedUnitState[]; gold: number } | null {
  const entry = units.find((candidate) => candidate.unit.id === unitId);
  const item = entry?.inventory[inventoryIndex];
  if (!entry || !item) return null;
  const definition = itemById.get(item.itemId);
  if (!definition) return null;
  const nextEntry = reequipAfterRemoval(
    { ...entry, inventory: entry.inventory.filter((_, index) => index !== inventoryIndex) },
    itemById,
  );
  return {
    units: units.map((candidate) => (candidate.unit.id === unitId ? nextEntry : candidate)),
    gold: gold + sellValue(definition, item.uses),
  };
}
