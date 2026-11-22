import type { CombatResult, ItemDefinition } from './types';
import type { ExtendedUnitState, InventoryEntry } from '../data/chapterData';
import { isWeaponUsable } from '../class/classRules';

/**
 * Weapon durability after a finished combat (PLAN item 84; rules in
 * Game_Design/battle.md "Độ bền vũ khí"):
 * - A physical weapon loses 1 use per strike that hits.
 * - A magic weapon (tome) loses 1 use per strike, hit or miss.
 * - At 0 uses the weapon disappears; the unit equips its next usable
 *   weapon from the inventory, or becomes unarmed (weapon: undefined).
 * Durability is applied after the combat resolves (a weapon at 1 use
 * still makes all of its strikes in that combat, then breaks).
 *
 * Pure: returns a new array; inputs are not mutated.
 */
export function applyCombatDurability(
  units: readonly ExtendedUnitState[],
  result: CombatResult,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState[] {
  const sideIds = new Set([result.forecast.attacker.unit.id, result.forecast.defender.unit.id]);
  return units.map((entry) => {
    if (!sideIds.has(entry.unit.id) || !entry.weapon) return entry;
    // FE3 canon: holding the Starsphere grants infinite durability (weapons never degrade)
    if (entry.inventory.some((item) => item.itemId === 'starsphere')) return entry;
    const weapon = entry.weapon;
    const strikes = result.events.filter(
      (event) => event.attackerId === entry.unit.id && (event.isHit || weapon.isMagic),
    ).length;
    if (strikes === 0) return entry;

    const equippedIndex = entry.inventory.findIndex((item) => item.itemId === weapon.id);
    if (equippedIndex < 0) return entry;

    const equipped = entry.inventory[equippedIndex]!;
    const remaining = equipped.uses - strikes;
    if (remaining > 0) {
      const inventory = entry.inventory.map((item, index) =>
        index === equippedIndex ? { ...item, uses: remaining } : item,
      );
      return { ...entry, inventory };
    }

    // Weapon broke: it disappears; equip the next usable weapon, if any.
    const inventory = entry.inventory.filter((_, index) => index !== equippedIndex);
    const nextWeapon = findNextUsableWeapon(entry, inventory, itemById);
    return { ...entry, inventory, weapon: nextWeapon };
  });
}

function findNextUsableWeapon(
  entry: ExtendedUnitState,
  inventory: readonly InventoryEntry[],
  itemById: ReadonlyMap<string, ItemDefinition>,
): ItemDefinition | undefined {
  for (const item of inventory) {
    const definition = itemById.get(item.itemId);
    if (definition && item.uses > 0 && isWeaponUsable(entry.unit, definition)) {
      return definition;
    }
  }
  return undefined;
}
