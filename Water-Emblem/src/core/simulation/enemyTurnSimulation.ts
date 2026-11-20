import type { MapData, Position } from '../grid/types';
import type { TerrainRegistry } from '../grid/terrain';
import { defaultTerrainRegistry, healUnitsOnTerrain } from '../grid/terrain';
import type { ExtendedUnitState } from '../data/chapterData';
import type { GameEvent, VillageState, ChestState } from '../chapter/events';
import { pillageVillage } from '../chapter/events';
import type { TurnManager } from '../turn/turnManager';
import { evaluateAITurn, type AIDecision } from '../ai/decision';
import { executeCombat } from '../combat/calculator';
import type { SeededRNG } from '../combat/rng';
import { defaultRNG } from '../combat/rng';
import { resolveCombatConsequences, type CombatResolutionResult } from '../combat/combatResolution';
import { computeCombinedThreatKeys, computeUnitThreatKeys } from '../grid/threatRange';
import { getAttackRange, skillIdsOf } from '../class/classRules';
import { dueReinforcements, spawnReinforcements, announcedReinforcements } from '../chapter/reinforcements';
import { evaluateChapterOutcome } from '../chapter/types';
import { tickSpecialStates } from '../combat/transform';
import type { ItemDefinition } from '../combat/types';

export interface EnemyPhaseContext {
  mapData: MapData;
  terrains?: TerrainRegistry;
  chapter: any;
  chapterObjective: any;
  items: readonly ItemDefinition[];
  itemById: ReadonlyMap<string, ItemDefinition>;
  dialogues: any;
  rng?: SeededRNG;
  turnNumber: number;
  openedDoors: ReadonlySet<string>;
  gold: number;
  villageStates: Record<string, VillageState>;
  chestStates: Record<string, ChestState>;
  spawnedReinforcements: readonly string[];
}

export interface EnemyActionStep {
  enemy: ExtendedUnitState;
  decision: AIDecision;
  movePosition: Position;
  combatResult?: CombatResolutionResult;
  rawCombatResult?: any;
  hpBefore?: { attacker: number; defender: number };
  pillageEvents?: readonly GameEvent[];
  lootedChestId?: string;
  logs: string[];
}

export interface EnemyPhaseOutcome {
  units: ExtendedUnitState[];
  gold: number;
  villageStates: Record<string, VillageState>;
  chestStates: Record<string, ChestState>;
  spawnedReinforcements: string[];
  chapterOutcome: string;
  isPhaseEnded: boolean;
  announcements: string[];
  logs: string[];
}

/**
 * Computes the enemy danger zone for all active enemies (PLAN item 135).
 */
export function computeDangerZone(
  units: readonly ExtendedUnitState[],
  mapData: MapData,
  terrains: TerrainRegistry = defaultTerrainRegistry,
  openedDoors: ReadonlySet<string> = new Set(),
): Set<string> {
  const threatSources = units
    .filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead)
    .map((enemy) => ({
      unit: enemy.unit,
      attackRange: getAttackRange(enemy.unit, enemy.weapon),
      stationary: enemy.aiRole === 'stationary',
    }));

  return computeCombinedThreatKeys(
    threatSources,
    { map: mapData, terrains, units: units.map((u) => u.unit), openedDoors },
  );
}

/**
 * Computes threat keys for a single inspected enemy (PLAN items 135/145/167).
 */
export function computeInspectedEnemyThreatKeys(
  enemy: ExtendedUnitState,
  units: readonly ExtendedUnitState[],
  mapData: MapData,
  terrains: TerrainRegistry = defaultTerrainRegistry,
  openedDoors: ReadonlySet<string> = new Set(),
): Set<string> {
  return computeUnitThreatKeys(
    {
      unit: enemy.unit,
      attackRange: getAttackRange(enemy.unit, enemy.weapon),
      stationary: enemy.aiRole === 'stationary',
    },
    { map: mapData, terrains, units: units.map((u) => u.unit), openedDoors },
  );
}

/**
 * Prepares initial enemy phase state by applying terrain healing to all active enemies (PLAN item 135).
 */
export function prepareEnemyPhaseUnits(
  units: readonly ExtendedUnitState[],
  mapData: MapData,
  terrains: TerrainRegistry = defaultTerrainRegistry,
): ExtendedUnitState[] {
  return healUnitsOnTerrain(
    units.map((entry) => ({ ...entry, unit: { ...entry.unit }, stats: { ...entry.stats } })),
    'enemy',
    mapData,
    terrains,
  );
}

/**
 * Evaluates and executes the AI action for one enemy unit (PLAN item 135).
 */
export function executeSingleEnemyAction(
  enemy: ExtendedUnitState,
  currentUnits: ExtendedUnitState[],
  context: EnemyPhaseContext,
): { step: EnemyActionStep; updatedUnits: ExtendedUnitState[]; updatedVillageStates: Record<string, VillageState>; updatedChestStates: Record<string, ChestState>; updatedGold: number } {
  const terrains = context.terrains ?? defaultTerrainRegistry;
  const rng = context.rng ?? defaultRNG;

  const statsMap = new Map(currentUnits.map((u) => [u.unit.id, u.stats]));
  const weaponsMap = new Map(currentUnits.map((u) => [u.unit.id, u.weapon]));

  let workingVillageStates = { ...context.villageStates };
  let workingChestStates = { ...context.chestStates };
  let workingGold = context.gold;
  let workingUnits = [...currentUnits];

  const openingMove = enemy.openingMove;
  const isOpeningMoveActive = openingMove && (context.turnNumber === (openingMove.turn ?? 1));
  let decision: AIDecision;

  if (isOpeningMoveActive) {
    const target = openingMove.targetPosition;
    if (enemy.unit.position.x !== target.x || enemy.unit.position.y !== target.y) {
      decision = { type: 'move_only', movePosition: target };
    } else {
      decision = { type: 'wait' };
    }
  } else {
    decision = evaluateAITurn(enemy.unit, enemy.aiRole ?? 'pursue', {
      map: context.mapData,
      terrains,
      units: workingUnits.map((u) => u.unit),
      unitStatsMap: statsMap,
      unitWeaponsMap: weaponsMap,
      unitSkillsMap: new Map(workingUnits.map((u) => [u.unit.id, skillIdsOf(u)])),
      unitLevelsMap: new Map(workingUnits.map((u) => [u.unit.id, u.level])),
      sphereHolders: {
        light: new Set(workingUnits.filter((u) => u.inventory.some((i) => i.itemId === 'lightsphere')).map((u) => u.unit.id)),
        dark: new Set(workingUnits.filter((u) => u.inventory.some((i) => i.itemId === 'darksphere')).map((u) => u.unit.id)),
      },
      villageTargets: (context.chapter.villages as any[])?.filter(
        (v: any) => (workingVillageStates[v.id] ?? 'intact') === 'intact',
      ).map((v: any) => v.position),
      chestTargets: ((context.chapter.chests as any[]) ?? [])
        .filter((c: any) => workingChestStates[c.id] !== 'opened')
        .map((c: any) => c.position),
      patrolTargets: enemy.patrolPoints,
      turnNumber: context.turnNumber,
      openedDoors: context.openedDoors,
    });
  }

  const stepLogs: string[] = [];
  let combatResolutionResult: CombatResolutionResult | undefined;
  let rawResult: any;
  let hpBefore: { attacker: number; defender: number } | undefined;
  const movePos = 'movePosition' in decision ? decision.movePosition : enemy.unit.position;

  if (decision.type === 'attack') {
    stepLogs.push(`🔴 ${enemy.unit.name} moves to (${decision.movePosition.x},${decision.movePosition.y}) and attacks ${decision.targetUnit.name}!`);
    const targetEntry = workingUnits.find((u) => u.unit.id === decision.targetUnit.id);
    hpBefore = { attacker: enemy.stats.hp, defender: targetEntry?.stats.hp ?? 0 };
    rawResult = executeCombat(decision.forecast, rng);

    combatResolutionResult = resolveCombatConsequences({
      units: workingUnits,
      result: rawResult,
      rng,
      itemById: context.itemById,
      itemsList: context.items,
      chapter: context.chapter,
      dialogues: context.dialogues,
      gold: workingGold,
      villageStates: workingVillageStates,
    });

    workingUnits = combatResolutionResult.units;
    workingGold = combatResolutionResult.gold;
    workingVillageStates = combatResolutionResult.villageStates;
    stepLogs.push(...combatResolutionResult.logs);
  } else if (decision.type === 'move_only') {
    stepLogs.push(`🔴 ${enemy.unit.name} advances towards (${decision.movePosition.x},${decision.movePosition.y}).`);
  } else {
    stepLogs.push(`🔴 ${enemy.unit.name} holds position on guard.`);
  }

  let pillageEvents: readonly GameEvent[] | undefined;
  if (decision.type === 'move_only' || decision.type === 'attack') {
    const raid = pillageVillage(
      { units: workingUnits, gold: workingGold, villageStates: workingVillageStates },
      enemy.unit.id,
      context.chapter,
    );
    workingVillageStates = { ...raid.state.villageStates };
    pillageEvents = raid.events;
  }

  let lootedChestId: string | undefined;
  if (enemy.aiRole === 'thief' && !enemy.unit.isDead) {
    const chest = ((context.chapter.chests as any[]) ?? []).find(
      (c: any) => workingChestStates[c.id] !== 'opened' && c.position.x === enemy.unit.position.x && c.position.y === enemy.unit.position.y,
    );
    if (chest) {
      workingChestStates = { ...workingChestStates, [chest.id]: 'opened' };
      lootedChestId = chest.id;
      stepLogs.push(`  💰 ${enemy.unit.name} loots the chest!`);
    }
  }

  const updatedEnemy = workingUnits.find((u) => u.unit.id === enemy.unit.id);
  if (updatedEnemy) {
    updatedEnemy.unit.hasActed = true;
    if (isOpeningMoveActive && openingMove?.nextAiRole) {
      updatedEnemy.aiRole = openingMove.nextAiRole;
    }
  }

  return {
    step: {
      enemy,
      decision,
      movePosition: movePos,
      combatResult: combatResolutionResult,
      rawCombatResult: rawResult,
      hpBefore,
      pillageEvents,
      lootedChestId,
      logs: stepLogs,
    },
    updatedUnits: workingUnits,
    updatedVillageStates: workingVillageStates,
    updatedChestStates: workingChestStates,
    updatedGold: workingGold,
  };
}

/**
 * Finalizes the enemy phase (PLAN item 135):
 * - Spawns due reinforcements at end of enemy phase
 * - Evaluates chapter outcome
 * - If ongoing, prepares player phase (heals player on terrain, ticks special states, resets hasActed)
 */
export function finalizeEnemyPhase(
  units: ExtendedUnitState[],
  context: EnemyPhaseContext,
  turnManager: TurnManager,
): EnemyPhaseOutcome {
  const terrains = context.terrains ?? defaultTerrainRegistry;
  let phaseUnits = [...units];
  const logs: string[] = [];
  const announcements: string[] = [];

  // 1. Spawning reinforcements
  let nextSpawned = [...context.spawnedReinforcements];
  for (const group of dueReinforcements(context.chapter, context.turnNumber, context.spawnedReinforcements)) {
    const spawned = spawnReinforcements(phaseUnits, group, context.mapData, terrains);
    phaseUnits = spawned.units;
    nextSpawned.push(group.id);
    if (spawned.spawned.length > 0) {
      logs.push(`⚔️ Enemy reinforcements have arrived! (${spawned.spawned.length} units)`);
    }
  }

  // 2. Chapter outcome evaluation
  const outcome = evaluateChapterOutcome(
    phaseUnits.map((u) => u.unit),
    context.chapterObjective,
    false,
    context.chapter.lordUnitId,
    { turnNumber: context.turnNumber },
  );

  // 3. Switch to Player Phase if ongoing
  if (outcome === 'ongoing') {
    turnManager.switchPhase('player_phase');
    phaseUnits = healUnitsOnTerrain(phaseUnits, 'player', context.mapData, terrains);

    // Tick transformation / imitation
    const ticked = tickSpecialStates(phaseUnits, context.itemById);
    phaseUnits = ticked.units;
    for (const event of ticked.events) {
      logs.push(
        event.kind === 'transform_end'
          ? `🐉 ${event.unitName} returns to human form.`
          : `🎭 ${event.unitName}'s imitation ends.`,
      );
    }

    // Reset player hasActed flags
    phaseUnits = phaseUnits.map((u) =>
      u.unit.faction === 'player' && !u.unit.isDead ? { ...u, unit: { ...u.unit, hasActed: false } } : u,
    );

    // Warn about next turn reinforcements
    const arriving = announcedReinforcements(context.chapter, context.turnNumber + 1, nextSpawned);
    if (arriving.length > 0) {
      announcements.push('⚠️ Enemy reinforcements will arrive at the end of this turn!');
      logs.push('⚠️ Enemy reinforcements will arrive at the end of this turn!');
    }
  }

  turnManager.replaceUnits(phaseUnits.map(({ unit }) => unit));

  return {
    units: phaseUnits,
    gold: context.gold,
    villageStates: context.villageStates,
    chestStates: context.chestStates,
    spawnedReinforcements: nextSpawned,
    chapterOutcome: outcome,
    isPhaseEnded: outcome === 'ongoing',
    announcements,
    logs,
  };
}
