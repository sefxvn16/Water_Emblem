import { describe, it, expect } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { calculateCombatForecast, executeCombat } from '../../src/core/combat/calculator';
import { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import { SeededRNG } from '../../src/core/combat/rng';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import { buildCombatPopup } from '../../src/ui/combatPopupData';

// Combat result popup data (PLAN.md item 73): reads a finished exchange, never recomputes it.
describe('buildCombatPopup', () => {
  const terrains = new TerrainRegistry();
  const items = itemsData.items as readonly ItemDefinition[];
  const getItem = (id: string) => items.find((item) => item.id === id)!;

  const makeEntry = (id: string, faction: 'player' | 'enemy', stats: UnitCombatStats, weaponId: string): ExtendedUnitState => ({
    unit: { id, name: id.toUpperCase(), faction, position: { x: faction === 'player' ? 0 : 1, y: 0 }, mov: 5, moveType: 'foot' },
    stats,
    weapon: getItem(weaponId),
    inventory: [],
    level: 3,
    exp: 0,
  });

  const exchange = (seed: number) => {
    const player = makeEntry('hero', 'player', { hp: 20, maxHp: 20, str: 9, mag: 0, skill: 9, spd: 12, lck: 5, def: 5, res: 0 }, 'iron_sword');
    const enemy = makeEntry('brigand', 'enemy', { hp: 18, maxHp: 18, str: 7, mag: 0, skill: 3, spd: 4, lck: 0, def: 2, res: 0 }, 'iron_axe');
    const forecast = calculateCombatForecast(
      player.unit, player.stats, player.weapon, enemy.unit, enemy.stats, enemy.weapon, 1, terrains, 'plains', 'plains',
    );
    const hpBefore = { attacker: player.stats.hp, defender: enemy.stats.hp };
    const result = executeCombat(forecast, new SeededRNG(seed));
    return { player, enemy, hpBefore, result };
  };

  it('puts the enemy panel first and the player panel second, whoever attacked', () => {
    const { player, enemy, hpBefore, result } = exchange(7);
    const asPlayerAttack = buildCombatPopup(1, player, enemy, hpBefore, result);
    expect(asPlayerAttack.sides.map((side) => side.faction)).toEqual(['enemy', 'player']);
    const asEnemyAttack = buildCombatPopup(2, enemy, player, { attacker: hpBefore.defender, defender: hpBefore.attacker }, {
      ...result,
      forecast: { ...result.forecast, attacker: result.forecast.defender, defender: result.forecast.attacker },
    });
    expect(asEnemyAttack.sides.map((side) => side.faction)).toEqual(['enemy', 'player']);
  });

  it('shows HP captured before combat and HP after from the result, with one strike line per event', () => {
    const { player, enemy, hpBefore, result } = exchange(11);
    const popup = buildCombatPopup(1, player, enemy, hpBefore, result);
    const [enemySide, playerSide] = popup.sides;

    expect(playerSide.hpBefore).toBe(20);
    expect(enemySide.hpBefore).toBe(18);
    expect(playerSide.hpAfter).toBe(result.forecast.attacker.stats.hp);
    expect(enemySide.hpAfter).toBe(result.forecast.defender.stats.hp);

    const playerStrikes = result.events.filter((event) => event.attackerId === 'hero');
    const enemyStrikes = result.events.filter((event) => event.attackerId === 'brigand');
    expect(playerSide.strikes).toHaveLength(playerStrikes.length);
    expect(enemySide.strikes).toHaveLength(enemyStrikes.length);
    playerStrikes.forEach((event, index) => {
      const expected = !event.isHit ? 'Miss' : `${event.isCrit ? 'Critical' : 'Hit'} ${event.damageDealt}`;
      expect(playerSide.strikes[index]).toBe(expected);
    });

    expect(enemySide.defeated).toBe(result.unitDefeatedId === 'brigand');
    expect(playerSide.defeated).toBe(result.unitDefeatedId === 'hero');
  });
});
