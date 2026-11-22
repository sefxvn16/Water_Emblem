import { describe, it, expect } from 'vitest';
import { collectBossUnitIds, evaluateAITurn, sortEnemyTurnOrder, type AIContext } from '../../src/core/ai/decision';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import type { GridUnit, MapData } from '../../src/core/grid/types';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

const mockMap: MapData = {
  id: 'test_map',
  name: 'Test Map',
  width: 10,
  height: 10,
  grid: Array(10).fill(null).map(() => Array(10).fill('plains')),
  elevations: Array(10).fill(null).map(() => Array(10).fill(0)),
};

const ironSword: ItemDefinition = {
  id: 'iron_sword',
  name: 'Iron Sword',
  nameVi: 'Kiếm Sắt',
  type: 'sword',
  might: 5,
  hit: 90,
  crit: 0,
  weight: 5,
  minRange: 1,
  maxRange: 1,
  maxUses: 40,
  effectiveAgainst: [],
};

const ironBow: ItemDefinition = {
  id: 'iron_bow',
  name: 'Iron Bow',
  nameVi: 'Cung Sắt',
  type: 'bow',
  might: 6,
  hit: 85,
  crit: 0,
  weight: 6,
  minRange: 2,
  maxRange: 2,
  maxUses: 40,
  effectiveAgainst: ['flier'],
};

const ironAxe: ItemDefinition = {
  id: 'iron_axe',
  name: 'Iron Axe',
  nameVi: 'Rìu Sắt',
  type: 'axe',
  might: 7,
  hit: 80,
  crit: 0,
  weight: 7,
  minRange: 1,
  maxRange: 1,
  maxUses: 45,
  effectiveAgainst: [],
};

const healStaff: ItemDefinition = {
  id: 'heal',
  name: 'Heal',
  nameVi: 'Trượng Hồi Máu',
  type: 'staff',
  might: 0,
  hit: 100,
  crit: 0,
  weight: 2,
  minRange: 1,
  maxRange: 1,
  healBase: 10,
  maxUses: 20,
  effectiveAgainst: [],
};

const vulnerary: ItemDefinition = {
  id: 'vulnerary',
  name: 'Vulnerary',
  nameVi: 'Bình Máu',
  type: 'consumable',
  itemRole: 'healing',
  healAmount: 10,
  might: 0,
  hit: 0,
  crit: 0,
  weight: 0,
  minRange: 1,
  maxRange: 1,
  maxUses: 3,
  effectiveAgainst: [],
};

const itemsCatalog = new Map<string, ItemDefinition>([
  ['iron_sword', ironSword],
  ['iron_bow', ironBow],
  ['iron_axe', ironAxe],
  ['heal', healStaff],
  ['vulnerary', vulnerary],
]);

describe('smart FE enemy AI: turn order priority, self-healing, anti-suicide, and range kiting', () => {
  it('sorts enemy turn order giving healers and ranged units top priority', () => {
    const woundedAlly: GridUnit = {
      id: 'enemy_boss',
      name: 'Gazzak',
      faction: 'enemy',
      position: { x: 2, y: 2 },
      mov: 5,
      moveType: 'foot',
      classId: 'boss',
      isDead: false,
    };
    const healerUnit: GridUnit = {
      id: 'enemy_healer',
      name: 'Curate',
      faction: 'enemy',
      position: { x: 2, y: 3 },
      mov: 5,
      moveType: 'foot',
      classId: 'curate',
      isDead: false,
    };
    const archerUnit: GridUnit = {
      id: 'enemy_archer',
      name: 'Hunter',
      faction: 'enemy',
      position: { x: 5, y: 5 },
      mov: 5,
      moveType: 'foot',
      classId: 'hunter',
      isDead: false,
    };
    const meleeUnit: GridUnit = {
      id: 'enemy_brigand',
      name: 'Brigand',
      faction: 'enemy',
      position: { x: 8, y: 8 },
      mov: 5,
      moveType: 'foot',
      classId: 'fighter',
      isDead: false,
    };
    const playerUnit: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 5, y: 7 },
      mov: 5,
      moveType: 'foot',
      classId: 'lord',
      isDead: false,
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['enemy_boss', { hp: 5, maxHp: 30, str: 10, mag: 0, skill: 6, spd: 8, lck: 4, def: 8, res: 0 }],
      ['enemy_healer', { hp: 18, maxHp: 18, str: 1, mag: 6, skill: 4, spd: 5, lck: 2, def: 2, res: 5 }],
      ['enemy_archer', { hp: 20, maxHp: 20, str: 7, mag: 0, skill: 7, spd: 7, lck: 3, def: 4, res: 0 }],
      ['enemy_brigand', { hp: 24, maxHp: 24, str: 9, mag: 0, skill: 3, spd: 6, lck: 2, def: 5, res: 0 }],
      ['marth', { hp: 18, maxHp: 20, str: 7, mag: 0, skill: 8, spd: 9, lck: 7, def: 6, res: 0 }],
    ]);

    const context: AIContext = {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [woundedAlly, healerUnit, archerUnit, meleeUnit, playerUnit],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([
        ['enemy_healer', healStaff],
        ['enemy_archer', ironBow],
        ['enemy_brigand', ironSword],
        ['marth', ironSword],
      ]),
      itemsCatalog,
      unitInventoriesMap: new Map([
        ['enemy_healer', [{ itemId: 'heal', uses: 20 }]],
        ['enemy_archer', [{ itemId: 'iron_bow', uses: 40 }]],
        ['enemy_brigand', [{ itemId: 'iron_sword', uses: 40 }]],
      ]),
    };

    const healerExt: ExtendedUnitState = {
      unit: healerUnit,
      stats: statsMap.get('enemy_healer')!,
      level: 3,
      exp: 0,
      inventory: [{ itemId: 'heal', uses: 20 }],
    };
    const archerExt: ExtendedUnitState = {
      unit: archerUnit,
      stats: statsMap.get('enemy_archer')!,
      level: 3,
      exp: 0,
      inventory: [{ itemId: 'iron_bow', uses: 40 }],
    };
    const meleeExt: ExtendedUnitState = {
      unit: meleeUnit,
      stats: statsMap.get('enemy_brigand')!,
      level: 3,
      exp: 0,
      inventory: [{ itemId: 'iron_sword', uses: 40 }],
    };

    const sorted = sortEnemyTurnOrder([meleeExt, archerExt, healerExt], context);
    expect(sorted[0]!.unit.id).toBe('enemy_healer');
    expect(sorted[1]!.unit.id).toBe('enemy_archer');
    expect(sorted[2]!.unit.id).toBe('enemy_brigand');
  });

  it('triggers self-preservation to use Vulnerary when HP is at or below 40%', () => {
    const woundedBrigand: GridUnit = {
      id: 'wounded_enemy',
      name: 'Wounded Brigand',
      faction: 'enemy',
      position: { x: 3, y: 3 },
      mov: 5,
      moveType: 'foot',
      classId: 'fighter',
      isDead: false,
    };
    const playerMarth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 8, y: 8 },
      mov: 5,
      moveType: 'foot',
      classId: 'lord',
      isDead: false,
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['wounded_enemy', { hp: 8, maxHp: 24, str: 8, mag: 0, skill: 4, spd: 6, lck: 2, def: 4, res: 0 }],
      ['marth', { hp: 20, maxHp: 20, str: 7, mag: 0, skill: 8, spd: 9, lck: 7, def: 7, res: 0 }],
    ]);

    const context: AIContext = {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [woundedBrigand, playerMarth],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([
        ['wounded_enemy', ironSword],
        ['marth', ironSword],
      ]),
      itemsCatalog,
      unitInventoriesMap: new Map([
        ['wounded_enemy', [
          { itemId: 'iron_sword', uses: 30 },
          { itemId: 'vulnerary', uses: 3 },
        ]],
      ]),
    };

    const decision = evaluateAITurn(woundedBrigand, 'pursue', context);
    expect(decision.type).toBe('item_use');
    if (decision.type === 'item_use') {
      expect(decision.item.id).toBe('vulnerary');
      expect(decision.healAmount).toBe(10);
    }
  });

  it('enforces anti-suicide: refuses to suicide when dealing negligible damage against lethal counter', () => {
    const weakPirate: GridUnit = {
      id: 'weak_pirate',
      name: 'Pirate',
      faction: 'enemy',
      position: { x: 4, y: 4 },
      mov: 5,
      moveType: 'foot',
      classId: 'pirate',
      isDead: false,
    };
    const armoredDraug: GridUnit = {
      id: 'draug',
      name: 'Draug',
      faction: 'player',
      position: { x: 5, y: 4 },
      mov: 4,
      moveType: 'foot',
      classId: 'knight',
      isDead: false,
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['weak_pirate', { hp: 6, maxHp: 20, str: 7, mag: 0, skill: 4, spd: 5, lck: 1, def: 2, res: 0 }],
      ['draug', { hp: 25, maxHp: 25, str: 9, mag: 0, skill: 8, spd: 5, lck: 4, def: 11, res: 0 }],
    ]);

    const context: AIContext = {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [weakPirate, armoredDraug],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([
        ['weak_pirate', ironSword],
        ['draug', ironSword],
      ]),
      itemsCatalog,
      unitInventoriesMap: new Map([
        ['weak_pirate', [{ itemId: 'iron_sword', uses: 30 }]],
      ]),
    };

    const decision = evaluateAITurn(weakPirate, 'pursue', context);
    expect(decision.type).not.toBe('attack');
  });

  it('prefers max-range kiting at distance 2 when target has only 1-range weapon', () => {
    const archer: GridUnit = {
      id: 'archer',
      name: 'Enemy Archer',
      faction: 'enemy',
      position: { x: 3, y: 3 },
      mov: 5,
      moveType: 'foot',
      classId: 'hunter',
      isDead: false,
    };
    const meleePlayer: GridUnit = {
      id: 'ogma',
      name: 'Ogma',
      faction: 'player',
      position: { x: 4, y: 3 },
      mov: 5,
      moveType: 'foot',
      classId: 'mercenary',
      isDead: false,
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['archer', { hp: 20, maxHp: 20, str: 8, mag: 0, skill: 6, spd: 7, lck: 3, def: 4, res: 0 }],
      ['ogma', { hp: 22, maxHp: 22, str: 8, mag: 0, skill: 10, spd: 11, lck: 5, def: 6, res: 0 }],
    ]);

    const context: AIContext = {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [archer, meleePlayer],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([
        ['archer', ironBow],
        ['ogma', ironSword],
      ]),
      itemsCatalog,
      unitInventoriesMap: new Map([
        ['archer', [{ itemId: 'iron_bow', uses: 35 }]],
      ]),
    };

    const decision = evaluateAITurn(archer, 'pursue', context);
    expect(decision.type).toBe('attack');
    if (decision.type === 'attack') {
      const dist = Math.abs(decision.movePosition.x - meleePlayer.position.x) + Math.abs(decision.movePosition.y - meleePlayer.position.y);
      expect(dist).toBe(2);
      expect(decision.forecast.defender.canCounter).toBe(false);
    }
  });

  it('focus fire: prioritizes already-wounded player units', () => {
    const enemy: GridUnit = {
      id: 'enemy_pirate',
      name: 'Pirate',
      faction: 'enemy',
      position: { x: 5, y: 5 },
      mov: 5,
      moveType: 'foot',
      classId: 'pirate',
      isDead: false,
    };
    const healthyPlayer: GridUnit = {
      id: 'player_healthy',
      name: 'Full HP Ally',
      faction: 'player',
      position: { x: 5, y: 4 },
      mov: 5,
      moveType: 'foot',
      classId: 'fighter',
      isDead: false,
    };
    const woundedPlayer: GridUnit = {
      id: 'player_wounded',
      name: 'Wounded Ally',
      faction: 'player',
      position: { x: 5, y: 6 },
      mov: 5,
      moveType: 'foot',
      classId: 'fighter',
      isDead: false,
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['enemy_pirate', { hp: 22, maxHp: 22, str: 8, mag: 0, skill: 5, spd: 6, lck: 2, def: 5, res: 0 }],
      ['player_healthy', { hp: 24, maxHp: 24, str: 7, mag: 0, skill: 5, spd: 5, lck: 3, def: 5, res: 0 }],
      ['player_wounded', { hp: 6, maxHp: 24, str: 7, mag: 0, skill: 5, spd: 5, lck: 3, def: 5, res: 0 }],
    ]);

    const context: AIContext = {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [enemy, healthyPlayer, woundedPlayer],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([
        ['enemy_pirate', ironAxe],
        ['player_healthy', ironAxe],
        ['player_wounded', ironAxe],
      ]),
      itemsCatalog,
      unitInventoriesMap: new Map([
        ['enemy_pirate', [{ itemId: 'iron_axe', uses: 30 }]],
      ]),
    };

    const decision = evaluateAITurn(enemy, 'pursue', context);
    expect(decision.type).toBe('attack');
    if (decision.type === 'attack') {
      expect(decision.targetUnit.id).toBe('player_wounded');
    }
  });
});

describe('anti-suicide never cancels a killing blow and boss priority reads the data flag (PLAN item 192)', () => {
  const enemyUnit: GridUnit = {
    id: 'enemy_fighter', name: 'Brigand', faction: 'enemy', position: { x: 3, y: 3 },
    mov: 5, moveType: 'foot', classId: 'fighter', isDead: false,
  };
  const targetUnit: GridUnit = {
    id: 'barst', name: 'Barst', faction: 'player', position: { x: 4, y: 3 },
    mov: 5, moveType: 'foot', classId: 'fighter', isDead: false,
  };

  /** Enemy deals 2 damage (<= antiSuicideThreshold) and dies to the counter. */
  function contextWithTargetHp(targetHp: number): AIContext {
    const statsMap = new Map<string, UnitCombatStats>([
      ['enemy_fighter', { hp: 5, maxHp: 24, str: 8, mag: 0, skill: 8, spd: 7, lck: 2, def: 4, res: 0 }],
      ['barst', { hp: targetHp, maxHp: 24, str: 11, mag: 0, skill: 10, spd: 7, lck: 5, def: 13, res: 0 }],
    ]);
    return {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [enemyUnit, targetUnit],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([['enemy_fighter', ironAxe], ['barst', ironAxe]]),
      itemsCatalog,
      unitInventoriesMap: new Map([['enemy_fighter', [{ itemId: 'iron_axe', uses: 30 }]]]),
    };
  }

  it('still attacks when the weak blow kills, even though the counter would be lethal', () => {
    const decision = evaluateAITurn(enemyUnit, 'pursue', contextWithTargetHp(2));
    expect(decision.type).toBe('attack');
    if (decision.type === 'attack') {
      expect(decision.targetUnit.id).toBe('barst');
      expect(decision.forecast.attacker.damage).toBeLessThanOrEqual(2);
      expect(decision.forecast.attacker.damage * decision.forecast.attacker.attackCount)
        .toBeGreaterThanOrEqual(2);
      expect(decision.forecast.defender.damage).toBeGreaterThanOrEqual(5);
    }
  });

  it('refuses the same attack when it does not kill', () => {
    const decision = evaluateAITurn(enemyUnit, 'pursue', contextWithTargetHp(24));
    expect(decision.type).not.toBe('attack');
  });

  it('collectBossUnitIds returns only units flagged isBoss in chapter data', () => {
    const entryOf = (id: string, isBoss?: boolean): ExtendedUnitState => ({
      unit: { ...enemyUnit, id, name: id },
      stats: { hp: 10, maxHp: 10, str: 1, mag: 0, skill: 1, spd: 1, lck: 1, def: 1, res: 0 },
      level: 1,
      exp: 0,
      inventory: [],
      ...(isBoss === undefined ? {} : { isBoss }),
    });
    const ids = collectBossUnitIds([entryOf('a', true), entryOf('b', false), entryOf('c')]);
    expect([...ids]).toEqual(['a']);
  });

  it('heals the boss ally over a more wounded ally, by the data flag and not by name', () => {
    const healer: GridUnit = {
      id: 'enemy_healer', name: 'Curate', faction: 'enemy', position: { x: 2, y: 2 },
      mov: 5, moveType: 'foot', classId: 'curate', isDead: false,
    };
    const allyLow: GridUnit = {
      id: 'ally_low', name: 'Brigand', faction: 'enemy', position: { x: 2, y: 3 },
      mov: 5, moveType: 'foot', classId: 'fighter', isDead: false,
    };
    const allyBoss: GridUnit = {
      id: 'ally_boss', name: 'Gharnef', faction: 'enemy', position: { x: 3, y: 2 },
      mov: 5, moveType: 'foot', classId: 'fighter', isDead: false,
    };
    const farPlayer: GridUnit = {
      id: 'marth', name: 'Marth', faction: 'player', position: { x: 9, y: 9 },
      mov: 5, moveType: 'foot', classId: 'lord', isDead: false,
    };

    const statsMap = new Map<string, UnitCombatStats>([
      ['enemy_healer', { hp: 18, maxHp: 18, str: 1, mag: 6, skill: 4, spd: 5, lck: 2, def: 2, res: 5 }],
      ['ally_low', { hp: 10, maxHp: 24, str: 9, mag: 0, skill: 3, spd: 6, lck: 2, def: 5, res: 0 }],
      ['ally_boss', { hp: 14, maxHp: 24, str: 9, mag: 0, skill: 3, spd: 6, lck: 2, def: 5, res: 0 }],
      ['marth', { hp: 20, maxHp: 20, str: 7, mag: 0, skill: 8, spd: 9, lck: 7, def: 6, res: 0 }],
    ]);
    const base = {
      map: mockMap,
      terrains: defaultTerrainRegistry,
      units: [healer, allyLow, allyBoss, farPlayer],
      unitStatsMap: statsMap,
      unitWeaponsMap: new Map([['enemy_healer', healStaff]]),
      itemsCatalog,
      unitInventoriesMap: new Map([['enemy_healer', [{ itemId: 'heal', uses: 20 }]]]),
    };

    const withoutFlag = evaluateAITurn(healer, 'pursue', base);
    expect(withoutFlag.type).toBe('staff');
    if (withoutFlag.type === 'staff') expect(withoutFlag.targetUnit.id).toBe('ally_low');

    const withFlag = evaluateAITurn(healer, 'pursue', { ...base, bossUnitIds: new Set(['ally_boss']) });
    expect(withFlag.type).toBe('staff');
    if (withFlag.type === 'staff') expect(withFlag.targetUnit.id).toBe('ally_boss');
  });
});
