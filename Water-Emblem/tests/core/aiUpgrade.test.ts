import { describe, it, expect } from 'vitest';
import { evaluateAITurn } from '../../src/core/ai/decision';
import type { GridUnit, MapData } from '../../src/core/grid/types';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import itemsJson from '../../data/items.json' with { type: 'json' };

const itemsList = itemsJson.items as ItemDefinition[];
const itemById = new Map(itemsList.map((i) => [i.id, i]));

const sampleMap: MapData = {
  id: 'test_ai_map',
  name: 'Test Map',
  width: 10,
  height: 10,
  grid: Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 'plains')),
};

describe('Nâng cấp toàn diện AI: Weapon Swap và Staff Heal (Mục 177)', () => {
  it('AI tự động đổi vũ khí phù hợp tầm đánh và dùng gậy hồi máu cho đồng đội bị thương', () => {
    // 1. Kiểm tra AI tự động đổi sang Javelin (tầm 1-2) khi mục tiêu ở cách 2 ô
    const enemyUnit: GridUnit = {
      id: 'enemy_cavalier',
      name: 'Enemy Cavalier',
      faction: 'enemy',
      classId: 'cavalier',
      position: { x: 5, y: 5 },
      moveType: 'cavalry',
      mov: 7,
      isDead: false,
      hasActed: false,
      weaponRanks: { sword: 'D', lance: 'D' },
    };

    const playerArcher: GridUnit = {
      id: 'player_archer',
      name: 'Player Archer',
      faction: 'player',
      classId: 'archer',
      position: { x: 5, y: 7 }, // khoảng cách 2 ô
      moveType: 'foot',
      mov: 5,
      isDead: false,
      hasActed: false,
      weaponRanks: { bow: 'D' },
    };

    const statsMap = new Map<string, UnitCombatStats>([
      [
        'enemy_cavalier',
        { hp: 20, maxHp: 20, str: 7, mag: 0, skill: 5, spd: 6, lck: 2, def: 6, res: 0 },
      ],
      [
        'player_archer',
        { hp: 16, maxHp: 16, str: 5, mag: 0, skill: 4, spd: 5, lck: 4, def: 4, res: 0 },
      ],
    ]);

    // AI đang cầm iron_sword (tầm 1), nhưng trong túi có cả javelin (tầm 1-2)
    const weaponsMap = new Map<string, ItemDefinition | undefined>([
      ['enemy_cavalier', itemById.get('iron_sword')],
      ['player_archer', itemById.get('iron_bow')],
    ]);

    const inventoriesMap = new Map([
      [
        'enemy_cavalier',
        [
          { itemId: 'iron_sword', uses: 40 },
          { itemId: 'javelin', uses: 25 },
        ],
      ],
      [
        'player_archer',
        [{ itemId: 'iron_bow', uses: 40 }],
      ],
    ]);

    // Giả sử AI ở vai trò stationary (đứng yên tại 5,5 không di chuyển)
    const decision = evaluateAITurn(enemyUnit, 'stationary', {
      map: sampleMap,
      terrains: defaultTerrainRegistry,
      units: [enemyUnit, playerArcher],
      unitStatsMap: statsMap,
      unitWeaponsMap: weaponsMap,
      unitInventoriesMap: inventoriesMap,
      itemsCatalog: itemById,
    });

    expect(decision.type).toBe('attack');
    if (decision.type === 'attack') {
      // AI phải tự động trang bị Javelin để đánh ở khoảng cách 2 ô thay vì đứng chờ
      expect(decision.weapon.id).toBe('javelin');
      expect(decision.targetUnit.id).toBe('player_archer');
    }

    // 2. Kiểm tra AI dùng gậy hồi máu (Heal Staff) cho đồng đội bị thương
    const enemyCurate: GridUnit = {
      id: 'enemy_curate',
      name: 'Enemy Curate',
      faction: 'enemy',
      classId: 'curate',
      position: { x: 2, y: 2 },
      moveType: 'foot',
      mov: 5,
      isDead: false,
      hasActed: false,
      weaponRanks: { staff: 'E' },
    };

    const woundedBoss: GridUnit = {
      id: 'enemy_boss',
      name: 'Enemy Boss',
      faction: 'enemy',
      classId: 'brigand',
      position: { x: 2, y: 3 }, // kề bên curate (khoảng cách 1 ô)
      moveType: 'bandit',
      mov: 5,
      isDead: false,
      hasActed: false,
    };

    const healerStatsMap = new Map<string, UnitCombatStats>([
      [
        'enemy_curate',
        { hp: 16, maxHp: 16, str: 1, mag: 6, skill: 4, spd: 6, lck: 4, def: 2, res: 5 },
      ],
      [
        'enemy_boss',
        { hp: 8, maxHp: 30, str: 12, mag: 0, skill: 8, spd: 7, lck: 5, def: 8, res: 1 }, // bị thương nặng: 8/30 HP
      ],
      [
        'player_archer',
        { hp: 16, maxHp: 16, str: 5, mag: 0, skill: 4, spd: 5, lck: 4, def: 4, res: 0 },
      ],
    ]);

    const healerWeaponsMap = new Map<string, ItemDefinition | undefined>([
      ['enemy_curate', itemById.get('heal_staff')],
      ['enemy_boss', itemById.get('steel_axe')],
      ['player_archer', itemById.get('iron_bow')],
    ]);

    const healerInventoriesMap = new Map([
      ['enemy_curate', [{ itemId: 'heal_staff', uses: 20 }]],
      ['enemy_boss', [{ itemId: 'steel_axe', uses: 30 }]],
      ['player_archer', [{ itemId: 'iron_bow', uses: 40 }]],
    ]);

    const staffDecision = evaluateAITurn(enemyCurate, 'pursue', {
      map: sampleMap,
      terrains: defaultTerrainRegistry,
      units: [enemyCurate, woundedBoss, playerArcher],
      unitStatsMap: healerStatsMap,
      unitWeaponsMap: healerWeaponsMap,
      unitInventoriesMap: healerInventoriesMap,
      itemsCatalog: itemById,
    });

    expect(staffDecision.type).toBe('staff');
    if (staffDecision.type === 'staff') {
      expect(staffDecision.targetUnit.id).toBe('enemy_boss');
      expect(staffDecision.staff.id).toBe('heal_staff');
      expect(staffDecision.healAmount).toBeGreaterThanOrEqual(10);
    }
  });
});
