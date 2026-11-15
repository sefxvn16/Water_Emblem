import { describe, it, expect } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { GridUnit } from '../../src/core/grid/types';
import {
  calculateAttackSpeed,
  calculateCombatForecast,
  calculateDisplayedCombatStats,
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
    expect(swordVsAxe.damage).toBe(0);
    expect(swordVsAxe.hit).toBe(5);
    expect(getWeaponTriangleModifier('sword', 'axe', 'C').hit).toBe(10);
    expect(getWeaponTriangleModifier('sword', 'axe', 'A').damage).toBe(1);

    // Rìu vs Thương: Rìu có lợi thế
    const axeVsLance = getWeaponTriangleModifier('axe', 'lance');
    expect(axeVsLance.damage).toBe(0);
    expect(axeVsLance.hit).toBe(5);

    // Thương vs Kiếm: Thương có lợi thế
    const lanceVsSword = getWeaponTriangleModifier('lance', 'sword');
    expect(lanceVsSword.damage).toBe(0);
    expect(lanceVsSword.hit).toBe(5);

    // Kiếm vs Thương: Kiếm bị bất lợi
    const swordVsLance = getWeaponTriangleModifier('sword', 'lance');
    expect(swordVsLance.damage).toBe(0);
    expect(swordVsLance.hit).toBe(-5);
    expect(getWeaponTriangleModifier('sword', 'lance', 'E', 'A')).toEqual({ damage: -1, hit: -10 });
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
      hp: 20, maxHp: 20, str: 6, mag: 0, skill: 8, spd: 10, lck: 7, def: 5, res: 0,
    };
    const statsSlow: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 8, mag: 0, skill: 4, spd: 4, lck: 2, def: 6, res: 0,
    };

    const asFast = calculateAttackSpeed(statsFast, ironSword); // FE11 Iron Sword Wt 4
    const asSlow = calculateAttackSpeed(statsSlow, ironAxe);   // FE11 Iron Axe Wt 6
    expect(asFast).toBe(10);
    expect(asSlow).toBe(4);

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

    // Chênh lệch AS = 10 - 4 = 6 >= 4 -> Fast đánh 2 lần
    expect(forecast.attacker.attackCount).toBe(2);
    expect(forecast.defender.attackCount).toBe(1);
  });

  it('dự báo dùng Hit/Avoid, rank và effective might của Shadow Dragon', () => {
    const attacker: GridUnit = {
      id: 'attacker', name: 'Attacker', faction: 'player', position: { x: 0, y: 0 },
      mov: 5, moveType: 'foot', weaponRanks: { sword: 'C' },
    };
    const defender: GridUnit = {
      id: 'defender', name: 'Defender', faction: 'enemy', position: { x: 1, y: 0 },
      mov: 5, moveType: 'bandit', weaponRanks: { axe: 'E' },
    };
    const attackStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 10, mag: 0, skill: 8, spd: 10, lck: 4, def: 4, res: 0 };
    const defenseStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 8, mag: 0, skill: 3, spd: 5, lck: 2, def: 6, res: 0 };
    const sword = { ...ironSword, hit: 50 };
    const forecast = calculateCombatForecast(attacker, attackStats, sword, defender, defenseStats, ironAxe, 1, terrains, 'plains', 'plains');
    expect(forecast.attacker.damage).toBe(10); // Str 10 + Mt 5 + rank C 1 - Def 6
    expect(forecast.attacker.hitRate).toBe(64); // Hit 50 + Skill 8 + Luck/2 2 + triangle 10 - (AS 5 + Luck/2 1)
    expect(forecast.defender.attackSpeed).toBe(5);

    const cavalry = { ...defender, moveType: 'cavalry' as const };
    const rapierForecast = calculateCombatForecast(attacker, attackStats, rapier, cavalry, defenseStats, ironAxe, 1, terrains, 'plains', 'plains');
    expect(rapierForecast.attacker.damage).toBe(20); // Str 10 + FE11 Rapier Mt 5 × 3 + rank C 1 - Def 6
  });

  it('staff and consumables cannot resolve as attacks', () => {
    const healer: GridUnit = { id: 'healer', name: 'Healer', faction: 'player', position: { x: 0, y: 0 }, mov: 5, moveType: 'foot' };
    const enemy: GridUnit = { id: 'enemy', name: 'Enemy', faction: 'enemy', position: { x: 1, y: 0 }, mov: 5, moveType: 'foot' };
    const healerStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 0, mag: 4, skill: 5, spd: 5, lck: 0, def: 0, res: 0 };
    const enemyStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 5, mag: 0, skill: 5, spd: 5, lck: 0, def: 0, res: 0 };
    const forecast = calculateCombatForecast(healer, healerStats, getItem('heal_staff'), enemy, enemyStats, ironAxe, 1, terrains, 'plains', 'plains');
    expect(forecast.attacker.attackCount).toBe(0);
    const result = executeCombat(forecast, new SeededRNG(1));
    expect(result.events).toEqual([]);
    expect(enemyStats.hp).toBe(20);
  });

  it('uses FE11 class Hit/Crit bonuses in both forecast and displayed stats', () => {
    const attacker: GridUnit = { id: 'archer', name: 'Archer', faction: 'player', position: { x: 0, y: 0 }, mov: 7, moveType: 'foot', weaponRanks: { bow: 'E' } };
    const defender: GridUnit = { id: 'target', name: 'Target', faction: 'enemy', position: { x: 2, y: 0 }, mov: 5, moveType: 'foot' };
    const stats: UnitCombatStats = { hp: 20, maxHp: 20, str: 5, mag: 0, skill: 8, spd: 7, lck: 2, def: 5, res: 0 };
    const targetStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 5, mag: 0, skill: 3, spd: 5, lck: 0, def: 5, res: 0 };
    const baseline = calculateCombatForecast(attacker, stats, ironBow, defender, targetStats, undefined, 2, terrains, 'plains', 'plains');
    const sniper = { ...attacker, classId: 'sniper' };
    const sniperForecast = calculateCombatForecast(sniper, stats, ironBow, defender, targetStats, undefined, 2, terrains, 'plains', 'plains');
    expect(sniperForecast.attacker.hitRate - baseline.attacker.hitRate).toBe(5);
    expect(sniperForecast.attacker.critRate - baseline.attacker.critRate).toBe(5);
    const baseDisplay = calculateDisplayedCombatStats(attacker, stats, ironBow, 'plains', terrains, [attacker, defender]);
    const sniperDisplay = calculateDisplayedCombatStats(sniper, stats, ironBow, 'plains', terrains, [sniper, defender]);
    expect(sniperDisplay.hit - baseDisplay.hit).toBe(5);
    expect(sniperDisplay.crit - baseDisplay.crit).toBe(5);

    const sword: GridUnit = { ...attacker, classId: 'blade_dancer', weaponRanks: { sword: 'E' } };
    const swordTarget = { ...defender, position: { x: 1, y: 0 } };
    const testSword = { ...ironSword, hit: 50 };
    const swordBaseline = calculateCombatForecast(attacker, stats, testSword, swordTarget, targetStats, undefined, 1, terrains, 'plains', 'plains');
    const swordForecast = calculateCombatForecast(sword, stats, testSword, swordTarget, targetStats, undefined, 1, terrains, 'plains', 'plains');
    expect(swordForecast.attacker.hitRate - swordBaseline.attacker.hitRate).toBe(10);

    const axe: GridUnit = { ...attacker, classId: 'berserker', weaponRanks: { axe: 'E' } };
    const axeBaseline = calculateCombatForecast(attacker, stats, ironAxe, swordTarget, targetStats, undefined, 1, terrains, 'plains', 'plains');
    const axeForecast = calculateCombatForecast(axe, stats, ironAxe, swordTarget, targetStats, undefined, 1, terrains, 'plains', 'plains');
    expect(axeForecast.attacker.critRate - axeBaseline.attacker.critRate).toBe(10);
  });

  it('bonus địa hình FE11 chỉ áp dụng cho bộ binh và phòng thủ vật lý', () => {
    const attacker: GridUnit = { id: 'attacker', name: 'Attacker', faction: 'player', position: { x: 0, y: 0 }, mov: 5, moveType: 'foot' };
    const defender: GridUnit = { id: 'defender', name: 'Defender', faction: 'enemy', position: { x: 1, y: 0 }, mov: 5, moveType: 'foot' };
    const attackerStats: UnitCombatStats = { hp: 20, maxHp: 20, str: 8, mag: 8, skill: 5, spd: 6, lck: 0, def: 4, res: 2 };
    const defenderStats: UnitCombatStats = { ...attackerStats, def: 5 };
    const sword = { ...ironSword, hit: 50 };
    const plain = calculateCombatForecast(attacker, attackerStats, sword, defender, defenderStats, undefined, 1, terrains, 'plains', 'plains');
    const gate = calculateCombatForecast(attacker, attackerStats, sword, defender, defenderStats, undefined, 1, terrains, 'plains', 'gate');
    expect(gate.attacker.damage).toBe(plain.attacker.damage - 2);
    expect(gate.attacker.hitRate).toBe(plain.attacker.hitRate - 20);

    const magic = { ...sword, type: 'tome' as const, isMagic: true };
    const plainMagic = calculateCombatForecast(attacker, attackerStats, magic, defender, defenderStats, undefined, 1, terrains, 'plains', 'plains');
    const gateMagic = calculateCombatForecast(attacker, attackerStats, magic, defender, defenderStats, undefined, 1, terrains, 'plains', 'gate');
    expect(gateMagic.attacker.damage).toBe(plainMagic.attacker.damage);
    expect(gateMagic.attacker.hitRate).toBe(plainMagic.attacker.hitRate - 20);

    const flier = { ...defender, moveType: 'flier' as const };
    const flyingGate = calculateCombatForecast(attacker, attackerStats, sword, flier, defenderStats, undefined, 1, terrains, 'plains', 'gate');
    expect(flyingGate.attacker.damage).toBe(plain.attacker.damage);
    expect(flyingGate.attacker.hitRate).toBe(plain.attacker.hitRate);
  });

  it('kết quả thực thi trận đấu có thể tái lập với PRNG Seed', () => {
    const statsMarth: UnitCombatStats = {
      hp: 18, maxHp: 18, str: 6, mag: 0, skill: 6, spd: 8, lck: 7, def: 5, res: 0,
    };
    const statsPirate: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 7, mag: 0, skill: 3, spd: 3, lck: 1, def: 3, res: 0,
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
