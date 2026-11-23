import type { SeededRNG } from './rng';
import type { ItemDefinition } from './types';
import type { ExtendedUnitState } from '../data/chapterData';
import type { MapData, Position } from '../grid/types';
import type { TerrainRegistry } from '../grid/terrain';
import { isWeaponUsable, skillIdsOf } from '../class/classRules';
import { getHealBonus } from './skills';
import { awardExperience } from '../progression/experience';
import { getUsableWeapons } from './equip';
import { STAFF_WEX_BY_RANK, gainWeaponExp } from './weaponExp';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };

/**
 * Staff use (PLAN item 89, C10; rules in Game_Design/battle.md
 * "Dùng trượng"): healing staves (Heal/Mend in current data) restore
 * healBase + floor(MAG / healMagDivisor) HP to an ally in staff range.
 * A staff loses 1 use per use and disappears at 0 (PLAN item 84 rule).
 * Healer EXP per use is a [Giả định] (see battle.md): FE3 sources
 * conflict, ROM verification is still owed.
 *
 * Pure helpers: inputs are not mutated; invalid uses return null.
 * Healer EXP per use is declared in data/balance.json (PLAN item 134).
 */
export const STAFF_EXP_PER_USE: number = balanceConfig.staffExpPerUse;

export function isHealStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.healBase !== undefined || definition.healFull === true);
}

/** Warp staff (PLAN item 156, FE11/FE12): declared by `warp` in items.json. */
export function isWarpStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && definition.warp === true;
}

export function getUsableStaves(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ItemDefinition[] {
  const staves: ItemDefinition[] = [];
  for (const item of entry.inventory) {
    const definition = itemById.get(item.itemId);
    if (!definition || definition.type !== 'staff' || item.uses <= 0) continue;
    if (!isWeaponUsable(entry.unit, definition)) continue;
    staves.push(definition);
  }
  return staves;
}

export function getStaffTargets(
  units: readonly ExtendedUnitState[],
  user: ExtendedUnitState,
  staff: ItemDefinition,
  fromPos: Position,
): ExtendedUnitState[] {
  if (isWarpStaff(staff)) {
    // FE11/FE12 Warp: target an ally adjacent to the user (any HP).
    return units.filter((candidate) => {
      if (candidate.unit.faction !== user.unit.faction || candidate.unit.isDead) return false;
      const dist = Math.abs(candidate.unit.position.x - fromPos.x)
        + Math.abs(candidate.unit.position.y - fromPos.y);
      return dist === 1;
    });
  }
  if (!isHealStaff(staff)) return [];
  if (staff.healAllAllies) {
    return units.filter((candidate) => {
      if (candidate.unit.faction !== user.unit.faction || candidate.unit.isDead) return false;
      return candidate.stats.hp < candidate.stats.maxHp;
    });
  }
  return units.filter((candidate) => {
    if (candidate.unit.faction !== user.unit.faction || candidate.unit.isDead) return false;
    if (candidate.stats.hp >= candidate.stats.maxHp) return false;
    const dist = Math.abs(candidate.unit.position.x - fromPos.x)
      + Math.abs(candidate.unit.position.y - fromPos.y);
    return dist >= staff.minRange && dist <= staff.maxRange;
  });
}

/**
 * Return all allies that can be targeted by at least one usable staff (PLAN item 179).
 */
export function getAllStaffTargets(
  units: readonly ExtendedUnitState[],
  user: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
  fromPos: Position,
): ExtendedUnitState[] {
  const usableStaves = getUsableStaves(user, itemById);
  const targetIds = new Set<string>();
  const result: ExtendedUnitState[] = [];
  for (const staff of usableStaves) {
    const list = getStaffTargets(units, user, staff, fromPos);
    for (const t of list) {
      if (!targetIds.has(t.unit.id)) {
        targetIds.add(t.unit.id);
        result.push(t);
      }
    }
  }
  return result;
}

/**
 * Return all usable staves that can target a specific chosen ally (PLAN item 179).
 */
export function getStavesForTarget(
  units: readonly ExtendedUnitState[],
  user: ExtendedUnitState,
  target: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
  fromPos: Position,
): ItemDefinition[] {
  const usableStaves = getUsableStaves(user, itemById);
  return usableStaves.filter((staff) => {
    const validTargets = getStaffTargets(units, user, staff, fromPos);
    return validTargets.some((t) => t.unit.id === target.unit.id);
  });
}

export interface StaffForecast {
  healer: ExtendedUnitState;
  target: ExtendedUnitState;
  staff: ItemDefinition;
  healAmount: number;
  targetHpAfter: number;
  staffRemainingUses: number;
}

/**
 * Pure calculation of staff healing projection (PLAN item 179).
 */
export function calculateStaffForecast(
  healer: ExtendedUnitState,
  target: ExtendedUnitState,
  staff: ItemDefinition,
): StaffForecast {
  const missingHp = Math.max(0, target.stats.maxHp - target.stats.hp);
  const healPotential = staff.healFull
    ? missingHp
    : (staff.healBase ?? 0)
      + Math.floor(healer.stats.mag / (staff.healMagDivisor ?? 1))
      + getHealBonus(skillIdsOf(healer));
  const healAmount = Math.max(0, Math.min(healPotential, missingHp));
  const targetHpAfter = Math.min(target.stats.maxHp, target.stats.hp + healAmount);
  const staffItem = healer.inventory.find((i) => i.itemId === staff.id);
  const staffRemainingUses = Math.max(0, (staffItem?.uses ?? 1) - 1);

  return {
    healer,
    target,
    staff,
    healAmount,
    targetHpAfter,
    staffRemainingUses,
  };
}

/**
 * Warp destinations (PLAN item 156): every tile the target can stand on —
 * passable for its movement type and not occupied by a living unit.
 */
export function getWarpDestinations(
  units: readonly ExtendedUnitState[],
  target: ExtendedUnitState,
  map: MapData,
  terrains: TerrainRegistry,
): Position[] {
  const occupied = new Set(
    units
      .filter((entry) => !entry.unit.isDead)
      .map((entry) => `${entry.unit.position.x},${entry.unit.position.y}`),
  );
  const destinations: Position[] = [];
  for (let y = 0; y < map.grid.length; y++) {
    for (let x = 0; x < (map.grid[y]?.length ?? 0); x++) {
      if (occupied.has(`${x},${y}`)) continue;
      const terrainId = map.grid[y]![x]!;
      if (!terrains.isPassable(terrainId, target.unit.moveType, target.unit.classId)) continue;
      destinations.push({ x, y });
    }
  }
  return destinations;
}

export interface WarpUseResult {
  units: ExtendedUnitState[];
  messages: string[];
}

/**
 * Apply a Warp (PLAN item 156): move the adjacent ally to the chosen tile,
 * spend one staff use, award the usual staff EXP/WEx. Pure; invalid uses
 * return null.
 */
export function applyWarpUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  destination: Position,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
  map: MapData,
  terrains: TerrainRegistry,
): WarpUseResult | null {
  const user = units.find((candidate) => candidate.unit.id === userId);
  const target = units.find((candidate) => candidate.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || !target || !staff || !isWarpStaff(staff)) return null;
  if (!getUsableStaves(user, itemById).some((candidate) => candidate.id === staffId)) return null;
  if (!getStaffTargets(units, user, staff, user.unit.position).some((candidate) => candidate.unit.id === targetId)) {
    return null;
  }
  if (!getWarpDestinations(units, target, map, terrains)
    .some((pos) => pos.x === destination.x && pos.y === destination.y)) {
    return null;
  }

  const staffIndex = user.inventory.findIndex((item) => item.itemId === staffId);
  const staffEntry = user.inventory[staffIndex]!;
  const remaining = staffEntry.uses - 1;
  const nextInventory = remaining > 0
    ? user.inventory.map((item, index) => (index === staffIndex ? { ...item, uses: remaining } : item))
    : user.inventory.filter((_, index) => index !== staffIndex);

  let nextUser: ExtendedUnitState = { ...user, inventory: nextInventory };
  if (remaining <= 0 && user.weapon?.id === staffId) {
    const firstUsable = getUsableWeapons(nextUser, itemById)[0];
    nextUser = { ...nextUser, weapon: firstUsable?.definition };
  }
  const awarded = awardExperience(nextUser, STAFF_EXP_PER_USE, rng);
  nextUser = gainWeaponExp(awarded.entry, 'staff', STAFF_WEX_BY_RANK[staff.requiredRank ?? 'E']);

  const nextTarget: ExtendedUnitState = {
    ...target,
    unit: { ...target.unit, position: { ...destination } },
  };

  const messages = [
    `${user.unit.name} used ${staff.name} on ${target.unit.name}`,
    `${user.unit.name} +${STAFF_EXP_PER_USE} EXP${awarded.gainedLevel ? ` — Level Up! Lv.${nextUser.level}` : ''}`,
  ];

  return {
    units: units.map((candidate) => {
      if (candidate.unit.id === userId) return nextUser;
      if (candidate.unit.id === targetId) return nextTarget;
      return candidate;
    }),
    messages,
  };
}

export interface StaffUseResult {
  units: ExtendedUnitState[];
  healed: number;
  messages: string[];
}

/**
 * Fortify staff use (PLAN item 209, FE11): heals (Magic/2 + 8) HP to all living wounded allies
 * across the map, spends exactly 1 staff use, awards staff EXP and WEx once.
 */
export function applyFortifyUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): StaffUseResult | null {
  const user = units.find((candidate) => candidate.unit.id === userId);
  const staff = itemById.get(staffId);
  if (!user || !staff || !isHealStaff(staff) || !staff.healAllAllies) return null;
  if (!getUsableStaves(user, itemById).some((candidate) => candidate.id === staffId)) return null;

  const woundedTargets = getStaffTargets(units, user, staff, user.unit.position);
  if (woundedTargets.length === 0) return null;

  const healPotential = (staff.healBase ?? 0)
    + Math.floor(user.stats.mag / (staff.healMagDivisor ?? 1))
    + getHealBonus(skillIdsOf(user));

  const staffIndex = user.inventory.findIndex((item) => item.itemId === staffId);
  const staffEntry = user.inventory[staffIndex]!;
  const remaining = staffEntry.uses - 1;
  const nextInventory = remaining > 0
    ? user.inventory.map((item, index) => (index === staffIndex ? { ...item, uses: remaining } : item))
    : user.inventory.filter((_, index) => index !== staffIndex);

  let nextUser: ExtendedUnitState = { ...user, inventory: nextInventory };
  if (remaining <= 0 && user.weapon?.id === staffId) {
    const firstUsable = getUsableWeapons(nextUser, itemById)[0];
    nextUser = { ...nextUser, weapon: firstUsable?.definition };
  }
  const awarded = awardExperience(nextUser, STAFF_EXP_PER_USE, rng);
  nextUser = gainWeaponExp(awarded.entry, 'staff', STAFF_WEX_BY_RANK[staff.requiredRank ?? 'E']);

  let totalHealed = 0;
  const woundedIds = new Set(woundedTargets.map((t) => t.unit.id));

  const nextUnits = units.map((candidate) => {
    if (candidate.unit.id === userId) {
      if (woundedIds.has(candidate.unit.id)) {
        const healed = Math.min(healPotential, candidate.stats.maxHp - candidate.stats.hp);
        totalHealed += healed;
        return { ...nextUser, stats: { ...nextUser.stats, hp: nextUser.stats.hp + healed } };
      }
      return nextUser;
    }
    if (woundedIds.has(candidate.unit.id)) {
      const healed = Math.min(healPotential, candidate.stats.maxHp - candidate.stats.hp);
      totalHealed += healed;
      return { ...candidate, stats: { ...candidate.stats, hp: candidate.stats.hp + healed } };
    }
    return candidate;
  });

  const messages = [
    `${user.unit.name} used ${staff.name}`,
    `${user.unit.name} +${STAFF_EXP_PER_USE} EXP${awarded.gainedLevel ? ` — Level Up! Lv.${nextUser.level}` : ''}`,
  ];

  return {
    units: nextUnits,
    healed: totalHealed,
    messages,
  };
}

export function applyStaffUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): StaffUseResult | null {
  const staff = itemById.get(staffId);
  if (staff?.healAllAllies) {
    return applyFortifyUse(units, userId, staffId, itemById, rng);
  }

  const user = units.find((candidate) => candidate.unit.id === userId);
  const target = units.find((candidate) => candidate.unit.id === targetId);
  if (!user || !target || !staff || !isHealStaff(staff)) return null;
  if (!getUsableStaves(user, itemById).some((candidate) => candidate.id === staffId)) return null;
  if (!getStaffTargets(units, user, staff, user.unit.position).some((candidate) => candidate.unit.id === targetId)) {
    return null;
  }

  const missingHp = Math.max(0, target.stats.maxHp - target.stats.hp);
  const healAmount = staff.healFull
    ? missingHp
    : (staff.healBase ?? 0)
      + Math.floor(user.stats.mag / (staff.healMagDivisor ?? 1))
      + getHealBonus(skillIdsOf(user));
  const healed = Math.min(healAmount, missingHp);

  const staffIndex = user.inventory.findIndex((item) => item.itemId === staffId);
  const staffEntry = user.inventory[staffIndex]!;
  const remaining = staffEntry.uses - 1;
  const nextInventory = remaining > 0
    ? user.inventory.map((item, index) => (index === staffIndex ? { ...item, uses: remaining } : item))
    : user.inventory.filter((_, index) => index !== staffIndex);

  let nextUser: ExtendedUnitState = { ...user, inventory: nextInventory };
  if (remaining <= 0 && user.weapon?.id === staffId) {
    const firstUsable = getUsableWeapons(nextUser, itemById)[0];
    nextUser = { ...nextUser, weapon: firstUsable?.definition };
  }
  const awarded = awardExperience(nextUser, STAFF_EXP_PER_USE, rng);
  nextUser = gainWeaponExp(awarded.entry, 'staff', STAFF_WEX_BY_RANK[staff.requiredRank ?? 'E']);

  const nextTarget: ExtendedUnitState = target.unit.id === userId
    ? { ...nextUser, stats: { ...nextUser.stats, hp: nextUser.stats.hp + healed } }
    : { ...target, stats: { ...target.stats, hp: target.stats.hp + healed } };

  const messages = [
    `${user.unit.name} used ${staff.name} on ${target.unit.name}: +${healed} HP`,
    `${user.unit.name} +${STAFF_EXP_PER_USE} EXP${awarded.gainedLevel ? ` — Level Up! Lv.${nextUser.level}` : ''}`,
  ];

  return {
    units: units.map((candidate) => {
      if (candidate.unit.id === userId) return target.unit.id === userId ? nextTarget : nextUser;
      if (candidate.unit.id === targetId) return nextTarget;
      return candidate;
    }),
    healed,
    messages,
  };
}
