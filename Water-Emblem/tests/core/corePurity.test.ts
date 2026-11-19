import { describe, it, expect } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { GridUnit } from '../../src/core/grid/types';
import { calculateCombatForecast, executeCombat } from '../../src/core/combat/calculator';
import { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import { SeededRNG } from '../../src/core/combat/rng';
import { TurnManager } from '../../src/core/turn/turnManager';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

// PLAN item 133 (M5 core purity): acceptance tests from
// work/water-batch4-m5-m7-m12/specs-draft/core-purity.md (A1-A6).
describe('core purity (PLAN item 133)', () => {
  const terrains = new TerrainRegistry();
  const items = itemsData.items as readonly ItemDefinition[];
  const getItem = (id: string) => items.find((item) => item.id === id)!;

  const makeUnit = (id: string, faction: 'player' | 'enemy', x: number): GridUnit => ({
    id, name: id.toUpperCase(), faction, position: { x, y: 0 }, mov: 5, moveType: 'foot', hasActed: false,
  });

  const makeEntry = (id: string, faction: 'player' | 'enemy', stats: UnitCombatStats, weaponId: string): ExtendedUnitState => ({
    unit: makeUnit(id, faction, faction === 'player' ? 0 : 1),
    stats,
    weapon: getItem(weaponId),
    inventory: [],
    level: 3,
    exp: 0,
  });

  it('core-purity/A1 executeCombat leaves input forecast untouched', () => {
    const attacker = makeUnit('hero', 'player', 0);
    const defender = makeUnit('brigand', 'enemy', 1);
    const attackerStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 9, mag: 0, skill: 30, spd: 12, lck: 5, def: 5, res: 0 };
    const defenderStats: UnitCombatStats = { hp: 10, maxHp: 10, str: 7, mag: 0, skill: 3, spd: 4, lck: 0, def: 2, res: 0 };
    const forecast = calculateCombatForecast(
      attacker, attackerStats, getItem('iron_sword'), defender, defenderStats, getItem('iron_axe'), 1, terrains, 'plains', 'plains',
    );

    executeCombat(forecast, new SeededRNG(7));

    expect(forecast.attacker.stats.hp).toBe(20);
    expect(forecast.defender.stats.hp).toBe(10);
    expect(attackerStats.hp).toBe(20);
    expect(defenderStats.hp).toBe(10);
  });

  it('core-purity/A2 combat result carries post-combat HP', () => {
    const attacker = makeUnit('hero', 'player', 0);
    const defender = makeUnit('brigand', 'enemy', 1);
    // Attacker deals 6 per strike (Str 1 + Iron Sword Mt 5 - Def 0) and doubles;
    // the defender's bow cannot counter at distance 1.
    const attackerStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 1, mag: 0, skill: 30, spd: 12, lck: 5, def: 5, res: 0 };
    const defenderStats: UnitCombatStats = { hp: 10, maxHp: 10, str: 7, mag: 0, skill: 3, spd: 4, lck: 0, def: 0, res: 0 };
    const forecast = calculateCombatForecast(
      attacker, attackerStats, getItem('iron_sword'), defender, defenderStats, getItem('iron_bow'), 1, terrains, 'plains', 'plains',
    );
    expect(forecast.attacker.damage).toBe(6);
    expect(forecast.attacker.attackCount).toBe(2);

    const result = executeCombat(forecast, new SeededRNG(7));

    expect(result.forecast.defender.stats.hp).toBe(0);
    expect(result.forecast.attacker.stats.hp).toBe(20);
    expect(result.unitDefeatedId).toBe('brigand');
  });

  it('core-purity/A3 TurnManager returns new state without mutating inputs', () => {
    const units: GridUnit[] = [makeUnit('marth', 'player', 0), makeUnit('pirate', 'enemy', 5)];
    const manager = new TurnManager(units);
    const reachable = new Map([['0,2', { position: { x: 0, y: 2 }, costRemaining: 2, path: [{ x: 0, y: 0 }, { x: 0, y: 2 }] }]]);

    expect(manager.selectUnit('marth', reachable)).toBe(true);
    expect(manager.moveSelectedUnit({ x: 0, y: 2 })).toBe(true);
    // Unchanged units are shared after the move.
    expect(manager.getState().units.find((u) => u.id === 'pirate')).toBe(units[1]);
    expect(manager.waitSelectedUnit()).toBe(true);

    // The objects given to the manager are untouched.
    expect(units[0]!.position).toEqual({ x: 0, y: 0 });
    expect(units[0]!.hasActed).toBe(false);
    // The returned state shows the new position and the unit as having acted.
    const state = manager.getState();
    const moved = state.units.find((u) => u.id === 'marth')!;
    expect(moved.position).toEqual({ x: 0, y: 2 });
    expect(moved.hasActed).toBe(true);
    expect(moved).not.toBe(units[0]);
  });

  it('core-purity/A4 restored state uses new unit objects', () => {
    const manager = new TurnManager([makeUnit('marth', 'player', 0)]);
    const restored = [makeUnit('marth', 'player', 2), makeUnit('pirate', 'enemy', 5)];

    manager.restoreState({ turnNumber: 4, activePhase: 'player_phase' }, restored);

    const state = manager.getState();
    expect(state.units).toEqual(restored);
    expect(state.units).not.toBe(restored);
    expect(state.units[0]).not.toBe(restored[0]);
    expect(state.units[1]).not.toBe(restored[1]);
  });

  it('core-purity/A5 AI-phase combat updates HP from the result', () => {
    const enemy = makeEntry('brigand', 'enemy', { hp: 18, maxHp: 18, str: 12, mag: 0, skill: 30, spd: 4, lck: 0, def: 2, res: 0 }, 'iron_axe');
    const player = makeEntry('hero', 'player', { hp: 8, maxHp: 20, str: 9, mag: 0, skill: 9, spd: 12, lck: 5, def: 0, res: 0 }, 'iron_sword');
    const phaseUnits = [enemy, player];
    // The AI flow builds its forecast from a stats map sharing the entries' stats objects.
    const statsMap = new Map(phaseUnits.map((u) => [u.unit.id, u.stats]));
    const forecast = calculateCombatForecast(
      enemy.unit, statsMap.get('brigand')!, enemy.weapon, player.unit, statsMap.get('hero')!, player.weapon, 1, terrains, 'plains', 'plains',
    );

    const result = executeCombat(forecast, new SeededRNG(7));

    // Purity: the shared stats objects were not written to.
    expect(statsMap.get('hero')!.hp).toBe(8);
    expect(player.stats.hp).toBe(8);
    // Applying the result (the App AI-flow write-back) updates HP and defeat.
    const attackerEntry = phaseUnits.find((u) => u.unit.id === enemy.unit.id)!;
    const defenderEntry = phaseUnits.find((u) => u.unit.id === player.unit.id)!;
    attackerEntry.stats.hp = result.forecast.attacker.stats.hp;
    defenderEntry.stats.hp = result.forecast.defender.stats.hp;
    expect(defenderEntry.stats.hp).toBe(0);
    expect(result.unitDefeatedId).toBe('hero');
  });

  it('core-purity/A6 player combat updates HP and death from the result', () => {
    const player = makeEntry('hero', 'player', { hp: 20, maxHp: 20, str: 12, mag: 0, skill: 30, spd: 12, lck: 5, def: 5, res: 0 }, 'iron_sword');
    const enemy = makeEntry('brigand', 'enemy', { hp: 10, maxHp: 18, str: 7, mag: 0, skill: 3, spd: 4, lck: 0, def: 0, res: 0 }, 'iron_bow');
    const forecast = calculateCombatForecast(
      player.unit, player.stats, player.weapon, enemy.unit, enemy.stats, enemy.weapon, 1, terrains, 'plains', 'plains',
    );

    const result = executeCombat(forecast, new SeededRNG(7));

    // The App player flow rebuilds entries from the result forecast stats.
    const updated = [player, enemy].map((item) => {
      if (item.unit.id === player.unit.id) return { ...item, stats: { ...result.forecast.attacker.stats }, unit: { ...item.unit, isDead: result.forecast.attacker.stats.hp <= 0 } };
      if (item.unit.id === enemy.unit.id) return { ...item, stats: { ...result.forecast.defender.stats }, unit: { ...item.unit, isDead: result.forecast.defender.stats.hp <= 0 } };
      return item;
    });
    expect(updated[1]!.stats.hp).toBe(0);
    expect(updated[1]!.unit.isDead).toBe(true);
    expect(updated[0]!.stats.hp).toBe(20);
    expect(updated[0]!.unit.isDead).toBe(false);
    // Inputs untouched.
    expect(player.stats.hp).toBe(20);
    expect(enemy.stats.hp).toBe(10);
  });
});
