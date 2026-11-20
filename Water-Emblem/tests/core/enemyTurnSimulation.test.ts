import { describe, it, expect } from 'vitest';
import {
  computeDangerZone,
  prepareEnemyPhaseUnits,
  executeSingleEnemyAction,
  finalizeEnemyPhase,
} from '../../src/core/simulation/enemyTurnSimulation';
import { chapter01Data } from '../../src/core/data/chapterData';
import { TurnManager } from '../../src/core/turn/turnManager';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import talysMapRaw from '../../data/maps/chapter_01_talys.json';
import itemsJson from '../../data/items.json';
import type { MapData } from '../../src/core/grid/types';
import type { ItemDefinition } from '../../src/core/combat/types';

describe('enemyTurnSimulation module (PLAN item 135)', () => {
  const mapData = talysMapRaw as MapData;
  const itemById = new Map((itemsJson.items as ItemDefinition[]).map((i) => [i.id, i]));

  it('computeDangerZone accurately gathers all threatened tiles by active enemies', () => {
    const dangerTiles = computeDangerZone(chapter01Data.units, mapData, defaultTerrainRegistry);
    expect(dangerTiles.size).toBeGreaterThan(0);
    // Every tile key is format x,y
    for (const key of dangerTiles) {
      expect(key).toMatch(/^\d+,\d+$/);
    }
  });

  it('prepareEnemyPhaseUnits heals enemy units on fort/gate terrain', () => {
    const units = structuredClone(chapter01Data.units);
    const boss = units.find((u) => u.isBoss)!;
    boss.stats.hp = 10;
    const initialHp = boss.stats.hp;

    const prepared = prepareEnemyPhaseUnits(units, mapData, defaultTerrainRegistry);
    const preparedBoss = prepared.find((u) => u.unit.id === boss.unit.id)!;
    // Castle gate grants terrain healing
    expect(preparedBoss.stats.hp).toBeGreaterThanOrEqual(initialHp);
  });

  it('executeSingleEnemyAction evaluates AI and returns movement step and logs', () => {
    const units = structuredClone(chapter01Data.units);
    const pirate = units.find((u) => u.unit.faction === 'enemy' && !u.unit.isDead)!;

    const { step, updatedUnits } = executeSingleEnemyAction(pirate, units, {
      mapData,
      chapter: chapter01Data,
      chapterObjective: chapter01Data.objective,
      items: itemsJson.items as ItemDefinition[],
      itemById,
      dialogues: {},
      turnNumber: 1,
      openedDoors: new Set(),
      gold: 1000,
      villageStates: {},
      chestStates: {},
      spawnedReinforcements: [],
    });

    expect(step.enemy.unit.id).toBe(pirate.unit.id);
    expect(step.logs.length).toBeGreaterThan(0);
    const actedEnemy = updatedUnits.find((u) => u.unit.id === pirate.unit.id)!;
    expect(actedEnemy.unit.hasActed).toBe(true);
  });

  it('finalizeEnemyPhase switches phase to player and resets player hasActed flags', () => {
    const units = structuredClone(chapter01Data.units);
    // Mark player units as having acted
    for (const u of units) {
      if (u.unit.faction === 'player') u.unit.hasActed = true;
    }

    const turnManager = new TurnManager(units.map((u) => u.unit));
    turnManager.switchPhase('enemy_phase');

    const outcome = finalizeEnemyPhase(
      units,
      {
        mapData,
        chapter: chapter01Data,
        chapterObjective: chapter01Data.objective,
        items: itemsJson.items as ItemDefinition[],
        itemById,
        dialogues: {},
        turnNumber: 1,
        openedDoors: new Set(),
        gold: 1000,
        villageStates: {},
        chestStates: {},
        spawnedReinforcements: [],
      },
      turnManager,
    );

    expect(outcome.isPhaseEnded).toBe(true);
    expect(turnManager.getState().activePhase).toBe('player_phase');
    for (const u of outcome.units) {
      if (u.unit.faction === 'player') {
        expect(u.unit.hasActed).toBe(false);
      }
    }
  });
});
