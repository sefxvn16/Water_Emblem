import { describe, it, expect } from 'vitest';
import { calculateSupportBonus } from '../../src/core/combat/support';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { GridUnit } from '../../src/core/grid/types';
import { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';

describe('Support Relationship System (N06)', () => {
  it('Marth starts below C and earns C after a shared chapter', () => {
    const marth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 7,
      moveType: 'foot',
      isDead: false,
    };
    const caeda: GridUnit = {
      id: 'caeda',
      name: 'Caeda',
      faction: 'player',
      position: { x: 6, y: 5 }, // Cách 1 ô
      mov: 8,
      moveType: 'flier',
      isDead: false,
    };

    const bonus = calculateSupportBonus(marth, [marth, caeda]);
    expect(bonus.hit).toBe(0);
    const rankC = calculateSupportBonus({ ...marth, supportPoints: { caeda: 5 } }, [marth, caeda]);
    expect(rankC.hit).toBe(5);
    expect(rankC.avoid).toBe(5);
    expect(rankC.crit).toBe(0);
  });

  it('không nhận bonus nếu đồng đội đứng ngoài phạm vi 3 ô', () => {
    const marth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 7,
      moveType: 'foot',
      isDead: false,
    };
    const caeda: GridUnit = {
      id: 'caeda',
      name: 'Caeda',
      faction: 'player',
      position: { x: 4, y: 0 }, // Cách 4 ô (> 3 ô)
      mov: 8,
      moveType: 'flier',
      isDead: false,
    };

    const bonus = calculateSupportBonus(marth, [marth, caeda]);
    expect(bonus.hit).toBe(0);
    expect(bonus.avoid).toBe(0);
  });

  it('uses the sourced support direction and A-rank bonus', () => {
    const marth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 7,
      moveType: 'foot',
      isDead: false,
      supportPoints: { caeda: 13 },
    };
    const caeda: GridUnit = {
      id: 'caeda',
      name: 'Caeda',
      faction: 'player',
      position: { x: 6, y: 5 },
      mov: 8,
      moveType: 'flier',
      isDead: false,
    };
    const jagen: GridUnit = {
      id: 'jagen',
      name: 'Jagen',
      faction: 'player',
      position: { x: 4, y: 5 },
      mov: 10,
      moveType: 'cavalry',
      isDead: false,
    };

    const bonus = calculateSupportBonus(marth, [marth, caeda, jagen]);
    expect(bonus.hit).toBe(10);
    expect(bonus.avoid).toBe(10);
    expect(bonus.crit).toBe(5);
    expect(calculateSupportBonus({ ...jagen, supportPoints: { marth: 5 } }, [marth, jagen]).hit).toBe(5);
    expect(calculateSupportBonus({ ...marth, supportPoints: { jagen: 13 } }, [marth, jagen]).hit).toBe(0);
  });

  it('không nhận bonus nếu đồng đội hỗ trợ đã tử trận', () => {
    const marth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 7,
      moveType: 'foot',
      isDead: false,
      supportPoints: { caeda: 13 },
    };
    const deadCaeda: GridUnit = {
      id: 'caeda',
      name: 'Caeda',
      faction: 'player',
      position: { x: 6, y: 5 },
      mov: 8,
      moveType: 'flier',
      isDead: true, // Đã chết
    };

    const bonus = calculateSupportBonus(marth, [marth, deadCaeda]);
    expect(bonus.hit).toBe(0);
  });

  it('calculateCombatForecast tích hợp bonus support vào hitRate và critRate trong giao tranh thực tế', () => {
    const registry = new TerrainRegistry([
      { id: 'plains', name: 'Plains', nameVi: 'Đồng bằng', defenseBonus: 0, avoidBonus: 0, healPercent: 0, movementCosts: { foot: 1, cavalry: 1, armor: 1, flier: 1, mage: 1, bandit: 1 } },
    ]);

    const marth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 7,
      moveType: 'foot',
      isDead: false,
      supportPoints: { caeda: 13 },
    };
    const caeda: GridUnit = {
      id: 'caeda',
      name: 'Caeda',
      faction: 'player',
      position: { x: 6, y: 5 },
      mov: 8,
      moveType: 'flier',
      isDead: false,
    };
    const pirate: GridUnit = {
      id: 'pirate_1',
      name: 'Pirate',
      faction: 'enemy',
      position: { x: 5, y: 6 },
      mov: 5,
      moveType: 'bandit',
      isDead: false,
    };

    const marthStats: UnitCombatStats = {
      hp: 18, maxHp: 18, str: 5, mag: 0, skill: 3, spd: 7, lck: 7, def: 7, res: 0
    };
    const rapier: ItemDefinition = {
      id: 'rapier', name: 'Rapier', nameVi: 'Kiếm Rapier', type: 'sword', might: 7, hit: 95, weight: 5, minRange: 1, maxRange: 1, crit: 10, maxUses: 40, isMagic: false, effectiveAgainst: ['cavalry', 'armor']
    };

    const pirateStats: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 6, mag: 0, skill: 3, spd: 5, lck: 1, def: 4, res: 0
    };
    const ironAxe: ItemDefinition = {
      id: 'iron_axe', name: 'Iron Axe', nameVi: 'Rìu sắt', type: 'axe', might: 7, hit: 80, weight: 7, minRange: 1, maxRange: 1, crit: 0, maxUses: 45, isMagic: false, effectiveAgainst: []
    };

    // Dự báo không có Caeda (hoặc không truyền allUnits)
    const forecastWithoutSupport = calculateCombatForecast(
      marth, marthStats, rapier,
      pirate, pirateStats, ironAxe,
      1, registry, 'plains', 'plains'
    );

    // Dự báo CÓ Caeda đứng kế bên (khoảng cách 1 ô <= 3)
    const forecastWithSupport = calculateCombatForecast(
      marth, marthStats, rapier,
      pirate, pirateStats, ironAxe,
      1, registry, 'plains', 'plains',
      [marth, caeda, pirate]
    );

    // Marth nhận +10 Hit từ Caeda
    expect(forecastWithSupport.attacker.hitRate).toBe(
      Math.min(100, forecastWithoutSupport.attacker.hitRate + 10)
    );
    // Marth nhận +5 Crit từ Caeda
    expect(forecastWithSupport.attacker.critRate).toBe(
      forecastWithoutSupport.attacker.critRate + 5
    );
  });
});
