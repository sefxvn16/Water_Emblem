import { describe, expect, it } from 'vitest';
import { calculateCombatForecast, executeCombat } from '../../src/core/combat/calculator';
import { SeededRNG } from '../../src/core/combat/rng';
import { evaluateAITurn } from '../../src/core/ai/decision';
import { TerrainRegistry, healUnitsOnTerrain } from '../../src/core/grid/terrain';
import { promoteWithMasterSeal, useVulnerary } from '../../src/core/class/classRules';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import type { MapData } from '../../src/core/grid/types';
import itemsJson from '../../data/items.json' with { type: 'json' };

const terrains = new TerrainRegistry();

function makeMockUnit(overrides: Partial<ExtendedUnitState> = {}): ExtendedUnitState {
  return {
    unit: {
      id: 'mock_marth',
      name: 'Marth',
      classId: 'lord',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 5,
      moveType: 'foot',
      weaponRanks: { sword: 'A' },
      isDead: false,
      hasActed: false,
    },
    stats: {
      hp: 20,
      maxHp: 20,
      str: 8,
      mag: 0,
      skill: 6,
      spd: 10,
      lck: 7,
      def: 7,
      res: 0,
    },
    weapon: {
      id: 'iron_sword',
      name: 'Iron Sword',
      nameVi: 'Kiếm sắt',
      type: 'sword',
      might: 5,
      hit: 100,
      weight: 5,
      crit: 0,
      minRange: 1,
      maxRange: 1,
      maxUses: 40,
      effectiveAgainst: [],
    },
    inventory: [],
    level: 1,
    exp: 0,
    ...overrides,
  };
}

describe('Combat Edge Cases & Fault Tolerance', () => {
  it('handles zero damage correctly when defense exceeds attack (no negative HP)', () => {
    const attacker = makeMockUnit({
      stats: { hp: 20, maxHp: 20, str: 2, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 },
      weapon: { id: 'slim_sword', name: 'Slim Sword', nameVi: 'Kiếm mỏng', type: 'sword', might: 3, hit: 100, weight: 2, crit: 0, minRange: 1, maxRange: 1, maxUses: 30, effectiveAgainst: [] },
    });
    const tank = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'tank_draug', classId: 'knight', moveType: 'armor' },
      stats: { hp: 25, maxHp: 25, str: 8, mag: 0, skill: 4, spd: 2, lck: 2, def: 15, res: 0 },
    });

    // Attacker Atk = 2 + 3 = 5; Tank Def = 15 => Base dmg <= 0
    const forecast = calculateCombatForecast(
      attacker.unit, attacker.stats, attacker.weapon,
      tank.unit, tank.stats, tank.weapon,
      1, terrains, 'plains', 'plains', [attacker.unit, tank.unit]
    );

    expect(forecast.attacker.damage).toBe(0);

    const rng = new SeededRNG(42);
    const result = executeCombat(forecast, rng);

    expect(result.events[0]?.damageDealt).toBe(0);
    expect(result.events[0]?.defenderHpAfter).toBe(25);
    expect(result.unitDefeatedId).toBeUndefined();
  });

  it('stops double attack immediately if defender is killed on the first hit', () => {
    const fastAttacker = makeMockUnit({
      stats: { hp: 20, maxHp: 20, str: 15, mag: 0, skill: 10, spd: 18, lck: 5, def: 8, res: 0 },
      weapon: { id: 'silver_sword', name: 'Silver Sword', nameVi: 'Kiếm bạc', type: 'sword', might: 12, hit: 100, weight: 6, crit: 0, minRange: 1, maxRange: 1, maxUses: 20, effectiveAgainst: [] },
    });
    const weakDefender = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'weak_bandit', faction: 'enemy' },
      stats: { hp: 10, maxHp: 10, str: 4, mag: 0, skill: 2, spd: 2, lck: 1, def: 2, res: 0 },
    });

    const forecast = calculateCombatForecast(
      fastAttacker.unit, fastAttacker.stats, fastAttacker.weapon,
      weakDefender.unit, weakDefender.stats, weakDefender.weapon,
      1, terrains, 'plains', 'plains', [fastAttacker.unit, weakDefender.unit]
    );

    // Fast attacker would double attack (AS diff 18 - 2 = 16 >= 4)
    expect(forecast.attacker.attackCount).toBe(2);

    const rng = new SeededRNG(12345);
    const result = executeCombat(forecast, rng);

    // Lethal on first hit (Atk: Str 15 + Might 12 + Rank A bonus 3 - Def 2 = 28 >= 10 HP)
    // Only 1 hit event should occur, no overkill second hit
    expect(result.events.length).toBe(1);
    expect(result.events[0]?.damageDealt).toBe(28);
    expect(result.events[0]?.defenderHpAfter).toBe(0);
    expect(result.unitDefeatedId).toBe('weak_bandit');
  });

  it('applies triple weapon might for effective damage against matching class types', () => {
    const marthWithRapier = makeMockUnit({
      weapon: { id: 'rapier', name: 'Rapier', nameVi: 'Kiếm Liễu', type: 'sword', might: 5, hit: 95, weight: 5, crit: 10, minRange: 1, maxRange: 1, maxUses: 25, effectiveAgainst: ['armor', 'cavalry'] },
    });
    const knightDefender = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'knight_enemy', classId: 'knight', moveType: 'armor', faction: 'enemy' },
      stats: { hp: 25, maxHp: 25, str: 7, mag: 0, skill: 3, spd: 2, lck: 1, def: 8, res: 0 },
    });

    const forecast = calculateCombatForecast(
      marthWithRapier.unit, marthWithRapier.stats, marthWithRapier.weapon,
      knightDefender.unit, knightDefender.stats, knightDefender.weapon,
      1, terrains, 'plains', 'plains', [marthWithRapier.unit, knightDefender.unit]
    );

    // Effective damage: might 5 * 3 = 15 might. Str 8 + 15 might + 3 Rank A bonus - Def 8 => 18 damage.
    expect(forecast.attacker.damage).toBe(18);
  });
});

describe('Terrain Healing & Fort Regeneration Edge Cases', () => {
  const map: MapData = {
    id: 'test_heal_map',
    name: 'Test Heal Map',
    width: 4,
    height: 4,
    grid: [
      ['fort', 'plains', 'plains', 'plains'],
      ['plains', 'fort', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains'],
    ],
  };

  it('heals 20% max HP on fort but never exceeds max HP', () => {
    const wounded = makeMockUnit({
      unit: { ...makeMockUnit().unit, position: { x: 0, y: 0 } },
      stats: { hp: 5, maxHp: 20, str: 8, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 },
    });
    const fullHp = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'full_unit', position: { x: 1, y: 1 } },
      stats: { hp: 20, maxHp: 20, str: 8, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 },
    });

    const healed = healUnitsOnTerrain([wounded, fullHp], 'player', map, terrains);

    // 20% of 20 = 4 HP healed => 5 + 4 = 9 HP
    expect(healed.find((u) => u.unit.id === wounded.unit.id)?.stats.hp).toBe(9);
    // Full HP stays capped at 20
    expect(healed.find((u) => u.unit.id === fullHp.unit.id)?.stats.hp).toBe(20);
  });

  it('does not heal dead units on fort', () => {
    const deadUnit = makeMockUnit({
      unit: { ...makeMockUnit().unit, position: { x: 0, y: 0 }, isDead: true },
      stats: { hp: 0, maxHp: 20, str: 8, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 },
    });

    const result = healUnitsOnTerrain([deadUnit], 'player', map, terrains);
    expect(result[0]?.stats.hp).toBe(0);
    expect(result[0]?.unit.isDead).toBe(true);
  });
});

describe('Inventory & Item Edge Cases', () => {
  it('useVulnerary heals 10 HP, caps at maxHp, and reduces uses by 1', () => {
    const wounded = makeMockUnit({
      stats: { hp: 12, maxHp: 20, str: 8, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 },
      inventory: [{ itemId: 'vulnerary', uses: 2 }],
    });
    const vulneraryItem = itemsJson.items.find((i) => i.id === 'vulnerary')!;

    const afterUse = useVulnerary(wounded, vulneraryItem as any);
    expect(afterUse).not.toBeNull();
    expect(afterUse!.stats.hp).toBe(20); // 12 + 10 = 22, capped at 20
    expect(afterUse!.inventory[0]?.uses).toBe(1);

    // Second use when full HP returns null
    const secondUse = useVulnerary(afterUse!, vulneraryItem as any);
    expect(secondUse).toBeNull();
  });

  it('depletes consumable item completely when last use is consumed', () => {
    const wounded = makeMockUnit({
      stats: { hp: 5, maxHp: 20, str: 8, mag: 0, skill: 5, spd: 5, lck: 5, def: 5, res: 0 },
      inventory: [{ itemId: 'vulnerary', uses: 1 }],
    });
    const vulneraryItem = itemsJson.items.find((i) => i.id === 'vulnerary')!;

    const afterUse = useVulnerary(wounded, vulneraryItem as any);
    expect(afterUse).not.toBeNull();
    expect(afterUse!.stats.hp).toBe(15);
    // Inventory should be empty after last use is consumed
    expect(afterUse!.inventory.length).toBe(0);
  });

  it('rejects promotion if unit is below level 10', () => {
    const lowLevelKnight = makeMockUnit({
      unit: { ...makeMockUnit().unit, classId: 'cavalier' },
      level: 9,
      inventory: [{ itemId: 'master_seal', uses: 1 }],
    });

    const promoted = promoteWithMasterSeal(lowLevelKnight, 'cataphract');
    expect(promoted).toBeNull();
  });

  it('promotes successfully at level 10+ and resets level to 1 with promotional stat gains', () => {
    const readyCavalier = makeMockUnit({
      unit: { ...makeMockUnit().unit, classId: 'cavalier' },
      level: 10,
      inventory: [{ itemId: 'master_seal', uses: 1 }],
    });

    const promoted = promoteWithMasterSeal(readyCavalier, 'cataphract');
    expect(promoted).not.toBeNull();
    expect(promoted!.unit.classId).toBe('cataphract');
    expect(promoted!.level).toBe(1);
    expect(promoted!.inventory.length).toBe(0); // master seal consumed
    expect(promoted!.stats.maxHp).toBeGreaterThanOrEqual(readyCavalier.stats.maxHp);
  });
});

describe('AI Decision Edge Cases & Obstacle Navigation', () => {
  const blockedMap: MapData = {
    id: 'choke_map',
    name: 'Choke Point Map',
    width: 5,
    height: 5,
    grid: [
      ['sea', 'sea', 'sea', 'sea', 'sea'],
      ['plains', 'plains', 'plains', 'plains', 'plains'],
      ['sea', 'sea', 'mountain', 'sea', 'sea'],
      ['plains', 'plains', 'plains', 'plains', 'plains'],
      ['sea', 'sea', 'sea', 'sea', 'sea'],
    ],
  };

  it('stationary AI holds position and does not pursue far enemies', () => {
    const boss = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'boss_unit', faction: 'enemy', position: { x: 0, y: 1 }, mov: 0 },
      aiRole: 'stationary',
    });
    const playerUnit = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'marth', position: { x: 4, y: 1 } },
    });

    const decision = evaluateAITurn(boss.unit, 'stationary', {
      map: blockedMap,
      terrains,
      units: [boss.unit, playerUnit.unit],
      unitStatsMap: new Map([[boss.unit.id, boss.stats], [playerUnit.unit.id, playerUnit.stats]]),
      unitWeaponsMap: new Map([[boss.unit.id, boss.weapon], [playerUnit.unit.id, playerUnit.weapon]]),
    });

    expect(decision.type).toBe('wait');
  });

  it('pursue AI transitions to wait safely when completely surrounded or trapped', () => {
    const trappedEnemy = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'trapped_enemy', faction: 'enemy', position: { x: 1, y: 1 }, mov: 5 },
    });
    const wallMap: MapData = {
      id: 'walled_in',
      name: 'Walled In',
      width: 3,
      height: 3,
      grid: [
        ['sea', 'sea', 'sea'],
        ['sea', 'plains', 'sea'],
        ['sea', 'sea', 'sea'],
      ],
    };

    const distantPlayer = makeMockUnit({
      unit: { ...makeMockUnit().unit, id: 'player_out_of_reach', position: { x: 0, y: 0 } },
    });

    const decision = evaluateAITurn(trappedEnemy.unit, 'pursue', {
      map: wallMap,
      terrains,
      units: [trappedEnemy.unit, distantPlayer.unit],
      unitStatsMap: new Map([[trappedEnemy.unit.id, trappedEnemy.stats], [distantPlayer.unit.id, distantPlayer.stats]]),
      unitWeaponsMap: new Map([[trappedEnemy.unit.id, trappedEnemy.weapon], [distantPlayer.unit.id, distantPlayer.weapon]]),
    });

    expect(decision.type).toBe('wait');
  });
});

