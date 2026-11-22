import { describe, expect, it } from 'vitest';
import { chapters, loadChapterData, type ChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  canOpenChest,
  canOpenDoor,
  openChest,
  openDoor,
  type ChapterState,
} from '../../src/core/chapter/events';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import type { MapData } from '../../src/core/grid/types';
import { buildNewGameSnapshot, isGameSnapshot } from '../../src/storage/saveLoad';
import itemsJson from '../../data/items.json';
import testChapterJson from '../../data/chapters/test_chapter_01.json';
import testMapJson from '../../data/maps/test_map_01.json';

const chapter03 = chapters.chapter_03!;
const testChapter = chapters.test_chapter_01!;

function stateOf(chapter: ChapterData): ChapterState {
  return {
    units: structuredClone(chapter.units),
    gold: 0,
    villageStates: {},
    chestStates: {},
    doorStates: {},
  };
}

function find(units: readonly ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

describe('chests and doors (PLAN item 92)', () => {
  it('loads chests and doors from chapter data and rejects a chest off a chest tile', () => {
    expect(chapter03.chests).toEqual([
      { id: 'chest_devil_mountain', position: { x: 22, y: 2 }, reward: { type: 'item', itemId: 'steel_sword' } },
    ]);
    expect(chapter03.doors).toEqual([{ id: 'door_castle', position: { x: 1, y: 7 } }]);
    expect(testChapter.chests?.[0]?.reward).toEqual({ type: 'gold', amount: 1000 });
    expect(testChapter.doors).toEqual([{ id: 'test_door', position: { x: 0, y: 3 } }]);

    const bad = JSON.parse(JSON.stringify(testChapterJson)) as Record<string, unknown>;
    (bad.chests as Record<string, unknown>[])[0]!.position = { x: 0, y: 0 };
    expect(() => loadChapterData(bad, testMapJson as MapData, itemsJson.items as never[]))
      .toThrow('must be on a chest tile');
  });

  it('a thief opens a chest innately and takes the reward', () => {
    const state = stateOf(chapter03);
    const julian = find(state.units, 'julian');
    julian.unit.position = { x: 22, y: 2 };
    const chest = chapter03.chests![0]!;

    expect(canOpenChest(julian, chapter03)).toBe(true);
    const result = openChest(state, 'julian', chest, chapter03, itemsJson.items);

    expect(result.state.chestStates).toEqual({ chest_devil_mountain: 'opened' });
    expect(find(result.state.units, 'julian').inventory.map((i) => i.itemId)).toContain('steel_sword');
    expect(result.events.map((e) => e.type)).toEqual(['item_gained', 'chest_opened']);
    // Opening again does nothing.
    expect(openChest(result.state, 'julian', chest, chapter03, itemsJson.items).events).toEqual([]);
  });

  it('the lord needs the Fire Emblem to open a chest; others cannot', () => {
    const state = stateOf(testChapter);
    const marth = find(state.units, 'marth');
    marth.unit.position = { x: 7, y: 4 };
    const chest = testChapter.chests![0]!;

    expect(canOpenChest(marth, testChapter)).toBe(false);
    expect(openChest(state, 'marth', chest, testChapter, itemsJson.items).events).toEqual([]);

    marth.inventory = [...marth.inventory, { itemId: 'fire_emblem', uses: 1 }];
    expect(canOpenChest(marth, testChapter)).toBe(true);
    const result = openChest(state, 'marth', chest, testChapter, itemsJson.items);
    expect(result.state.gold).toBe(1000);
    expect(result.state.chestStates).toEqual({ test_chest: 'opened' });

    const cain = find(state.units, 'cain');
    cain.unit.position = { x: 7, y: 4 };
    cain.inventory = [...cain.inventory, { itemId: 'fire_emblem', uses: 1 }];
    expect(canOpenChest(cain, testChapter)).toBe(false);
  });

  it('any unit with a Master Key opens a chest, spending one use (PLAN item 155)', () => {
    const state = stateOf(testChapter);
    const cain = find(state.units, 'cain');
    cain.unit.position = { x: 7, y: 4 };
    cain.inventory = [...cain.inventory, { itemId: 'master_key', uses: 5 }];
    const chest = testChapter.chests![0]!;

    expect(canOpenChest(cain, testChapter)).toBe(true);
    const result = openChest(state, 'cain', chest, testChapter, itemsJson.items);
    expect(result.state.chestStates).toEqual({ test_chest: 'opened' });
    expect(result.state.gold).toBe(1000);
    const keyAfter = find(result.state.units, 'cain').inventory.find((i) => i.itemId === 'master_key');
    expect(keyAfter?.uses).toBe(4);
  });

  it('a thief opens a door without a key; a key holder spends the key', () => {
    const state = stateOf(chapter03);
    const julian = find(state.units, 'julian');
    julian.unit.position = { x: 1, y: 6 };
    const door = chapter03.doors![0]!;
    const julianItems = julian.inventory.map((i) => i.itemId);

    const byThief = openDoor(state, 'julian', door);
    expect(byThief.state.doorStates).toEqual({ door_castle: 'opened' });
    expect(find(byThief.state.units, 'julian').inventory.map((i) => i.itemId)).toEqual(julianItems);

    const marth = find(state.units, 'marth');
    marth.unit.position = { x: 2, y: 7 };
    expect(canOpenDoor(marth)).toBe(false);
    expect(openDoor(state, 'marth', door).events).toEqual([]);

    marth.inventory = [...marth.inventory, { itemId: 'master_key', uses: 1 }];
    expect(canOpenDoor(marth)).toBe(true);
    const byKey = openDoor(state, 'marth', door);
    expect(byKey.state.doorStates).toEqual({ door_castle: 'opened' });
    expect(find(byKey.state.units, 'marth').inventory.map((i) => i.itemId)).not.toContain('master_key');

    // Not adjacent: no opening.
    const far = stateOf(chapter03);
    const farJulian = find(far.units, 'julian');
    farJulian.unit.position = { x: 5, y: 5 };
    expect(openDoor(far, 'julian', door).events).toEqual([]);
  });

  it('a closed door blocks movement and an opened door lets units through', () => {
    const marth = find(testChapter.units, 'marth');
    const unit = { ...marth.unit, position: { x: 0, y: 2 }, mov: 2 };
    const map = testMapJson as MapData;

    const blocked = calculateMovementRange(unit, {
      map,
      terrains: defaultTerrainRegistry,
      units: [unit],
    });
    expect(blocked.has('0,4')).toBe(false);
    expect(blocked.has('0,3')).toBe(false);

    const opened = calculateMovementRange(unit, {
      map,
      terrains: defaultTerrainRegistry,
      units: [unit],
      openedDoors: new Set(['0,3']),
    });
    expect(opened.has('0,3')).toBe(true);
    expect(opened.has('0,4')).toBe(true);
  });

  it('saves carry chest and door states and validate them', () => {
    const snapshot = buildNewGameSnapshot('test_chapter_01', 12345);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.chestStates).toEqual({});
    expect(snapshot!.doorStates).toEqual({});
    expect(isGameSnapshot(snapshot)).toBe(true);

    const opened = { ...snapshot!, chestStates: { test_chest: 'opened' as const }, doorStates: { test_door: 'opened' as const } };
    expect(isGameSnapshot(opened)).toBe(true);

    const bogus = { ...snapshot!, chestStates: { no_such_chest: 'opened' as const } };
    expect(isGameSnapshot(bogus)).toBe(false);
  });
});

describe('chest key and door key each spend exactly one use per lock (PLAN item 191)', () => {
  const chest = testChapter.chests![0]!;
  const door = testChapter.doors![0]!;

  function keyOf(units: readonly ExtendedUnitState[], unitId: string, itemId: string) {
    return find(units, unitId).inventory.filter((i) => i.itemId === itemId);
  }

  it('a Chest Key is consumed when a non-thief opens a chest, and runs out', () => {
    const state = stateOf(testChapter);
    const cain = find(state.units, 'cain');
    cain.unit.position = { x: 7, y: 4 };
    cain.inventory = [...cain.inventory, { itemId: 'chest_key', uses: 2 }];

    expect(canOpenChest(cain, testChapter)).toBe(true);
    const first = openChest(state, 'cain', chest, testChapter, itemsJson.items);
    expect(first.state.chestStates).toEqual({ test_chest: 'opened' });
    expect(keyOf(first.state.units, 'cain', 'chest_key')[0]?.uses).toBe(1);

    // Spending the last use removes the key, and without a key the unit can no longer open chests.
    const spent = stateOf(testChapter);
    const cain2 = find(spent.units, 'cain');
    cain2.unit.position = { x: 7, y: 4 };
    cain2.inventory = [...cain2.inventory, { itemId: 'chest_key', uses: 1 }];
    const last = openChest(spent, 'cain', chest, testChapter, itemsJson.items);
    expect(keyOf(last.state.units, 'cain', 'chest_key')).toEqual([]);
    expect(canOpenChest(find(last.state.units, 'cain'), testChapter)).toBe(false);
  });

  it('a Door Key is consumed when a non-thief opens a door', () => {
    const state = stateOf(testChapter);
    const marth = find(state.units, 'marth');
    marth.unit.position = { x: 0, y: 2 };
    marth.inventory = [...marth.inventory, { itemId: 'door_key', uses: 2 }];

    expect(canOpenDoor(marth)).toBe(true);
    const result = openDoor(state, 'marth', door);
    expect(result.state.doorStates).toEqual({ test_door: 'opened' });
    expect(keyOf(result.state.units, 'marth', 'door_key')[0]?.uses).toBe(1);
  });

  it('opening one lock spends one use of one key, never several at once', () => {
    const two = stateOf(testChapter);
    const cain = find(two.units, 'cain');
    cain.unit.position = { x: 7, y: 4 };
    cain.inventory = [...cain.inventory, { itemId: 'chest_key', uses: 2 }, { itemId: 'chest_key', uses: 2 }];
    const opened = openChest(two, 'cain', chest, testChapter, itemsJson.items);
    expect(keyOf(opened.state.units, 'cain', 'chest_key').map((i) => i.uses)).toEqual([1, 2]);

    const pair = stateOf(testChapter);
    const marth = find(pair.units, 'marth');
    marth.unit.position = { x: 0, y: 2 };
    marth.inventory = [...marth.inventory, { itemId: 'door_key', uses: 2 }, { itemId: 'master_key', uses: 5 }];
    const byDoorKey = openDoor(pair, 'marth', door);
    expect(keyOf(byDoorKey.state.units, 'marth', 'door_key')[0]?.uses).toBe(1);
    expect(keyOf(byDoorKey.state.units, 'marth', 'master_key')[0]?.uses).toBe(5);

    const masters = stateOf(testChapter);
    const marth2 = find(masters.units, 'marth');
    marth2.unit.position = { x: 0, y: 2 };
    marth2.inventory = [...marth2.inventory, { itemId: 'master_key', uses: 5 }, { itemId: 'master_key', uses: 5 }];
    const byMaster = openDoor(masters, 'marth', door);
    expect(keyOf(byMaster.state.units, 'marth', 'master_key').map((i) => i.uses)).toEqual([4, 5]);
  });

  it('a Master Key is the fallback only when no matching key is carried', () => {
    const state = stateOf(testChapter);
    const cain = find(state.units, 'cain');
    cain.unit.position = { x: 7, y: 4 };
    cain.inventory = [...cain.inventory, { itemId: 'master_key', uses: 5 }];
    const result = openChest(state, 'cain', chest, testChapter, itemsJson.items);
    expect(keyOf(result.state.units, 'cain', 'master_key')[0]?.uses).toBe(4);
  });

  it('thieves and the lord with the Fire Emblem still open locks for free', () => {
    const state = stateOf(chapter03);
    const julian = find(state.units, 'julian');
    julian.unit.position = { x: 22, y: 2 };
    julian.inventory = [...julian.inventory, { itemId: 'chest_key', uses: 1 }];
    const chest03 = chapter03.chests![0]!;
    const byThief = openChest(state, 'julian', chest03, chapter03, itemsJson.items);
    expect(keyOf(byThief.state.units, 'julian', 'chest_key')[0]?.uses).toBe(1);

    const lordState = stateOf(testChapter);
    const marth = find(lordState.units, 'marth');
    marth.unit.position = { x: 7, y: 4 };
    marth.inventory = [...marth.inventory, { itemId: 'fire_emblem', uses: 1 }];
    const byLord = openChest(lordState, 'marth', chest, testChapter, itemsJson.items);
    expect(keyOf(byLord.state.units, 'marth', 'fire_emblem')[0]?.uses).toBe(1);
  });

  it('spending a key does not mutate the state passed in', () => {
    const state = stateOf(testChapter);
    const cain = find(state.units, 'cain');
    cain.unit.position = { x: 7, y: 4 };
    cain.inventory = [...cain.inventory, { itemId: 'chest_key', uses: 2 }];
    const before = JSON.stringify(state);

    const result = openChest(state, 'cain', chest, testChapter, itemsJson.items);

    expect(JSON.stringify(state)).toBe(before);
    expect(result.state.units).not.toBe(state.units);
  });
});
