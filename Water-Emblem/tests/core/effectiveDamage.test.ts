import { describe, it, expect } from 'vitest';
import type { GridUnit, Position } from '../../src/core/grid/types';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import { calculateCombatForecast, isWeaponEffective } from '../../src/core/combat/calculator';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import itemsJson from '../../data/items.json';
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
