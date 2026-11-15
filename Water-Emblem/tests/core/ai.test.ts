import { describe, it, expect } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { GridUnit, MapData } from '../../src/core/grid/types';
import { evaluateAITurn } from '../../src/core/ai/decision';
import { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';

describe('AI Decision & Target Priority Scoring', () => {
  const terrains = new TerrainRegistry();
  const items = itemsData.items as readonly ItemDefinition[];
  const getItem = (id: string) => items.find((i) => i.id === id)!;

  const ironSword = getItem('iron_sword');
  const ironAxe = getItem('iron_axe');

  const testMap: MapData = {
    id: 'ai_test_map',
    name: 'AI Test',
    width: 6,
    height: 6,
    grid: [
      ['plains', 'plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains', 'plains', 'plains'],
    ],
  };

  it('AI vai trò Stationary đứng yên nếu không có ai trong tầm đánh', () => {
    const enemyBoss: GridUnit = {
      id: 'boss',
      name: 'Boss',
      faction: 'enemy',
      position: { x: 5, y: 5 },
      mov: 0,
      moveType: 'armor',
    };
    const player: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'foot',
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['boss', { hp: 30, maxHp: 30, str: 10, mag: 0, skill: 8, spd: 5, lck: 4, def: 10, res: 1 }],
      ['marth', { hp: 20, maxHp: 20, str: 6, mag: 0, skill: 6, spd: 8, lck: 7, def: 5, res: 0 }],
    ]);
    const weaponsMap = new Map<string, ItemDefinition>([
      ['boss', ironAxe],
      ['marth', ironSword],
    ]);

    const decision = evaluateAITurn(enemyBoss, 'stationary', {
      map: testMap,
      terrains,
      units: [enemyBoss, player],
      unitStatsMap: statsMap,
      unitWeaponsMap: weaponsMap,
    });

    expect(decision.type).toBe('wait');
  });

  it('AI vai trò Pursue tự động chọn ô di chuyển tiến lại gần người chơi', () => {
    const enemy: GridUnit = {
      id: 'bandit',
      name: 'Bandit',
      faction: 'enemy',
      position: { x: 5, y: 5 },
      mov: 3,
      moveType: 'bandit',
    };
    const player: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'foot',
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['bandit', { hp: 20, maxHp: 20, str: 7, mag: 0, skill: 3, spd: 4, lck: 1, def: 3, res: 0 }],
      ['marth', { hp: 20, maxHp: 20, str: 6, mag: 0, skill: 6, spd: 8, lck: 7, def: 5, res: 0 }],
    ]);
    const weaponsMap = new Map<string, ItemDefinition>([
      ['bandit', ironAxe],
      ['marth', ironSword],
    ]);

    const decision = evaluateAITurn(enemy, 'pursue', {
      map: testMap,
      terrains,
      units: [enemy, player],
      unitStatsMap: statsMap,
      unitWeaponsMap: weaponsMap,
    });

    expect(decision.type).toBe('move_only');
    if (decision.type === 'move_only') {
      // Vị trí mới phải gần (0,0) hơn (5,5)
      const oldDist = Math.abs(5 - 0) + Math.abs(5 - 0); // 10
      const newDist = Math.abs(decision.movePosition.x - 0) + Math.abs(decision.movePosition.y - 0);
      expect(newDist).toBeLessThan(oldDist);
    }
  });

  it('thief targets an intact village before attacking a nearby player', () => {
    const thief: GridUnit = {
      id: 'thief', name: 'Thief', classId: 'thief', faction: 'enemy',
      position: { x: 2, y: 2 }, mov: 2, moveType: 'foot',
    };
    const player: GridUnit = {
      id: 'marth', name: 'Marth', classId: 'lord', faction: 'player',
      position: { x: 2, y: 1 }, mov: 4, moveType: 'foot',
    };
    const stats: UnitCombatStats = { hp: 20, maxHp: 20, str: 6, mag: 0, skill: 6, spd: 8, lck: 7, def: 5, res: 0 };
    const context = {
      map: testMap, terrains, units: [thief, player],
      unitStatsMap: new Map([['thief', stats], ['marth', stats]]),
      unitWeaponsMap: new Map([['thief', ironSword], ['marth', ironSword]]),
      villageTargets: [{ x: 5, y: 2 }],
    };
    expect(evaluateAITurn(thief, 'pillage', context)).toMatchObject({
      type: 'move_only', movePosition: { x: 4, y: 2 },
    });
  });

  it('thief falls back to pursue when all villages are destroyed or absent', () => {
    const thief: GridUnit = {
      id: 'thief', name: 'Thief', classId: 'thief', faction: 'enemy',
      position: { x: 2, y: 2 }, mov: 2, moveType: 'foot',
    };
    const player: GridUnit = {
      id: 'marth', name: 'Marth', classId: 'lord', faction: 'player',
      position: { x: 2, y: 1 }, mov: 4, moveType: 'foot',
    };
    const stats: UnitCombatStats = { hp: 20, maxHp: 20, str: 6, mag: 0, skill: 6, spd: 8, lck: 7, def: 5, res: 0 };
    const context = {
      map: testMap, terrains, units: [thief, player],
      unitStatsMap: new Map([['thief', stats], ['marth', stats]]),
      unitWeaponsMap: new Map([['thief', ironSword], ['marth', ironSword]]),
      villageTargets: [],
    };
    // With no village targets, the thief will attack the adjacent player
    const decision = evaluateAITurn(thief, 'pillage', context);
    expect(decision.type).toBe('attack');
    if (decision.type === 'attack') {
      expect(decision.targetUnit.id).toBe('marth');
    }
  });

  it('AI chấm điểm ưu tiên kết liễu mục tiêu có thể bị hạ gục', () => {
    const enemy: GridUnit = {
      id: 'bandit',
      name: 'Bandit',
      faction: 'enemy',
      position: { x: 2, y: 2 },
      mov: 3,
      moveType: 'bandit',
    };
    // Player 1 nhiều máu (HP 20)
    const playerHealthy: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 2, y: 1 },
      mov: 4,
      moveType: 'foot',
    };
    // Player 2 gần chết (HP 3)
    const playerDying: GridUnit = {
      id: 'jagen',
      name: 'Jagen',
      faction: 'player',
      position: { x: 3, y: 2 },
      mov: 7,
      moveType: 'cavalry',
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['bandit', { hp: 20, maxHp: 20, str: 10, mag: 0, skill: 5, spd: 5, lck: 2, def: 4, res: 0 }],
      ['marth', { hp: 20, maxHp: 20, str: 6, mag: 0, skill: 6, spd: 8, lck: 7, def: 5, res: 0 }],
      ['jagen', { hp: 3, maxHp: 25, str: 7, mag: 0, skill: 8, spd: 6, lck: 3, def: 5, res: 0 }],
    ]);
    const weaponsMap = new Map<string, ItemDefinition>([
      ['bandit', ironAxe],
      ['marth', ironSword],
      ['jagen', ironAxe],
    ]);

    const decision = evaluateAITurn(enemy, 'pursue', {
      map: testMap,
      terrains,
      units: [enemy, playerHealthy, playerDying],
      unitStatsMap: statsMap,
      unitWeaponsMap: weaponsMap,
    });

    expect(decision.type).toBe('attack');
    if (decision.type === 'attack') {
      // AI phải chọn Jagen vì có thể kết liễu (Kill bonus)
      expect(decision.targetUnit.id).toBe('jagen');
    }
  });

  it('AI ưu tiên sát thương có xác suất trúng cao hơn', () => {
    const enemy: GridUnit = { id: 'enemy', name: 'Enemy', faction: 'enemy', position: { x: 2, y: 2 }, mov: 0, moveType: 'foot' };
    const elusive: GridUnit = { id: 'elusive', name: 'Elusive', faction: 'player', position: { x: 2, y: 1 }, mov: 0, moveType: 'foot' };
    const reliable: GridUnit = { id: 'reliable', name: 'Reliable', faction: 'player', position: { x: 3, y: 2 }, mov: 0, moveType: 'foot' };
    const statsMap = new Map<string, UnitCombatStats>([
      ['enemy', { hp: 30, maxHp: 30, str: 10, mag: 0, skill: 5, spd: 5, lck: 0, def: 5, res: 0 }],
      ['elusive', { hp: 30, maxHp: 30, str: 0, mag: 0, skill: 0, spd: 20, lck: 20, def: 0, res: 0 }],
      ['reliable', { hp: 30, maxHp: 30, str: 0, mag: 0, skill: 0, spd: 5, lck: 0, def: 2, res: 0 }],
    ]);
    const action = evaluateAITurn(enemy, 'stationary', {
      map: testMap, terrains, units: [enemy, elusive, reliable], unitStatsMap: statsMap,
      unitWeaponsMap: new Map([['enemy', { ...ironSword, hit: 50 }]]),
    });
    expect(action.type).toBe('attack');
    if (action.type === 'attack') expect(action.targetUnit.id).toBe('reliable');
  });
});
