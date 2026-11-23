import type { SeededRNG } from './rng';
import type { ItemDefinition, StatusEffect } from './types';
import type { ExtendedUnitState, InventoryEntry } from '../data/chapterData';
import type { MapData, Position } from '../grid/types';
import { defaultTerrainRegistry, type TerrainRegistry } from '../grid/terrain';
import { getClassDefinition, isWeaponUsable, skillIdsOf } from '../class/classRules';
import { getHealBonus } from './skills';
import { awardExperience } from '../progression/experience';
import { getUsableWeapons } from './equip';
import { STAFF_WEX_BY_RANK, gainWeaponExp } from './weaponExp';
import { getManhattanDistance } from './calculator';
import { freeTileNear, type ChapterChest, type ChapterDoor, type ChapterState, type GameEvent } from '../chapter/events';
import { CONVOY_SLOTS, sendToConvoy } from '../data/convoy';
import { addItemToInventory, hasRoomFor } from '../data/inventory';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };
import classesJson from '../../../data/classes.json' with { type: 'json' };

export { tickStatusEffects } from '../turn/statusEffects';

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

/** Rescue staff (PLAN item 209, FE12): declared by `rescue` in items.json. */
export function isRescueStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.rescue === true || definition.id === 'rescue_staff');
}

/** Unlock staff (PLAN item 209, FE12): declared by `unlock` in items.json. */
export function isUnlockStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.unlock === true || definition.id === 'unlock_staff');
}

/** Thief staff (PLAN item 209, FE12): declared by `thief` in items.json. */
export function isThiefStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.thief === true || definition.id === 'thief_staff');
}

/** Hammerne staff (PLAN item 209, FE12): declared by `hammerne` in items.json. */
export function isHammerneStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.hammerne === true || definition.id === 'hammerne_staff');
}

/** Aum staff (PLAN item 209, FE12): declared by `aum` in items.json. */
export function isAumStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.aum === true || definition.id === 'aum_staff');
}

/** Barrier staff (PLAN item 209, FE12): declared by `barrier` in items.json. */
export function isBarrierStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.barrier === true || definition.id === 'barrier_staff');
}

/** Silence staff (PLAN item 209, FE12): declared by `silence` in items.json. */
export function isSilenceStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.silence === true || definition.id === 'silence_staff');
}

/** Again staff (PLAN item 209, FE12): declared by `again` in items.json. */
export function isAgainStaff(definition: ItemDefinition): boolean {
  return definition.type === 'staff' && (definition.again === true || definition.id === 'again_staff');
}

export function isSilenced(entry: ExtendedUnitState): boolean {
  return Boolean(entry.statusEffects?.some((e) => e.type === 'silence' && e.duration > 0));
}

function getClassMaxRes(classId?: string): number {
  if (!classId) return 30;
  const def = getClassDefinition(classId) as unknown as { maxStats?: Record<string, number> } | undefined;
  if (typeof def?.maxStats?.res === 'number') {
    return def.maxStats.res;
  }
  const cls = (classesJson.classes as readonly { id: string; maxStats?: { res?: number } }[]).find((c) => c.id === classId);
  return cls?.maxStats?.res ?? balanceConfig.statCaps.stat ?? 30;
}

export function getUsableStaves(
  entry: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
): ItemDefinition[] {
  if (isSilenced(entry)) {
    return [];
  }
  const staves: ItemDefinition[] = [];
  for (const item of entry.inventory) {
    const definition = itemById.get(item.itemId);
    if (!definition || definition.type !== 'staff' || item.uses <= 0) continue;
    if (!isWeaponUsable(entry.unit, definition)) continue;
    if (definition.usableByCharacterIds && !definition.usableByCharacterIds.includes(entry.unit.id)) continue;
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
      return getManhattanDistance(candidate.unit.position, fromPos) === 1;
    });
  }
  if (isRescueStaff(staff)) {
    // FE12 Rescue: target any living ally on the map except the caster themselves.
    return units.filter((candidate) => {
      return candidate.unit.faction === user.unit.faction && !candidate.unit.isDead && candidate.unit.id !== user.unit.id;
    });
  }
  if (isHammerneStaff(staff)) {
    // FE12 Hammerne: target an adjacent living ally.
    return units.filter((candidate) => {
      if (candidate.unit.faction !== user.unit.faction || candidate.unit.isDead) return false;
      return getManhattanDistance(candidate.unit.position, fromPos) === 1;
    });
  }
  if (isAumStaff(staff)) {
    // FE12 Aum: target a fallen ally.
    return units.filter((candidate) => {
      return candidate.unit.faction === user.unit.faction && Boolean(candidate.unit.isDead);
    });
  }
  if (isBarrierStaff(staff)) {
    // FE12 Barrier: target an adjacent living ally.
    return units.filter((candidate) => {
      if (candidate.unit.faction !== user.unit.faction || candidate.unit.isDead) return false;
      return getManhattanDistance(candidate.unit.position, fromPos) === 1;
    });
  }
  if (isSilenceStaff(staff)) {
    // FE12 Silence: target a living enemy unit in range (whole map, 1..99).
    return units.filter((candidate) => {
      if (candidate.unit.faction === user.unit.faction || candidate.unit.isDead) return false;
      const dist = getManhattanDistance(candidate.unit.position, fromPos);
      return dist >= staff.minRange && dist <= staff.maxRange;
    });
  }
  if (isAgainStaff(staff)) {
    // FE12 Again: target an ally who has already acted, not the user themselves.
    return units.filter((candidate) => {
      if (candidate.unit.faction !== user.unit.faction || candidate.unit.isDead) return false;
      if (candidate.unit.id === user.unit.id) return false;
      if (!candidate.unit.hasActed) return false;
      const dist = getManhattanDistance(candidate.unit.position, fromPos);
      return dist >= staff.minRange && dist <= staff.maxRange;
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
    const dist = getManhattanDistance(candidate.unit.position, fromPos);
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

function spendStaff(
  user: ExtendedUnitState,
  staffId: string,
  staff: ItemDefinition,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): { user: ExtendedUnitState; expMsg: string } | null {
  const staffIndex = user.inventory.findIndex((item) => item.itemId === staffId);
  if (staffIndex < 0) return null;
  const staffEntry = user.inventory[staffIndex]!;
  if (staffEntry.uses <= 0) return null;
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
  const expMsg = `${user.unit.name} +${STAFF_EXP_PER_USE} EXP${awarded.gainedLevel ? ` — Level Up! Lv.${nextUser.level}` : ''}`;
  return { user: nextUser, expMsg };
}

export interface RescueUseResult {
  units: ExtendedUnitState[];
  destination: Position;
  messages: string[];
}

/**
 * Rescue staff (PLAN item 209, FE12): pull any living ally on the map to the nearest
 * traversable free tile next to the caster.
 */
export function applyRescueUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
  map: MapData,
  terrains: TerrainRegistry = defaultTerrainRegistry,
): RescueUseResult | null {
  const user = units.find((c) => c.unit.id === userId);
  const target = units.find((c) => c.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || !target || !staff || !isRescueStaff(staff)) return null;
  if (user.unit.isDead || target.unit.isDead || target.unit.faction !== user.unit.faction || target.unit.id === user.unit.id) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;

  const destination = freeTileNear(units, user.unit.position, target.unit.moveType, map, target.unit.classId, terrains);
  if (!destination) return null;

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const nextTarget: ExtendedUnitState = {
    ...target,
    unit: { ...target.unit, position: { ...destination } },
  };

  return {
    units: units.map((c) => (c.unit.id === userId ? spent.user : c.unit.id === targetId ? nextTarget : c)),
    destination,
    messages: [
      `${user.unit.name} used ${staff.name} on ${target.unit.name}`,
      spent.expMsg,
    ],
  };
}

export interface UnlockUseResult {
  state: ChapterState;
  events: GameEvent[];
  messages: string[];
}

/**
 * Unlock staff (PLAN item 209, FE12): open a closed door 1-2 tiles away without a key.
 */
export function applyUnlockUse(
  state: ChapterState,
  userId: string,
  door: ChapterDoor,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): UnlockUseResult | null {
  const user = state.units.find((c) => c.unit.id === userId);
  const staff = itemById.get(staffId);
  if (!user || user.unit.isDead || !staff || !isUnlockStaff(staff)) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;
  if ((state.doorStates?.[door.id] ?? 'closed') !== 'closed') return null;

  const dist = getManhattanDistance(user.unit.position, door.position);
  if (dist < (staff.minRange ?? 1) || dist > (staff.maxRange ?? 2)) return null;

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const nextUnits = state.units.map((c) => (c.unit.id === userId ? spent.user : c));
  const nextDoorStates = { ...state.doorStates, [door.id]: 'opened' as const };
  const event: GameEvent = {
    type: 'door_opened',
    unitId: userId,
    unitName: user.unit.name,
    doorId: door.id,
  };

  return {
    state: { ...state, units: nextUnits, doorStates: nextDoorStates },
    events: [event],
    messages: [
      `${user.unit.name} unlocked ${door.id} with ${staff.name}`,
      spent.expMsg,
    ],
  };
}

export interface ThiefUseResult {
  state: ChapterState;
  convoy: InventoryEntry[];
  events: GameEvent[];
  messages: string[];
}

/**
 * Thief staff (PLAN item 209, FE12): open any closed chest on the map; reward goes to caster,
 * or convoy if inventory is full; returns null if both are full.
 */
export function applyThiefUse(
  state: ChapterState,
  convoy: readonly InventoryEntry[],
  userId: string,
  chest: ChapterChest,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): ThiefUseResult | null {
  const user = state.units.find((c) => c.unit.id === userId);
  const staff = itemById.get(staffId);
  if (!user || user.unit.isDead || !staff || !isThiefStaff(staff)) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;
  if ((state.chestStates?.[chest.id] ?? 'closed') !== 'closed') return null;

  const reward = chest.reward;
  const events: GameEvent[] = [];
  let userWithReward = user;
  let nextConvoy = [...convoy];
  let nextGold = state.gold;

  if (reward.type === 'gold') {
    const amount = reward.amount ?? 0;
    nextGold += amount;
    events.push({ type: 'gold_gained', unitId: userId, amount, source: 'chest' });
  } else if (reward.type === 'item') {
    const itemId = reward.itemId;
    if (!itemId) return null;
    const itemDef = itemById.get(itemId);
    const maxUses = itemDef?.maxUses ?? 1;
    const itemName = itemDef?.name ?? itemId;

    if (hasRoomFor(user, itemId, itemById)) {
      const added = addItemToInventory(user, itemId, maxUses, itemById);
      if (!added) return null;
      userWithReward = added;
      events.push({
        type: 'item_gained',
        unitId: userId,
        unitName: user.unit.name,
        itemId,
        itemName,
        source: 'chest',
      });
    } else if (convoy.length < CONVOY_SLOTS) {
      const convoyAdded = sendToConvoy(convoy, itemId, maxUses);
      if (!convoyAdded) return null;
      nextConvoy = convoyAdded;
      events.push({
        type: 'item_gained',
        unitId: userId,
        unitName: user.unit.name,
        itemId,
        itemName,
        source: 'chest',
      });
    } else {
      return null;
    }
  }

  const spent = spendStaff(userWithReward, staffId, staff, itemById, rng);
  if (!spent) return null;

  const nextUnits = state.units.map((c) => (c.unit.id === userId ? spent.user : c));
  const nextChestStates = { ...state.chestStates, [chest.id]: 'opened' as const };
  events.push({
    type: 'chest_opened',
    unitId: userId,
    unitName: user.unit.name,
    chestId: chest.id,
  });

  return {
    state: {
      ...state,
      units: nextUnits,
      gold: nextGold,
      chestStates: nextChestStates,
    },
    convoy: nextConvoy,
    events,
    messages: [
      `${user.unit.name} opened chest ${chest.id} with ${staff.name}`,
      spent.expMsg,
    ],
  };
}

export interface HammerneUseResult {
  units: ExtendedUnitState[];
  messages: string[];
}

/**
 * Hammerne staff (PLAN item 209, FE12): fully repair a weapon or staff of an adjacent ally.
 */
export function applyHammerneUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  targetItemIndex: number,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): HammerneUseResult | null {
  const user = units.find((c) => c.unit.id === userId);
  const target = units.find((c) => c.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || user.unit.isDead || !target || target.unit.isDead || !staff || !isHammerneStaff(staff)) return null;
  if (target.unit.faction !== user.unit.faction) return null;
  if (getManhattanDistance(user.unit.position, target.unit.position) !== 1) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;

  const targetItem = target.inventory[targetItemIndex];
  if (!targetItem || targetItem.uses <= 0) return null;
  const targetDef = itemById.get(targetItem.itemId);
  if (!targetDef || targetDef.type === 'consumable') return null;
  if (targetItem.uses >= targetDef.maxUses) return null;

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const repairedItem = { ...targetItem, uses: targetDef.maxUses };
  const nextTargetInventory = target.inventory.map((item, idx) => (idx === targetItemIndex ? repairedItem : item));
  const nextTarget: ExtendedUnitState = {
    ...target,
    inventory: nextTargetInventory,
  };

  return {
    units: units.map((c) => (c.unit.id === userId ? spent.user : c.unit.id === targetId ? nextTarget : c)),
    messages: [
      `${user.unit.name} repaired ${target.unit.name}'s ${targetDef.name} with ${staff.name}`,
      spent.expMsg,
    ],
  };
}

export interface AumUseResult {
  units: ExtendedUnitState[];
  destination: Position;
  messages: string[];
}

/**
 * Aum staff (PLAN item 209, FE12): revive a fallen ally to max HP next to the caster;
 * the revived unit has already acted for the turn.
 */
export function applyAumUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
  map: MapData,
  terrains: TerrainRegistry = defaultTerrainRegistry,
): AumUseResult | null {
  const user = units.find((c) => c.unit.id === userId);
  const target = units.find((c) => c.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || user.unit.isDead || !target || !target.unit.isDead || !staff || !isAumStaff(staff)) return null;
  if (target.unit.faction !== user.unit.faction) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;

  const destination = freeTileNear(units, user.unit.position, target.unit.moveType, map, target.unit.classId, terrains);
  if (!destination) return null;

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const nextTarget: ExtendedUnitState = {
    ...target,
    unit: {
      ...target.unit,
      isDead: false,
      position: { ...destination },
      hasActed: true,
    },
    stats: {
      ...target.stats,
      hp: target.stats.maxHp,
    },
  };

  return {
    units: units.map((c) => (c.unit.id === userId ? spent.user : c.unit.id === targetId ? nextTarget : c)),
    destination,
    messages: [
      `${user.unit.name} revived ${target.unit.name} with ${staff.name}`,
      spent.expMsg,
    ],
  };
}

export interface BarrierUseResult {
  readonly units: ExtendedUnitState[];
  readonly user: ExtendedUnitState;
  readonly target: ExtendedUnitState;
  readonly resBoost: number;
  readonly messages: readonly string[];
}

/**
 * Barrier staff (PLAN item 209, FE12): raises an adjacent ally's Res by 7,
 * decreasing by 1 each turn until 0 (7 turns). Does not exceed the target's
 * class Res cap, and does not stack with an existing Barrier (resets to 7).
 */
export function applyBarrierUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): BarrierUseResult | null {
  const user = units.find((c) => c.unit.id === userId);
  const target = units.find((c) => c.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || !target || !staff || !isBarrierStaff(staff)) return null;
  if (user.unit.isDead || target.unit.isDead || target.unit.faction !== user.unit.faction) return null;
  if (getManhattanDistance(user.unit.position, target.unit.position) !== 1) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;

  const classMaxRes = getClassMaxRes(target.unit.classId);
  const existingBarrier = (target.statusEffects ?? []).find((e) => e.type === 'barrier');
  const baseRes = existingBarrier ? target.stats.res - existingBarrier.value : target.stats.res;
  const newBoost = Math.max(0, Math.min(7, classMaxRes - baseRes));
  const newRes = baseRes + newBoost;

  const otherEffects = (target.statusEffects ?? []).filter((e) => e.type !== 'barrier');
  const nextEffects: StatusEffect[] = [...otherEffects, { type: 'barrier', value: newBoost, duration: 7 }];

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const nextTarget: ExtendedUnitState = {
    ...target,
    stats: { ...target.stats, res: newRes },
    statusEffects: nextEffects,
  };

  const nextUser = userId === targetId ? { ...spent.user, stats: nextTarget.stats, statusEffects: nextEffects } : spent.user;

  return {
    units: units.map((c) => (c.unit.id === userId ? nextUser : c.unit.id === targetId ? nextTarget : c)),
    user: nextUser,
    target: nextTarget,
    resBoost: newBoost,
    messages: [
      `${user.unit.name} used ${staff.name} on ${target.unit.name}: Res +${newBoost}`,
      spent.expMsg,
    ],
  };
}

export interface SilenceUseResult {
  readonly units: ExtendedUnitState[];
  readonly user: ExtendedUnitState;
  readonly target: ExtendedUnitState;
  readonly messages: readonly string[];
}

/**
 * Silence staff (PLAN item 209, FE12): prevents a chosen enemy unit from using
 * tomes and staves for 1 turn. Map-wide range (1..99).
 */
export function applySilenceUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): SilenceUseResult | null {
  const user = units.find((c) => c.unit.id === userId);
  const target = units.find((c) => c.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || !target || !staff || !isSilenceStaff(staff)) return null;
  if (user.unit.isDead || target.unit.isDead) return null;
  if (target.unit.faction === user.unit.faction) return null;
  const distance = getManhattanDistance(user.unit.position, target.unit.position);
  if (distance < staff.minRange || distance > staff.maxRange) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const otherEffects = (target.statusEffects ?? []).filter((e) => e.type !== 'silence');
  const nextEffects: StatusEffect[] = [...otherEffects, { type: 'silence', value: 1, duration: 1 }];

  const nextTarget: ExtendedUnitState = {
    ...target,
    statusEffects: nextEffects,
  };

  return {
    units: units.map((c) => (c.unit.id === userId ? spent.user : c.unit.id === targetId ? nextTarget : c)),
    user: spent.user,
    target: nextTarget,
    messages: [
      `${user.unit.name} used ${staff.name} on ${target.unit.name}: Silenced!`,
      spent.expMsg,
    ],
  };
}

export interface AgainUseResult {
  readonly units: ExtendedUnitState[];
  readonly user: ExtendedUnitState;
  readonly target: ExtendedUnitState;
  readonly messages: readonly string[];
}

/**
 * Again staff (PLAN item 209, FE12): lets one ally who has already acted in
 * the current turn act again (hasActed = false). Range All (1..99).
 * Cannot target the user, and cannot target an unacted ally (returns null).
 */
export function applyAgainUse(
  units: readonly ExtendedUnitState[],
  userId: string,
  targetId: string,
  staffId: string,
  itemById: ReadonlyMap<string, ItemDefinition>,
  rng: SeededRNG,
): AgainUseResult | null {
  const user = units.find((c) => c.unit.id === userId);
  const target = units.find((c) => c.unit.id === targetId);
  const staff = itemById.get(staffId);
  if (!user || !target || !staff || !isAgainStaff(staff)) return null;
  if (user.unit.isDead || target.unit.isDead) return null;
  if (target.unit.faction !== user.unit.faction) return null;
  if (target.unit.id === user.unit.id) return null;
  if (!target.unit.hasActed) return null;

  const distance = getManhattanDistance(user.unit.position, target.unit.position);
  if (distance < staff.minRange || distance > staff.maxRange) return null;
  if (!getUsableStaves(user, itemById).some((c) => c.id === staffId)) return null;

  const spent = spendStaff(user, staffId, staff, itemById, rng);
  if (!spent) return null;

  const nextTarget: ExtendedUnitState = {
    ...target,
    unit: {
      ...target.unit,
      hasActed: false,
      hasTraded: false,
      hasStored: false,
    },
  };

  return {
    units: units.map((c) => (c.unit.id === userId ? spent.user : c.unit.id === targetId ? nextTarget : c)),
    user: spent.user,
    target: nextTarget,
    messages: [
      `${user.unit.name} used ${staff.name} on ${target.unit.name}`,
      spent.expMsg,
    ],
  };
}
