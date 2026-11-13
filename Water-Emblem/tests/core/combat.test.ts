import { describe, it, expect } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { GridUnit } from '../../src/core/grid/types';
import {
  calculateAttackSpeed,
  calculateCombatForecast,
  executeCombat,
  getWeaponTriangleModifier,
  isWeaponEffective,
} from '../../src/core/combat/calculator';
import { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import { SeededRNG } from '../../src/core/combat/rng';

describe('Hệ thống Chiến đấu & Tính toán Sát thương (Battle Engine)', () => {
  const terrains = new TerrainRegistry();
  const items = itemsData.items as readonly ItemDefinition[];
  const getItem = (id: string) => items.find((i) => i.id === id)!;

  const ironSword = getItem('iron_sword');
  const ironAxe = getItem('iron_axe');
  const rapier = getItem('rapier');
  const ironBow = getItem('iron_bow');

  it('tam giác vũ khí: Kiếm > Rìu > Thương > Kiếm', () => {
    // Kiếm vs Rìu: Kiếm có lợi thế
    const swordVsAxe = getWeaponTriangleModifier('sword', 'axe');
    expect(swordVsAxe.damage).toBe(1);
    expect(swordVsAxe.hit).toBe(15);

    // Rìu vs Thương: Rìu có lợi thế
    const axeVsLance = getWeaponTriangleModifier('axe', 'lance');
    expect(axeVsLance.damage).toBe(1);
    expect(axeVsLance.hit).toBe(15);

    // Thương vs Kiếm: Thương có lợi thế
    const lanceVsSword = getWeaponTriangleModifier('lance', 'sword');
    expect(lanceVsSword.damage).toBe(1);
    expect(lanceVsSword.hit).toBe(15);

    // Kiếm vs Thương: Kiếm bị bất lợi
    const swordVsLance = getWeaponTriangleModifier('sword', 'lance');
    expect(swordVsLance.damage).toBe(-1);
    expect(swordVsLance.hit).toBe(-15);
  });

  it('vũ khí khắc class: Rapier khắc Armor và Cavalry', () => {
    const armorUnit: GridUnit = {
      id: 'knight',
      name: 'Knight',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'armor',
    };
    const cavalryUnit: GridUnit = {
      id: 'cavalier',
      name: 'Cavalier',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 7,
      moveType: 'cavalry',
    };
    const footUnit: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'foot',
    };

    expect(isWeaponEffective(rapier, armorUnit)).toBe(true);
    expect(isWeaponEffective(rapier, cavalryUnit)).toBe(true);
    expect(isWeaponEffective(rapier, footUnit)).toBe(false);

    // Cung sắt khắc đơn vị bay
    const flierUnit: GridUnit = {
      id: 'pegasus',
      name: 'Pegasus',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 7,
      moveType: 'flier',
    };
    expect(isWeaponEffective(ironBow, flierUnit)).toBe(true);
    expect(isWeaponEffective(ironBow, footUnit)).toBe(false);

    // Búa (Hammer) khắc đơn vị thiết vệ (Armor)
    const hammer = getItem('hammer');
    expect(isWeaponEffective(hammer, armorUnit)).toBe(true);
    expect(isWeaponEffective(hammer, footUnit)).toBe(false);
  });

  it('tốc độ tấn công (AS) và điều kiện đánh hai lần (Double Attack)', () => {
    const statsFast: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 6, mag: 0, dex: 8, spd: 10, lck: 7, def: 5, res: 0,
    };
    const statsSlow: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 8, mag: 0, dex: 4, spd: 4, lck: 2, def: 6, res: 0,
    };

    const asFast = calculateAttackSpeed(statsFast, ironSword); // 10 - max(0, 5 - 6) = 10
    const asSlow = calculateAttackSpeed(statsSlow, ironAxe);   // 4 - max(0, 10 - 8) = 2
    expect(asFast).toBe(10);
    expect(asSlow).toBe(2);

    const unitFast: GridUnit = {
      id: 'fast', name: 'Fast', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot',
    };
    const unitSlow: GridUnit = {
      id: 'slow', name: 'Slow', faction: 'enemy', position: { x: 1, y: 0 }, mov: 4, moveType: 'foot',
    };

    const forecast = calculateCombatForecast(
      unitFast, statsFast, ironSword,
      unitSlow, statsSlow, ironAxe,
      1, terrains, 'plains', 'plains'
    );

    // Chênh lệch AS = 10 - 2 = 8 >= 4 -> Fast đánh 2 lần
    expect(forecast.attacker.attackCount).toBe(2);
    expect(forecast.defender.attackCount).toBe(1);
  });

  it('kết quả thực thi trận đấu có thể tái lập với PRNG Seed', () => {
    const statsMarth: UnitCombatStats = {
      hp: 18, maxHp: 18, str: 6, mag: 0, dex: 6, spd: 8, lck: 7, def: 5, res: 0,
    };
    const statsPirate: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 7, mag: 0, dex: 3, spd: 3, lck: 1, def: 3, res: 0,
    };
    const marth: GridUnit = {
      id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot',
    };
    const pirate: GridUnit = {
      id: 'pirate', name: 'Pirate', faction: 'enemy', position: { x: 1, y: 0 }, mov: 5, moveType: 'bandit',
    };

    const forecast = calculateCombatForecast(
      marth, statsMarth, ironSword,
      pirate, statsPirate, ironAxe,
      1, terrains, 'plains', 'plains'
    );

    // Chạy với seed 9999
    const rng1 = new SeededRNG(9999);
    const result1 = executeCombat({ ...forecast, attacker: { ...forecast.attacker, stats: { ...statsMarth } }, defender: { ...forecast.defender, stats: { ...statsPirate } } }, rng1);

    // Chạy lại với cùng seed 9999
    const rng2 = new SeededRNG(9999);
    const result2 = executeCombat({ ...forecast, attacker: { ...forecast.attacker, stats: { ...statsMarth } }, defender: { ...forecast.defender, stats: { ...statsPirate } } }, rng2);

    expect(result1.events.length).toBe(result2.events.length);
    expect(result1.events[0]?.damageDealt).toBe(result2.events[0]?.damageDealt);
    expect(result1.events[0]?.isHit).toBe(result2.events[0]?.isHit);
    expect(result1.unitDefeatedId).toBe(result2.unitDefeatedId);
  });
});
