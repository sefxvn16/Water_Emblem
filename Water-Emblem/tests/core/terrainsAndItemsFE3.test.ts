import { describe, it, expect } from 'vitest';
import terrainJson from '../../data/terrains.json';
import itemsJson from '../../data/items.json';
import classesJson from '../../data/classes.json';
import { TerrainRegistry, healUnitsOnTerrain } from '../../src/core/grid/terrain';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import {
  canLowerDrawbridge, canOpenChest, canOpenDoor, openChest, openDoor, type ChapterState,
} from '../../src/core/chapter/events';
import type { GridUnit, MapData } from '../../src/core/grid/types';
import type { ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import type { ChapterData } from '../../src/core/data/chapterData';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

describe('terrains and items match FE3 Akaneia specifications', () => {
  it('terrains.json contains all required FE3 terrains including indoor and strategic tiles', () => {
    const terrainIds = terrainJson.terrains.map((t) => t.id);
    const requiredFe3Terrains = [
      'plains', 'road', 'bridge', 'rubble', 'forest', 'mountain', 'sand',
      'river', 'sea', 'peak', 'cliff', 'wall', 'gate', 'castle', 'fort',
      'village', 'house', 'shop', 'chest', 'door', 'arena', 'ballista',
      'throne', 'pillar', 'floor', 'corridor', 'tunnel', 'altar', 'drawbridge',
    ];

    for (const req of requiredFe3Terrains) {
      expect(terrainIds).toContain(req);
    }
    expect(terrainJson.terrains.length).toBeGreaterThanOrEqual(29);
  });

  it('TerrainRegistry correctly loads and resolves newly added FE3 terrains', () => {
    const registry = new TerrainRegistry();
    const throne = registry.get('throne');
    expect(throne).toBeDefined();
    expect(throne?.avoidBonus).toBe(20);
    expect(throne?.defenseBonus).toBe(2);
    expect(throne?.healPercent).toBe(20);
    expect(throne?.obstacleType).toBe('structure');

    const pillar = registry.get('pillar');
    expect(pillar).toBeDefined();
    expect(pillar?.avoidBonus).toBe(20);
    expect(pillar?.defenseBonus).toBe(1);

    const floor = registry.get('floor');
    expect(floor).toBeDefined();
    expect(floor?.avoidBonus).toBe(0);
    expect(registry.getMovementCost('floor', 'foot')).toBe(1);

    const drawbridge = registry.get('drawbridge');
    expect(drawbridge).toBeDefined();
    expect(registry.getMovementCost('drawbridge', 'foot')).toBeNull();
    expect(registry.getMovementCost('drawbridge', 'flier')).toBe(1);
  });

  it('items.json contains over 110 items with complete FE3 weaponry, staves, dragonstones and legendary items', () => {
    const items = itemsJson.items;
    const itemIds = new Set(items.map((i) => i.id));
    expect(items.length).toBeGreaterThanOrEqual(110);

    // Staves
    const staves = [
      'heal_staff', 'mend_staff', 'recover_staff', 'physic_staff', 'fortify_staff',
      'warp_staff', 'silence_staff', 'hammerne_staff', 'rescue_staff', 'aum_staff',
      'unlock_staff', 'thief_staff', 'watch_staff', 'again_staff', 'barrier_staff',
    ];
    for (const staffId of staves) {
      expect(itemIds.has(staffId), `Missing staff: ${staffId}`).toBe(true);
      const def = items.find((i) => i.id === staffId);
      expect(def?.type).toBe('staff');
    }

    // Dragonstones & Dragon Breaths
    const dragonItems = [
      'firestone', 'icestone', 'wyvernstone', 'earthstone', 'darkstone', 'divinestone', 'magestone',
      'dragon_breath', 'fire_breath', 'ice_breath', 'dark_breath', 'mist_breath',
    ];
    for (const dId of dragonItems) {
      expect(itemIds.has(dId), `Missing dragon item: ${dId}`).toBe(true);
    }

    // Legendary weapons & sacred treasures
    const legendaries = [
      'falchion', 'mercurius', 'gradivus', 'parthia',
      'firestone', 'divinestone', 'lightsphere', 'darksphere',
      'iotes_shield', 'binding_shield', 'life_orb', 'earth_orb',
    ];
    for (const legId of legendaries) {
      expect(itemIds.has(legId), `Missing legendary/treasure item: ${legId}`).toBe(true);
    }

    // Special items, cards & orbs
    const specials = [
      'iotes_shield', 'silver_card', 'member_card', 'binding_shield',
      'life_orb', 'earth_orb', 'lightsphere', 'darksphere', 'power_ring',
      'dracoshield', 'secret_book', 'speed_ring', 'goddess_icon', 'seraph_robe',
      'talisman', 'boots', 'manual', 'door_key', 'chest_key', 'bridge_key',
    ];
    for (const sId of specials) {
      expect(itemIds.has(sId), `Missing special item: ${sId}`).toBe(true);
    }
  });

  it('classes.json defines Manakete transformation and valid mount kinds', () => {
    const manakete = classesJson.classes.find((c: any) => c.id === 'manakete');
    expect(manakete).toBeDefined();
    expect(manakete?.canTransform).toBe(true);
    expect(manakete?.transformWeaponId).toBe('dragon_breath');

    const cavalier = classesJson.classes.find((c: any) => c.id === 'cavalier');
    expect(cavalier?.mountKind).toBe('ground');

    const mangudai = classesJson.classes.find((c: any) => c.id === 'mangudai');
    expect(mangudai?.mountKind).toBe('ground');

    const pegasus = classesJson.classes.find((c: any) => c.id === 'pegasus_knight');
    expect(pegasus?.mountKind).toBe('flying');
  });
});


/**
 * PLAN item 201, for item 185. The four tests above read the data files and
 * assert the content of those same files, so they pass whether or not the
 * game can act on any of it. These exercise the FE3 indoor terrains and the
 * widened item catalogue through the core functions that consume them:
 * pathfinding, throne healing, the combat forecast and the Manakete
 * transformation. Every expectation is a reachable tile, an HP value or a
 * damage number computed by core, never a field copied out of the JSON.
 */
describe('FE3 indoor terrains and items change what core actually computes (PLAN item 201)', () => {
  const registry = new TerrainRegistry();

  const getItem = (id: string): ItemDefinition => {
    const item = itemsJson.items.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found in items.json`);
    return item as unknown as ItemDefinition;
  };

  const statsOf = (over: Partial<UnitCombatStats>): UnitCombatStats => ({
    hp: 30, maxHp: 30, str: 10, mag: 0, skill: 10, spd: 10, lck: 5, def: 10, res: 5, ...over,
  });

  /** An indoor corridor of the tiles item 185 added, walkable end to end. */
  const indoorMap: MapData = {
    id: 'test_indoor',
    name: 'Indoor corridor',
    width: 6,
    height: 1,
    grid: [['floor', 'corridor', 'altar', 'floor', 'pillar', 'tunnel']],
  };

  /** A raised drawbridge with a floor tile stranded behind it. */
  const drawbridgeMap: MapData = {
    id: 'test_drawbridge',
    name: 'Raised drawbridge',
    width: 3,
    height: 1,
    grid: [['floor', 'drawbridge', 'floor']],
  };

  const walker = (id: string, moveType: GridUnit['moveType'], classId: string, mov: number): GridUnit => ({
    id, name: id, faction: 'player', position: { x: 0, y: 0 }, mov, moveType, classId,
  });

  const reachableXs = (unit: GridUnit, map: MapData): number[] => [...calculateMovementRange(unit, {
    map, terrains: registry, units: [unit],
  }).keys()].map((key) => Number(key.split(',')[0])).sort((a, b) => a - b);

  it('walks a foot unit over floor, corridor and altar at 1 each and charges 2 for the pillar and the tunnel', () => {
    // Entering floor/corridor/altar costs 1 each, the pillar 2: 1+1+1+2 = 5.
    expect(reachableXs(walker('foot_mov4', 'foot', 'mercenary', 4), indoorMap)).toEqual([0, 1, 2, 3]);
    expect(reachableXs(walker('foot_mov5', 'foot', 'mercenary', 5), indoorMap)).toEqual([0, 1, 2, 3, 4]);
    // The tunnel costs a further 2, so the far end needs 7 movement, not 6.
    expect(reachableXs(walker('foot_mov6', 'foot', 'mercenary', 6), indoorMap)).toEqual([0, 1, 2, 3, 4]);
    expect(reachableXs(walker('foot_mov7', 'foot', 'mercenary', 7), indoorMap)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('charges a mounted unit double indoors and shuts it out of the tunnel entirely, as it does a flier', () => {
    // Cavalry pays 2 per indoor tile: 6 movement buys three tiles, not six.
    expect(reachableXs(walker('horse_mov5', 'cavalry', 'cavalier', 5), indoorMap)).toEqual([0, 1, 2]);
    expect(reachableXs(walker('horse_mov6', 'cavalry', 'cavalier', 6), indoorMap)).toEqual([0, 1, 2, 3]);
    // The tunnel has no cavalry and no flier cost, so neither ever enters it,
    // however much movement it is given.
    expect(reachableXs(walker('horse_mov30', 'cavalry', 'cavalier', 30), indoorMap)).toEqual([0, 1, 2, 3, 4]);
    expect(reachableXs(walker('flier_mov30', 'flier', 'pegasus_knight', 30), indoorMap)).toEqual([0, 1, 2, 3, 4]);
  });

  it('lets only a flier over a raised drawbridge, whatever movement the ground units are given', () => {
    expect(reachableXs(walker('foot_mov30', 'foot', 'mercenary', 30), drawbridgeMap)).toEqual([0]);
    expect(reachableXs(walker('horse_mov30', 'cavalry', 'cavalier', 30), drawbridgeMap)).toEqual([0]);
    expect(reachableXs(walker('flier_mov30', 'flier', 'pegasus_knight', 30), drawbridgeMap)).toEqual([0, 1, 2]);
  });

  it('heals a wounded unit sitting on the throne by the throne percentage and leaves one on plain floor alone', () => {
    const map: MapData = {
      id: 'test_throne', name: 'Throne room', width: 2, height: 1,
      grid: [['throne', 'floor']],
    };
    const sitter: ExtendedUnitState = {
      unit: { id: 'on_throne', name: 'Throne sitter', faction: 'enemy', position: { x: 0, y: 0 }, mov: 5, moveType: 'foot', classId: 'general' },
      stats: statsOf({ hp: 20, maxHp: 40 }), inventory: [], level: 10, exp: 0,
    };
    const stander: ExtendedUnitState = {
      unit: { id: 'on_floor', name: 'Floor stander', faction: 'enemy', position: { x: 1, y: 0 }, mov: 5, moveType: 'foot', classId: 'general' },
      stats: statsOf({ hp: 20, maxHp: 40 }), inventory: [], level: 10, exp: 0,
    };

    const healed = healUnitsOnTerrain([sitter, stander], 'enemy', map, registry);
    // The throne's healPercent is 20, so 20% of maxHp 40 = 8 HP comes back.
    expect(healed[0]!.stats.hp).toBe(28);
    expect(healed[1]!.stats.hp).toBe(20);
    // Pure function: the inputs are untouched.
    expect(sitter.stats.hp).toBe(20);
  });

  it('turns the throne and pillar bonuses into a lower hit rate and less damage in a real forecast', () => {
    const attacker = walker('atk', 'foot', 'mercenary', 5);
    const defender: GridUnit = { id: 'def', name: 'Defender', faction: 'enemy', position: { x: 1, y: 0 }, mov: 4, moveType: 'foot', classId: 'general' };
    // Deliberately middling accuracy: on open floor the hit rate must stay
    // below 100 or the terrain's avoid would vanish into the cap.
    const atkStats = statsOf({ str: 14, skill: 5, spd: 11, lck: 2, def: 8, res: 3 });
    const defStats = statsOf({ str: 10, skill: 8, spd: 9, lck: 6, def: 9, res: 2 });

    const forecastOn = (defenderTerrain: string) => calculateCombatForecast(
      attacker, atkStats, getItem('iron_sword'), defender, defStats, getItem('iron_lance'),
      1, registry, 'floor', defenderTerrain,
    );

    const onFloor = forecastOn('floor');
    const onThrone = forecastOn('throne');
    const onPillar = forecastOn('pillar');

    expect(onFloor.attacker.hitRate).toBeLessThan(100);
    // throne and pillar both give avoid 20, straight off the attacker's hit.
    expect(onFloor.attacker.hitRate - onThrone.attacker.hitRate).toBe(20);
    expect(onFloor.attacker.hitRate - onPillar.attacker.hitRate).toBe(20);
    // throne gives defence +2 and pillar +1, straight off the damage.
    expect(onFloor.attacker.damage - onThrone.attacker.damage).toBe(2);
    expect(onFloor.attacker.damage - onPillar.attacker.damage).toBe(1);
  });

  it('lets the single-use keys from the widened catalogue open a door, a chest and a drawbridge, spending one use each', () => {
    const chapter: ChapterData = {
      id: 'test', name: 'Test', mapId: 'test_indoor', lordUnitId: 'lord',
      objective: { type: 'rout' }, units: [], optionalUnits: [], recruitments: [],
      carryoverUnitIds: [], deploymentSlots: [],
      chests: [{ id: 'chest_a', position: { x: 1, y: 0 }, reward: { type: 'gold', amount: 500 } }],
      doors: [{ id: 'door_a', position: { x: 2, y: 0 } }],
    };
    const carrier = (id: string, itemId: string, x: number): ExtendedUnitState => ({
      unit: { id, name: id, faction: 'player', position: { x, y: 0 }, mov: 5, moveType: 'foot', classId: 'mercenary' },
      stats: statsOf({}), inventory: [{ itemId, uses: 1 }], level: 5, exp: 0,
    });
    const emptyHanded = (id: string, x: number): ExtendedUnitState => ({
      unit: { id, name: id, faction: 'player', position: { x, y: 0 }, mov: 5, moveType: 'foot', classId: 'mercenary' },
      stats: statsOf({}), inventory: [{ itemId: 'vulnerary', uses: 3 }], level: 5, exp: 0,
    });

    const chestOpener = carrier('chest_opener', 'chest_key', 1);
    const doorOpener = carrier('door_opener', 'door_key', 1);
    const bridgeOpener = carrier('bridge_opener', 'bridge_key', 3);
    const noKey = emptyHanded('no_key', 4);

    // A mercenary opens no lock by itself: the key is what decides.
    expect(canOpenChest(noKey, chapter)).toBe(false);
    expect(canOpenDoor(noKey)).toBe(false);
    expect(canLowerDrawbridge(noKey)).toBe(false);
    expect(canOpenChest(chestOpener, chapter)).toBe(true);
    expect(canOpenDoor(doorOpener)).toBe(true);
    expect(canLowerDrawbridge(bridgeOpener)).toBe(true);
    // Each key fits only its own lock.
    expect(canOpenDoor(chestOpener)).toBe(false);
    expect(canOpenChest(doorOpener, chapter)).toBe(false);

    const state: ChapterState = {
      units: [chestOpener, doorOpener, bridgeOpener, noKey], gold: 0, villageStates: {},
    };
    const opened = openDoor(state, 'door_opener', chapter.doors![0]!);
    expect(opened.events.map(({ type }) => type)).toEqual(['door_opened']);
    expect(opened.state.doorStates?.['door_a']).toBe('opened');
    // The single-use Door Key is gone from the inventory afterwards, so the
    // same unit cannot open a second door.
    const spent = opened.state.units.find(({ unit }) => unit.id === 'door_opener');
    expect(spent!.inventory.some((entry) => entry.itemId === 'door_key')).toBe(false);
    expect(canOpenDoor(spent!)).toBe(false);
    // Pure function: the input unit keeps its key.
    expect(doorOpener.inventory[0]!.uses).toBe(1);

    // The Chest Key pays for the chest and the gold lands in the purse.
    const looted = openChest(state, 'chest_opener', chapter.chests![0]!, chapter, itemsJson.items);
    expect(looted.state.gold).toBe(500);
    expect(looted.state.chestStates?.['chest_a']).toBe('opened');
    const chestSpent = looted.state.units.find(({ unit }) => unit.id === 'chest_opener');
    expect(chestSpent!.inventory.some((entry) => entry.itemId === 'chest_key')).toBe(false);
  });
});
