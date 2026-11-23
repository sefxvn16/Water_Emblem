import itemsJson from '../../../data/items.json' with { type: 'json' };
import { calculateCombatForecast, executeCombat, getManhattanDistance } from '../combat/calculator';
import {
  resolveCombatConsequences,
  type CombatResolutionResult,
  type CombatSoundCue,
  type LevelUpEvent,
} from '../combat/combatResolution';
import { equipWeapon } from '../combat/equip';
import type { CombatForecast, CombatResult, ItemDefinition } from '../combat/types';
import type { SeededRNG } from '../combat/rng';
import { defaultRNG } from '../combat/rng';
import {
  changeMountedState,
  getAttackRange,
  isWeaponUsable,
  promoteWithoutItem,
  skillIdsOf,
  useVulnerary,
} from '../class/classRules';
import { getSkillModifiers } from '../combat/skills';
import { defaultTerrainRegistry, getElevation } from '../grid/terrain';
import type { MapData, Position } from '../grid/types';
import type { ExtendedUnitState, ChapterData } from '../data/chapterData';
import type { DialogueTable, GameEvent, VillageState, ChestState, DoorState } from '../chapter/events';
import { bossStartEvent } from '../chapter/events';

export interface PlayerActionState {
  readonly units: readonly ExtendedUnitState[];
  readonly mapData?: MapData;
  readonly gold?: number;
  readonly villageStates?: Readonly<Record<string, VillageState>>;
  readonly chestStates?: Readonly<Record<string, ChestState>>;
  readonly doorStates?: Readonly<Record<string, DoorState>>;
  readonly chapter?: ChapterData;
  readonly dialogues?: DialogueTable;
  readonly itemById?: ReadonlyMap<string, ItemDefinition>;
  readonly items?: readonly ItemDefinition[];
}

export interface PlayerActionResult {
  readonly state: PlayerActionState & { readonly units: ExtendedUnitState[] };
  readonly events: readonly GameEvent[];
  readonly rawCombatResult?: CombatResult;
  readonly soundCues?: readonly CombatSoundCue[];
  readonly logs?: readonly string[];
  readonly levelUps?: readonly LevelUpEvent[];
}

export interface AttackActionInput {
  readonly attackerId: string;
  readonly defenderId: string;
  readonly weaponId?: string;
  readonly forecast?: CombatForecast;
}

/**
 * Pure player action: Attack (PLAN item 55).
 * Validates range and weapon usability, calculates forecast if omitted,
 * executes combat, resolves consequences, sets attacker hasActed to true,
 * and emits GameEvent items.
 */
export function attack(
  state: PlayerActionState,
  input: AttackActionInput,
  rng: SeededRNG = defaultRNG,
): PlayerActionResult | null {
  const attacker = state.units.find((u) => u.unit.id === input.attackerId);
  const defender = state.units.find((u) => u.unit.id === input.defenderId);
  if (!attacker || !defender) return null;
  if (attacker.unit.isDead || defender.unit.isDead) return null;
  if (attacker.unit.hasActed) return null;

  const itemCatalog = state.itemById ?? new Map(((state.items ?? (itemsJson.items as ItemDefinition[]))).map((item) => [item.id, item]));
  const itemsList = state.items ?? (itemsJson.items as ItemDefinition[]);

  let workingUnits = state.units;
  let activeAttacker = attacker;

  if (input.weaponId && attacker.weapon?.id !== input.weaponId) {
    workingUnits = equipWeapon(workingUnits, attacker.unit.id, input.weaponId, itemCatalog);
    activeAttacker = workingUnits.find((u) => u.unit.id === attacker.unit.id) ?? attacker;
    if (activeAttacker.weapon?.id !== input.weaponId) return null;
  }

  const weapon = activeAttacker.weapon;
  if (!weapon || !isWeaponUsable(activeAttacker.unit, weapon)) return null;

  const distance = getManhattanDistance(activeAttacker.unit.position, defender.unit.position);
  const attackerTerrain = state.mapData?.grid[activeAttacker.unit.position.y]?.[activeAttacker.unit.position.x] ?? 'plains';
  const range = getAttackRange(activeAttacker.unit, weapon, attackerTerrain);
  if (distance < range.min || distance > range.max) return null;

  let forecast = input.forecast;
  if (!forecast) {
    const defenderTerrain = state.mapData?.grid[defender.unit.position.y]?.[defender.unit.position.x] ?? 'plains';
    const allGridUnits = workingUnits.map((u) => u.unit);
    const allySkillIds = new Map(workingUnits.map((u) => [u.unit.id, skillIdsOf(u)]));
    const attackerMods = getSkillModifiers(skillIdsOf(activeAttacker), activeAttacker.unit, activeAttacker.stats, weapon, defender.weapon, true, allGridUnits, allySkillIds, activeAttacker.level);
    const defenderMods = getSkillModifiers(skillIdsOf(defender), defender.unit, defender.stats, defender.weapon, weapon, false, allGridUnits, allySkillIds, defender.level);
    const holds = (entry: ExtendedUnitState, itemId: string) => entry.inventory.some((i) => i.itemId === itemId);
    const elevations = state.mapData ? { attacker: getElevation(state.mapData, activeAttacker.unit.position), defender: getElevation(state.mapData, defender.unit.position) } : undefined;
    forecast = calculateCombatForecast(
      activeAttacker.unit,
      activeAttacker.stats,
      weapon,
      defender.unit,
      defender.stats,
      defender.weapon,
      distance,
      defaultTerrainRegistry,
      attackerTerrain,
      defenderTerrain,
      allGridUnits,
      elevations,
      { attacker: attackerMods, defender: defenderMods },
      {
        attackerHasLight: holds(activeAttacker, 'lightsphere'),
        attackerHasDark: holds(activeAttacker, 'darksphere'),
        defenderHasLight: holds(defender, 'lightsphere'),
        defenderHasDark: holds(defender, 'darksphere'),
        attackerHasIoteShield: holds(activeAttacker, 'iote_shield'),
        defenderHasIoteShield: holds(defender, 'iote_shield'),
      },
    );
  }

  const hpBefore = { attacker: activeAttacker.stats.hp, defender: defender.stats.hp };
  const rawResult = executeCombat(forecast, rng);

  const resolution: CombatResolutionResult = resolveCombatConsequences({
    units: workingUnits,
    result: rawResult,
    rng,
    itemById: itemCatalog,
    itemsList,
    chapter: state.chapter,
    dialogues: (state.dialogues ?? {}) as DialogueTable,
    gold: state.gold ?? 0,
    villageStates: (state.villageStates ?? {}) as Record<string, VillageState>,
  });

  const updatedUnits = resolution.units.map((u) =>
    u.unit.id === activeAttacker.unit.id ? { ...u, unit: { ...u.unit, hasActed: true } } : u
  );

  const events: GameEvent[] = [];
  if (state.dialogues) {
    const startEvent = bossStartEvent(state.dialogues, defender.unit.id, defender.unit.name);
    if (startEvent) events.push(startEvent);
  }

  events.push({
    type: 'attack_resolved',
    attackerId: activeAttacker.unit.id,
    defenderId: defender.unit.id,
    strikes: rawResult.events.map((ev) => ({
      attackerId: ev.attackerId,
      defenderId: ev.defenderId,
      isHit: ev.isHit,
      isCrit: ev.isCrit,
      damageDealt: ev.damageDealt,
      defenderHpAfter: ev.defenderHpAfter,
    })),
    hpBefore,
    hpAfter: {
      attacker: updatedUnits.find((u) => u.unit.id === activeAttacker.unit.id)?.stats.hp ?? 0,
      defender: updatedUnits.find((u) => u.unit.id === defender.unit.id)?.stats.hp ?? 0,
    },
  });

  if (resolution.defeatedUnitId) {
    const dead = updatedUnits.find((u) => u.unit.id === resolution.defeatedUnitId);
    if (dead) {
      events.push({
        type: 'unit_died',
        unitId: dead.unit.id,
        unitName: dead.unit.name,
        faction: dead.unit.faction,
      });
    }
  }

  if (resolution.defeatEvents.length > 0) {
    events.push(...resolution.defeatEvents);
  }

  if (resolution.levelUps && resolution.levelUps.length > 0) {
    for (const lu of resolution.levelUps) {
      events.push({
        type: 'level_up',
        unitId: lu.unit.unit.id,
        unitName: lu.unit.unit.name,
        newLevel: lu.newLevel,
        statGains: lu.statGains,
      });
    }
  }

  const logs: string[] = [];
  logs.push(`⚔️ ENGAGEMENT: ${activeAttacker.unit.name} vs ${defender.unit.name}`);
  logs.push(...resolution.logs);

  return {
    state: {
      ...state,
      units: updatedUnits,
      gold: resolution.gold,
      villageStates: resolution.villageStates,
    },
    events,
    rawCombatResult: rawResult,
    soundCues: resolution.soundCues,
    logs,
    levelUps: resolution.levelUps,
  };
}

export interface WaitActionInput {
  readonly unitId: string;
}

/**
 * Pure player action: Wait (PLAN item 55).
 * Sets unit hasActed to true without changing other attributes.
 */
export function wait(
  state: PlayerActionState,
  input: WaitActionInput,
): PlayerActionResult | null {
  const unit = state.units.find((u) => u.unit.id === input.unitId);
  if (!unit || unit.unit.isDead || unit.unit.hasActed) return null;
  const updatedUnits = state.units.map((u) =>
    u.unit.id === input.unitId ? { ...u, unit: { ...u.unit, hasActed: true } } : u
  );
  return {
    state: {
      ...state,
      units: updatedUnits,
    },
    events: [],
  };
}

export interface UseItemActionInput {
  readonly unitId: string;
  readonly itemId: string;
}

/**
 * Pure player action: Use Item (PLAN item 55).
 * Uses a consumable (e.g. Vulnerary), recovers HP, decrements uses (removing if 0),
 * and marks unit as hasActed.
 */
export function useItem(
  state: PlayerActionState,
  input: UseItemActionInput,
): PlayerActionResult | null {
  const unit = state.units.find((u) => u.unit.id === input.unitId);
  if (!unit || unit.unit.isDead || unit.unit.hasActed) return null;
  const itemCatalog = state.itemById ?? new Map(((state.items ?? (itemsJson.items as ItemDefinition[]))).map((item) => [item.id, item]));
  const item = itemCatalog.get(input.itemId);
  if (!item) return null;

  if (item.itemRole === 'healing') {
    const changed = useVulnerary(unit, item);
    if (!changed) return null;
    const healAmount = changed.stats.hp - unit.stats.hp;
    const finalUnit = { ...changed, unit: { ...changed.unit, hasActed: true } };
    const updatedUnits = state.units.map((u) => (u.unit.id === unit.unit.id ? finalUnit : u));
    const events: GameEvent[] = [
      {
        type: 'item_used',
        unitId: unit.unit.id,
        itemId: item.id,
        healAmount,
      },
    ];
    return {
      state: {
        ...state,
        units: updatedUnits,
      },
      events,
    };
  }
  return null;
}

export interface MountOrDismountActionInput {
  readonly unitId: string;
  readonly mounted?: boolean;
}

/**
 * Pure player action: Mount or Dismount (PLAN item 55).
 * Toggles or sets mounted status via classRules without consuming unit turn.
 */
export function mountOrDismount(
  state: PlayerActionState,
  input: MountOrDismountActionInput,
): PlayerActionResult | null {
  const unit = state.units.find((u) => u.unit.id === input.unitId);
  if (!unit || unit.unit.isDead || unit.unit.hasActed) return null;
  const targetMounted = input.mounted ?? Boolean(unit.unit.mountedClassId);
  const changed = changeMountedState(unit, targetMounted);
  if (!changed) return null;
  const updatedUnits = state.units.map((u) => (u.unit.id === unit.unit.id ? changed : u));
  return {
    state: {
      ...state,
      units: updatedUnits,
    },
    events: [],
  };
}

export interface CancelMoveActionInput {
  readonly unitId: string;
  readonly origin: Position;
}

/**
 * Pure player action: Cancel Move (PLAN item 55).
 * Returns the unit to its initial origin tile without consuming its turn.
 */
export function cancelMove(
  state: PlayerActionState,
  input: CancelMoveActionInput,
): PlayerActionResult | null {
  const unit = state.units.find((u) => u.unit.id === input.unitId);
  if (!unit || unit.unit.isDead || unit.unit.hasActed) return null;
  const previousPos = unit.unit.position;
  const updatedUnits = state.units.map((u) =>
    u.unit.id === input.unitId
      ? { ...u, unit: { ...u.unit, position: { ...input.origin } } }
      : u
  );
  const events: GameEvent[] = [
    {
      type: 'unit_moved',
      unitId: unit.unit.id,
      from: previousPos,
      to: { ...input.origin },
    },
  ];
  return {
    state: {
      ...state,
      units: updatedUnits,
    },
    events,
  };
}

export interface PromoteActionInput {
  readonly unitId: string;
  readonly targetClassId: string;
}

/**
 * Pure player action: Promote (PLAN item 55).
 * Promotes a unit to a target class without item, setting hasActed to true.
 */
export function promote(
  state: PlayerActionState,
  input: PromoteActionInput,
): PlayerActionResult | null {
  const unit = state.units.find((u) => u.unit.id === input.unitId);
  if (!unit || unit.unit.isDead || unit.unit.hasActed) return null;
  const changed = promoteWithoutItem(unit, input.targetClassId);
  if (!changed) return null;
  const finalUnit = { ...changed, unit: { ...changed.unit, hasActed: true } };
  const updatedUnits = state.units.map((u) => (u.unit.id === unit.unit.id ? finalUnit : u));
  return {
    state: {
      ...state,
      units: updatedUnits,
    },
    events: [],
  };
}
