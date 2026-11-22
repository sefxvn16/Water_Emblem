import { describe, it, expect } from 'vitest';
import type { GridUnit, Position } from '../../src/core/grid/types';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import { calculateCombatForecast, isWeaponEffective } from '../../src/core/combat/calculator';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import itemsJson from '../../data/items.json';
import classesJson from '../../data/classes.json';
import { canLowerDrawbridge, lowerDrawbridge, findDesertTreasure, type ChapterState } from '../../src/core/chapter/events';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

const getItem = (id: string): ItemDefinition => {
  const item = itemsJson.items.find((i) => i.id === id);
  if (!item) throw new Error(`Item ${id} not found in items.json`);
  return item as unknown as ItemDefinition;
};

const defaultTerrainRegistry = new TerrainRegistry();

describe('effective against cavalry bugfix and iote shield protection', () => {
  const rapier = getItem('rapier');
  const ridersbane = getItem('ridersbane');
  const ironBow = getItem('iron_bow');

  it('correctly detects cavalry vulnerability for cavalier, outrider, and mangudai (FE3 Horseman bugfix)', () => {
    const cavalier: GridUnit = {
      id: 'cavalier_1',
      name: 'Cavalier',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 7,
      moveType: 'cavalry',
      classId: 'cavalier',
    };

    const outrider: GridUnit = {
      id: 'outrider_1',
      name: 'Outrider',
      faction: 'enemy',
      position: { x: 1, y: 0 },
      mov: 8,
      moveType: 'cavalry',
      classId: 'outrider',
    };

    const mangudai: GridUnit = {
      id: 'mangudai_1',
      name: 'Mangudai',
      faction: 'enemy',
      position: { x: 2, y: 0 },
      mov: 8,
      moveType: 'cavalry',
      classId: 'mangudai',
    };

    const footKnight: GridUnit = {
      id: 'paladin_dismounted',
      name: 'Paladin (Foot)',
      faction: 'player',
      position: { x: 3, y: 0 },
      mov: 6,
      moveType: 'foot',
      classId: 'paladin',
    };

    expect(isWeaponEffective(ridersbane, cavalier)).toBe(true);
    expect(isWeaponEffective(ridersbane, outrider)).toBe(true);
    expect(isWeaponEffective(ridersbane, mangudai)).toBe(true);
    expect(isWeaponEffective(rapier, mangudai)).toBe(true);
    expect(isWeaponEffective(ridersbane, footKnight)).toBe(false);
  });

  it('Iote shield completely negates effective damage for cavalry and fliers', () => {
    const pegasus: GridUnit = {
      id: 'caeda',
      name: 'Caeda',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 7,
      moveType: 'flier',
      classId: 'pegasus_knight',
    };

    // Without Iote's Shield, Bow is effective against pegasus
    expect(isWeaponEffective(ironBow, pegasus, false)).toBe(true);

    // With Iote's Shield, Bow is NOT effective
    expect(isWeaponEffective(ironBow, pegasus, true)).toBe(false);
  });

  it('calculateCombatForecast applies 3x might without Iote shield, and 1x might with Iote shield', () => {
    const archer: GridUnit = {
      id: 'gordin',
      name: 'Gordin',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 5,
      moveType: 'foot',
      classId: 'archer',
    };
    const archerStats: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 10, mag: 0, skill: 10, spd: 10, lck: 5, def: 5, res: 0,
    };

    const pegasus: GridUnit = {
      id: 'enemy_pegasus',
      name: 'Enemy Pegasus',
      faction: 'enemy',
      position: { x: 2, y: 0 },
      mov: 7,
      moveType: 'flier',
      classId: 'pegasus_knight',
    };
    const pegasusStats: UnitCombatStats = {
      hp: 20, maxHp: 20, str: 6, mag: 0, skill: 6, spd: 12, lck: 3, def: 5, res: 6,
    };

    // Bow might = 5. Effective might = 5 * 3 = 15. Atk = str(10) + 15 = 25. Def = 5. Damage = 20.
    const forecastWithoutShield = calculateCombatForecast(
      archer, archerStats, ironBow,
      pegasus, pegasusStats, undefined,
      2, defaultTerrainRegistry, 'plains', 'plains',
      [archer, pegasus],
      undefined, undefined,
      { defenderHasIoteShield: false }
    );
    expect(forecastWithoutShield.attacker.damage).toBe(20);

    // With Iote's Shield: Bow might = 5. Atk = str(10) + 5 = 15. Def = 5. Damage = 10.
    const forecastWithShield = calculateCombatForecast(
      archer, archerStats, ironBow,
      pegasus, pegasusStats, undefined,
      2, defaultTerrainRegistry, 'plains', 'plains',
      [archer, pegasus],
      undefined, undefined,
      { defenderHasIoteShield: true }
    );
    expect(forecastWithShield.attacker.damage).toBe(10);
  });

  it('drawbridge and desert treasure mechanisms work correctly', () => {
    const thief: ExtendedUnitState = {
      unit: { id: 'julian', name: 'Julian', faction: 'player', position: { x: 1, y: 1 }, mov: 6, moveType: 'foot', classId: 'thief' },
      stats: { hp: 17, maxHp: 17, str: 4, mag: 0, skill: 6, spd: 12, lck: 7, def: 4, res: 0 },
      level: 3,
      exp: 0,
      inventory: [],
    };

    const state: ChapterState = {
      units: [thief],
      gold: 1000,
      villageStates: {},
      drawbridgeStates: { bridge_1: 'raised' },
      collectedTreasures: {},
    };

    expect(canLowerDrawbridge(thief)).toBe(true);

    const bridgePos: Position = { x: 1, y: 2 };
    const lowered = lowerDrawbridge(state, 'julian', { id: 'bridge_1', position: bridgePos });
    expect(lowered.state.drawbridgeStates?.['bridge_1']).toBe('lowered');
    expect(lowered.events).toHaveLength(1);
    expect(lowered.events[0]?.type).toBe('drawbridge_lowered');

    // Desert hidden treasure
    const desertTreasures = [{ id: 'sand_warp', position: { x: 1, y: 1 }, itemId: 'warp_staff' }];
    const dummyRng = { roll1RN: () => true };
    const itemsList = [{ id: 'warp_staff', name: 'Warp Staff', type: 'staff', maxUses: 7 }];

    const treasureFound = findDesertTreasure(lowered.state, 'julian', desertTreasures, itemsList, dummyRng);
    expect(treasureFound.state.collectedTreasures?.['sand_warp']).toBe(true);
    expect(treasureFound.events[0]?.type).toBe('item_gained');
  });
});

describe('iote shield only cancels anti-flier effectiveness and dragon knight is not a dragon (PLAN item 198)', () => {
  const hammer = getItem('hammer');
  const wyrmslayer = getItem('wyrmslayer');
  const falchion = getItem('falchion');
  const ridersbane = getItem('ridersbane');
  const ironBow = getItem('iron_bow');

  const unitOf = (id: string, classId: string, moveType: GridUnit['moveType']): GridUnit => ({
    id, name: id, faction: 'enemy', position: { x: 0, y: 0 }, mov: 5, moveType, classId,
  });

  const knight = unitOf('knight_1', 'knight', 'armor');
  const cataphract = unitOf('cataphract_1', 'cataphract', 'cavalry');
  const cavalier = unitOf('cavalier_2', 'cavalier', 'cavalry');
  const manakete = unitOf('tiki', 'manakete', 'foot');
  const dragonKnight = unitOf('minerva', 'dragon_knight', 'flier');
  const pegasus = unitOf('caeda_2', 'pegasus_knight', 'flier');

  it('keeps anti-armour, anti-cavalry and anti-dragon effectiveness through the shield', () => {
    expect(isWeaponEffective(hammer, knight, true)).toBe(true);
    expect(isWeaponEffective(hammer, cataphract, true)).toBe(true);
    expect(isWeaponEffective(ridersbane, cavalier, true)).toBe(true);
    expect(isWeaponEffective(wyrmslayer, manakete, true)).toBe(true);
    expect(isWeaponEffective(falchion, manakete, true)).toBe(true);
  });

  it('cancels only anti-flier effectiveness', () => {
    expect(isWeaponEffective(ironBow, pegasus, false)).toBe(true);
    expect(isWeaponEffective(ironBow, pegasus, true)).toBe(false);
    expect(isWeaponEffective(ironBow, dragonKnight, false)).toBe(true);
    expect(isWeaponEffective(ironBow, dragonKnight, true)).toBe(false);
  });

  it('treats dragon_knight as flier and cavalry, never as a dragon', () => {
    expect(isWeaponEffective(wyrmslayer, dragonKnight)).toBe(false);
    expect(isWeaponEffective(falchion, dragonKnight)).toBe(false);
    expect(isWeaponEffective(ridersbane, dragonKnight)).toBe(true);
    expect(isWeaponEffective(ironBow, dragonKnight)).toBe(true);
  });

  it('a non-manakete class is never a dragon target', () => {
    expect(isWeaponEffective(wyrmslayer, cavalier)).toBe(false);
    expect(isWeaponEffective(wyrmslayer, knight)).toBe(false);
  });

  it('forecast applies the 3x multiplier to an armoured unit holding Iotes Shield', () => {
    const fighter: GridUnit = {
      id: 'barst', name: 'Barst', faction: 'player', position: { x: 0, y: 0 },
      mov: 5, moveType: 'foot', classId: 'fighter',
      weaponRanks: { axe: 'C' },
    };
    const fighterStats: UnitCombatStats = { hp: 30, maxHp: 30, str: 10, mag: 0, skill: 8, spd: 8, lck: 4, def: 6, res: 0 };
    const knightStats: UnitCombatStats = { hp: 24, maxHp: 24, str: 8, mag: 0, skill: 5, spd: 4, lck: 2, def: 11, res: 2 };
    const target = { ...knight, position: { x: 1, y: 0 }, faction: 'enemy' as const };

    // Hammer might 9 -> effective 27. Atk = 10 + 27 = 37. Def 11 -> damage 26, shield or not.
    const withShield = calculateCombatForecast(
      fighter, fighterStats, hammer,
      target, knightStats, undefined,
      1, defaultTerrainRegistry, 'plains', 'plains',
      [fighter, target],
      undefined, undefined,
      { defenderHasIoteShield: true },
    );
    const withoutShield = calculateCombatForecast(
      fighter, fighterStats, hammer,
      target, knightStats, undefined,
      1, defaultTerrainRegistry, 'plains', 'plains',
      [fighter, target],
      undefined, undefined,
      { defenderHasIoteShield: false },
    );
    expect(withShield.attacker.damage).toBe(withoutShield.attacker.damage);
    expect(withShield.attacker.damage).toBe(26);
  });

  it('class effective tags stay inside the known tag set', () => {
    const allowed = new Set(['armor', 'dragon', 'flier', 'cavalry']);
    const classes = (classesJson as { classes: { id: string; effectiveTags?: string[] }[] }).classes;
    const tagged = classes.filter((c) => c.effectiveTags);
    expect(tagged.length).toBeGreaterThan(0);
    for (const c of tagged) {
      for (const tag of c.effectiveTags!) {
        expect(allowed.has(tag), `${c.id} has unknown tag ${tag}`).toBe(true);
      }
    }
    expect(classes.find((c) => c.id === 'dragon_knight')?.effectiveTags).not.toContain('dragon');
    expect(classes.find((c) => c.id === 'manakete')?.effectiveTags).toContain('dragon');
  });
});
