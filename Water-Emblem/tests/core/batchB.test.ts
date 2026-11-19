import { describe, expect, it } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import type { GridUnit, MapData } from '../../src/core/grid/types';
import { evaluateAITurn } from '../../src/core/ai/decision';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import { canCanto } from '../../src/core/combat/canto';
import { applyBossPhases } from '../../src/core/chapter/bossPhases';
import { testChapter01Data, type ExtendedUnitState } from '../../src/core/data/chapterData';

const terrains = new TerrainRegistry();
const items = itemsData.items as readonly ItemDefinition[];
const itemById = new Map(items.map((item) => [item.id, item]));
const ironSword = items.find((i) => i.id === 'iron_sword')!;
const ironAxe = items.find((i) => i.id === 'iron_axe')!;

const testMap: MapData = {
  id: 'batch_b_map',
  name: 'Batch B',
  width: 8,
  height: 8,
  grid: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 'plains')),
};

function stats(hp: number, maxHp = 20): UnitCombatStats {
  return { hp, maxHp, str: 5, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 };
}

function unit(id: string, faction: 'player' | 'enemy', x: number, y: number, mov = 5): GridUnit {
  return { id, name: id, faction, position: { x, y }, mov, moveType: 'foot' };
}

function aiContext(units: GridUnit[], hp: Record<string, number>, extra: object = {}) {
  return {
    map: testMap,
    terrains,
    units,
    unitStatsMap: new Map(units.map((u) => [u.id, stats(hp[u.id] ?? 20)])),
    unitWeaponsMap: new Map(units.map((u) => [u.id, u.faction === 'enemy' ? ironAxe : ironSword])),
    ...extra,
  };
}

describe('canto (PLAN item 102, V04)', () => {
  it('applies to cavalry and fliers only', () => {
    expect(canCanto({ ...unit('a', 'player', 0, 0), moveType: 'cavalry' })).toBe(true);
    expect(canCanto({ ...unit('a', 'player', 0, 0), moveType: 'flier' })).toBe(true);
    expect(canCanto(unit('a', 'player', 0, 0))).toBe(false);
    expect(canCanto({ ...unit('a', 'player', 0, 0), moveType: 'armor' })).toBe(false);
  });
});

describe('AI roles (PLAN item 110, B10)', () => {
  it('flee moves away from the nearest player', () => {
    const enemy = unit('e1', 'enemy', 4, 4);
    const player = unit('p1', 'player', 4, 5);
    const decision = evaluateAITurn(enemy, 'flee', aiContext([enemy, player], {}));
    expect(decision.type).toBe('move_only');
    if (decision.type === 'move_only') {
      const dist = Math.abs(decision.movePosition.x - 4) + Math.abs(decision.movePosition.y - 5);
      expect(dist).toBeGreaterThan(1);
    }
  });

  it('retreat flees below half HP and pursues otherwise', () => {
    const enemy = unit('e1', 'enemy', 4, 4);
    const player = unit('p1', 'player', 4, 6);
    const hurt = evaluateAITurn(enemy, 'retreat', aiContext([enemy, player], { e1: 5 }));
    expect(hurt.type).toBe('move_only');
    if (hurt.type === 'move_only') {
      const dist = Math.abs(hurt.movePosition.x - 4) + Math.abs(hurt.movePosition.y - 6);
      expect(dist).toBeGreaterThan(2);
    }
    const healthy = evaluateAITurn(enemy, 'retreat', aiContext([enemy, player], { e1: 20 }));
    expect(healthy.type).toBe('attack');
  });

  it('thief heads for the chest, and flees when there is no loot', () => {
    const enemy = unit('e1', 'enemy', 1, 1);
    const player = unit('p1', 'player', 7, 7);
    const loot = evaluateAITurn(enemy, 'thief', aiContext([enemy, player], {}, { chestTargets: [{ x: 1, y: 4 }] }));
    expect(loot.type).toBe('move_only');
    if (loot.type === 'move_only') {
      expect(loot.movePosition).toEqual({ x: 1, y: 4 });
    }
    const empty = evaluateAITurn(enemy, 'thief', aiContext([enemy, player], {}, { chestTargets: [] }));
    expect(empty.type).toBe('move_only');
    if (empty.type === 'move_only') {
      const dist = Math.abs(empty.movePosition.x - 7) + Math.abs(empty.movePosition.y - 7);
      expect(dist).toBeGreaterThanOrEqual(12);
    }
  });

  it('patrol moves toward its waypoint when nobody is in range', () => {
    const enemy = unit('e1', 'enemy', 4, 4, 3);
    const player = unit('p1', 'player', 0, 0);
    const decision = evaluateAITurn(enemy, 'patrol', aiContext([enemy, player], {}, {
      patrolTargets: [{ x: 4, y: 7 }, { x: 4, y: 1 }],
      turnNumber: 2,
    }));
    expect(decision.type).toBe('move_only');
    if (decision.type === 'move_only') {
      // turn 2 % 2 = 0 → waypoint (4,7); 3 movement → (4,7) reachable in 3.
      expect(decision.movePosition).toEqual({ x: 4, y: 7 });
    }
  });
});

describe('boss phases (PLAN items 111, 150)', () => {
  it('loads boss phases from chapter data', () => {
    const gazzak = testChapter01Data.units.find((u) => u.unit.id === 'gazzak');
    expect(gazzak?.bossPhases).toHaveLength(1);
    expect(gazzak?.bossPhases?.[0]?.hpPercent).toBe(50);
    expect(gazzak?.bossPhases?.[0]?.aiRole).toBe('pursue');
  });

  it('switches AI role once when HP crosses the threshold, stats unchanged (item 150)', () => {
    const gazzak = structuredClone(testChapter01Data.units.find((u) => u.unit.id === 'gazzak')!) as ExtendedUnitState;
    const baseStats = { ...gazzak.stats };
    gazzak.stats.hp = Math.floor(gazzak.stats.maxHp / 2);
    const first = applyBossPhases([gazzak], itemById);
    expect(first.events).toHaveLength(1);
    expect(first.units[0]?.aiRole).toBe('pursue');
    expect(first.units[0]?.stats.str).toBe(baseStats.str);
    expect(first.units[0]?.stats.def).toBe(baseStats.def);
    expect(first.units[0]?.bossPhase).toBe(1);
    const second = applyBossPhases(first.units, itemById);
    expect(second.events).toHaveLength(0);
    expect(second.units[0]?.aiRole).toBe('pursue');
  });

  it('does nothing above the threshold', () => {
    const gazzak = structuredClone(testChapter01Data.units.find((u) => u.unit.id === 'gazzak')!) as ExtendedUnitState;
    const result = applyBossPhases([gazzak], itemById);
    expect(result.events).toHaveLength(0);
    expect(result.units[0]?.bossPhase).toBeUndefined();
  });
});
