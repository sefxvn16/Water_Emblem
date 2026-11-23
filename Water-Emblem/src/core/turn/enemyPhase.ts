import type { SeededRNG } from '../combat/rng';
import { defaultRNG } from '../combat/rng';
import type { GameEvent } from '../chapter/events';
import type { ExtendedUnitState } from '../data/chapterData';
import { defaultTerrainRegistry } from '../grid/terrain';
import { evaluateChapterOutcome } from '../chapter/types';
import { collectBossUnitIds, sortEnemyTurnOrder, type AIContext } from '../ai/decision';
import { skillIdsOf } from '../class/classRules';
import {
  prepareEnemyPhaseUnits,
  executeSingleEnemyAction,
  finalizeEnemyPhase,
  type EnemyPhaseContext,
  type EnemyActionStep,
  type EnemyPhaseOutcome,
} from '../simulation/enemyTurnSimulation';

export type { EnemyPhaseContext, EnemyActionStep, EnemyPhaseOutcome };

export interface EnemyPhaseRunContext extends EnemyPhaseContext {
  readonly units?: readonly ExtendedUnitState[];
}

export interface EnemyPhaseRunResult {
  readonly state: EnemyPhaseOutcome;
  readonly events: readonly GameEvent[];
  readonly steps: readonly EnemyActionStep[];
}

function buildSortingAIContext(
  units: readonly ExtendedUnitState[],
  context: EnemyPhaseContext,
  villageStates: Record<string, string>,
  chestStates: Record<string, string>,
): AIContext {
  const terrains = context.terrains ?? defaultTerrainRegistry;
  return {
    map: context.mapData,
    terrains,
    units: units.map((u) => u.unit),
    unitStatsMap: new Map(units.map((u) => [u.unit.id, u.stats])),
    unitWeaponsMap: new Map(units.map((u) => [u.unit.id, u.weapon])),
    unitSkillsMap: new Map(units.map((u) => [u.unit.id, skillIdsOf(u)])),
    unitLevelsMap: new Map(units.map((u) => [u.unit.id, u.level])),
    sphereHolders: {
      light: new Set(units.filter((u) => u.inventory.some((i) => i.itemId === 'lightsphere')).map((u) => u.unit.id)),
      dark: new Set(units.filter((u) => u.inventory.some((i) => i.itemId === 'darksphere')).map((u) => u.unit.id)),
    },
    villageTargets: context.chapter.villages?.filter((v) => (villageStates[v.id] ?? 'intact') === 'intact').map((v) => v.position),
    chestTargets: (context.chapter.chests ?? []).filter((c) => chestStates[c.id] !== 'opened').map((c) => c.position),
    patrolTargets: undefined,
    turnNumber: context.turnNumber,
    openedDoors: context.openedDoors,
    unitInventoriesMap: new Map(units.map((u) => [u.unit.id, u.inventory])),
    itemsCatalog: context.itemById,
    bossUnitIds: collectBossUnitIds(units),
  };
}

/**
 * Executes a full enemy phase in the pure core (PLAN items 54 + 196).
 * Builds on top of enemyTurnSimulation functions and returns state, events, and steps.
 */
export function runEnemyPhase(
  context: EnemyPhaseRunContext,
  rng: SeededRNG = defaultRNG,
): EnemyPhaseRunResult {
  const effectiveRng = context.rng ?? rng;
  const initialUnits = context.units ?? context.chapter.units;
  const events: GameEvent[] = [];
  events.push({ type: 'enemy_phase_started', turnNumber: context.turnNumber });

  const terrains = context.terrains ?? defaultTerrainRegistry;
  let workingUnits = prepareEnemyPhaseUnits(initialUnits, context.mapData, terrains);
  let workingVillageStates = { ...context.villageStates };
  let workingChestStates = { ...context.chestStates };
  let workingGold = context.gold;
  let workingSpawnedReinforcements = [...context.spawnedReinforcements];
  const steps: EnemyActionStep[] = [];
  const logs: string[] = [`🔴 ENEMY PHASE (Turn ${context.turnNumber})`];

  const activeEnemies = workingUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);
  const sortingAiCtx = activeEnemies.length > 0
    ? buildSortingAIContext(workingUnits, context, workingVillageStates, workingChestStates)
    : undefined;
  const sortedEnemies = sortingAiCtx ? sortEnemyTurnOrder(activeEnemies, sortingAiCtx) : [];

  let currentOutcome = evaluateChapterOutcome(
    workingUnits.map((u) => u.unit),
    context.chapterObjective,
    false,
    context.chapter.lordUnitId,
    { turnNumber: context.turnNumber },
  );

  for (const enemy of sortedEnemies) {
    if (currentOutcome !== 'ongoing') break;

    const enemyInWorking = workingUnits.find((u) => u.unit.id === enemy.unit.id);
    if (!enemyInWorking || enemyInWorking.unit.isDead) continue;

    const stepContext: EnemyPhaseContext = {
      ...context,
      rng: effectiveRng,
      villageStates: workingVillageStates,
      chestStates: workingChestStates,
      gold: workingGold,
      spawnedReinforcements: workingSpawnedReinforcements,
    };

    const actionResult = executeSingleEnemyAction(enemyInWorking, workingUnits, stepContext);
    workingUnits = actionResult.updatedUnits;
    workingVillageStates = actionResult.updatedVillageStates;
    workingChestStates = actionResult.updatedChestStates;
    workingGold = actionResult.updatedGold;
    steps.push(actionResult.step);
    events.push(...actionResult.step.events);
    logs.push(...actionResult.step.logs);

    currentOutcome = evaluateChapterOutcome(
      workingUnits.map((u) => u.unit),
      context.chapterObjective,
      false,
      context.chapter.lordUnitId,
      { turnNumber: context.turnNumber },
    );

    if (currentOutcome !== 'ongoing') {
      events.push({ type: 'chapter_outcome', outcome: currentOutcome });
      break;
    }
  }

  events.push({ type: 'enemy_phase_ended', turnNumber: context.turnNumber });

  if (currentOutcome !== 'ongoing') {
    return {
      state: {
        units: workingUnits,
        gold: workingGold,
        villageStates: workingVillageStates,
        chestStates: workingChestStates,
        spawnedReinforcements: workingSpawnedReinforcements,
        chapterOutcome: currentOutcome,
        isPhaseEnded: false,
        announcements: [],
        logs,
        events,
      },
      events,
      steps,
    };
  }

  const finalizeContext: EnemyPhaseContext = {
    ...context,
    rng: effectiveRng,
    villageStates: workingVillageStates,
    chestStates: workingChestStates,
    gold: workingGold,
    spawnedReinforcements: workingSpawnedReinforcements,
  };

  const finalOutcome = finalizeEnemyPhase(workingUnits, finalizeContext);
  finalOutcome.logs = [...logs, ...finalOutcome.logs];

  if (finalOutcome.chapterOutcome !== 'ongoing' && !events.some((e) => e.type === 'chapter_outcome')) {
    events.push({ type: 'chapter_outcome', outcome: finalOutcome.chapterOutcome as 'victory' | 'defeat' });
  }

  return {
    state: {
      ...finalOutcome,
      events,
    },
    events,
    steps,
  };
}
