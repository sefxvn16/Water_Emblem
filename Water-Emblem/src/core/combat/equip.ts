import type { ItemDefinition } from './types';
import type { ExtendedUnitState } from '../data/chapterData';
import { getAttackRange, isWeaponUsable } from '../class/classRules';

/**
 * Weapon switching (PLAN item 85; rules in Game_Design/battle.md
 * "Đổi vũ khí"): a unit may equip any weapon in its inventory that it
 * can use (class weapon types + weapon rank, via isWeaponUsable) and
 * that still has uses left. Staves are equippable (they are used, not
 * attacked with — see PLAN item 89); consumables never are.
 *
 * Pure helpers: inputs are not mutated.
 */
export interface UsableWeapon {
  itemId: string;
  definition: ItemDefinition;
  uses: number;
  equipped: boolean;
}

export function getUsableWeapons(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): UsableWeapon[] {
  const usable: UsableWeapon[] = [];
  for (const item of entry.inventory) {
    const definition = itemById.get(item.itemId);
    if (!definition || item.uses <= 0) continue;
    if (!isWeaponUsable(entry.unit, definition)) continue;
    usable.push({
      itemId: item.itemId,
      definition,
      uses: item.uses,
      equipped: entry.weapon?.id === item.itemId,
    });
  }
  return usable;
}

/** Weapons the unit could attack with (staves excluded: range max 0). */
export function getAttackWeapons(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): UsableWeapon[] {
  return getUsableWeapons(entry, itemById).filter(
    (weapon) => getAttackRange(entry.unit, weapon.definition).max > 0,
  );
}

/**
 * Equip `itemId` on `unitId`. Returns the same array reference when the
 * equip is not possible (unknown unit, item not in inventory, not
 * usable, or already equipped) so callers can detect the no-op.
 */
export function equipWeapon(
  units: readonly ExtendedUnitState[],
  unitId: string,
  itemId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ExtendedUnitState[] {
  const entry = units.find((candidate) => candidate.unit.id === unitId);
  if (!entry || entry.weapon?.id === itemId) return units as ExtendedUnitState[];
  const usable = getUsableWeapons(entry, itemById).some((weapon) => weapon.itemId === itemId);
  if (!usable) return units as ExtendedUnitState[];
  const definition = itemById.get(itemId)!;
  return units.map((candidate) =>
    candidate.unit.id === unitId ? { ...candidate, weapon: definition } : candidate,
  );
}

/** True when any usable weapon can attack at `dist`. */
export function canAttackAtDistance(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
  dist: number,
): boolean {
  return findWeaponForDistance(entry, itemById, dist) !== undefined;
}

/**
 * The weapon to attack with at `dist`: the equipped one when it reaches,
 * otherwise the first usable weapon (inventory order) that reaches.
 */
export function findWeaponForDistance(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
  dist: number,
): ItemDefinition | undefined {
  const reaches = (definition: ItemDefinition | undefined): boolean => {
    if (!definition) return false;
    const range = getAttackRange(entry.unit, definition);
    return range.max > 0 && dist >= range.min && dist <= range.max;
  };
  if (reaches(entry.weapon)) return entry.weapon;
  for (const weapon of getAttackWeapons(entry, itemById)) {
    if (reaches(weapon.definition)) return weapon.definition;
  }
  return undefined;
}
