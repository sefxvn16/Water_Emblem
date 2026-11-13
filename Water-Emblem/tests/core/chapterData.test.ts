import { describe, expect, it } from 'vitest';
import chapterJson from '../../data/chapters/test_chapter_01.json';
import mapJson from '../../data/maps/test_map_01.json';
import talysChapterJson from '../../data/chapters/chapter_01_talys.json';
import talysMapJson from '../../data/maps/chapter_01_talys.json';
import galderChapterJson from '../../data/chapters/chapter_02_galder.json';
import galderMapJson from '../../data/maps/chapter_02_galder.json';
import itemsJson from '../../data/items.json';
import charactersJson from '../../data/characters.json';
import classesJson from '../../data/classes.json';
import { initialChapterData, loadChapterData } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';

const load = (chapter: unknown) => loadChapterData(chapter, mapJson as MapData, itemsJson.items as ItemDefinition[]);
const copyChapter = () => JSON.parse(JSON.stringify(chapterJson)) as Record<string, unknown>;

function hasFootRoute(map: MapData, start: { x: number; y: number }, target: { x: number; y: number }): boolean {
  const queue = [start];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const terrain = map.grid[y]?.[x];
      if (terrain && defaultTerrainRegistry.getMovementCost(terrain, 'foot') !== null) {
        queue.push({ x, y });
      }
    }
  }
  return visited.has(`${target.x},${target.y}`);
}

describe('chapter data', () => {
  it('loads prototype Chapter 1 Talys 30x13 map and units successfully', () => {
    const talysChapter = loadChapterData(
      talysChapterJson,
      talysMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(talysChapter.id).toBe('chapter_01');
    expect(talysChapter.mapId).toBe('chapter_01_talys');
    expect(talysChapter.units.length).toBeGreaterThanOrEqual(12);
    const marth = talysChapter.units.find((u) => u.unit.id === 'marth');
    expect(marth?.unit.position).toEqual({ x: 25, y: 9 });
    const gazzak = talysChapter.units.find((u) => u.unit.id === 'gazzak');
    expect(gazzak?.unit.position).toEqual({ x: 3, y: 9 });
  });

  it('has traversable foot routes from Marth to both chapter gates', () => {
    expect(hasFootRoute(talysMapJson as MapData, { x: 25, y: 9 }, { x: 3, y: 9 })).toBe(true);
    expect(hasFootRoute(galderMapJson as MapData, { x: 23, y: 9 }, { x: 1, y: 1 })).toBe(true);
  });

  it('loads prototype Chapter 2 Galder 30x13 map, Ogma group and Gomer boss', () => {
    const galderChapter = loadChapterData(
      galderChapterJson,
      galderMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(galderChapter.id).toBe('chapter_02');
    expect(galderChapter.mapId).toBe('chapter_02_galder');
    expect(galderChapter.units.length).toBeGreaterThanOrEqual(15);
    const ogma = galderChapter.units.find((u) => u.unit.id === 'ogma');
    expect(ogma?.unit.position).toEqual({ x: 14, y: 2 });
    expect(ogma?.weapon.id).toBe('iron_sword');
    expect(ogma?.unit.moveType).toBe('foot');
    const gomer = galderChapter.units.find((u) => u.unit.id === 'gomer');
    expect(gomer?.unit.position).toEqual({ x: 1, y: 1 });
    expect(gomer?.weapon.id).toBe('hand_axe');
    expect(galderChapter.objective.seizeTargetTile).toEqual({ x: 1, y: 1 });
  });

  it('loads referenced units, weapons and objective', () => {
    expect(initialChapterData.units).toHaveLength(13);
    expect(initialChapterData.units[0]?.weapon.id).toBe('rapier');
    expect(initialChapterData.objective.seizeTargetTile).toEqual({ x: 3, y: 9 });
  });

  it('rejects an unknown weapon reference', () => {
    const chapter = copyChapter();
    const units = chapter.units as Record<string, unknown>[];
    units[0]!.weaponId = 'missing_item';
    expect(() => load(chapter)).toThrow('unknown weapon');
  });

  it('rejects duplicate unit IDs and out-of-map positions', () => {
    const duplicate = copyChapter();
    const duplicateUnits = duplicate.units as Record<string, unknown>[];
    duplicateUnits[1]!.id = 'marth';
    expect(() => load(duplicate)).toThrow('Duplicate unit ID');

    const outOfBounds = copyChapter();
    const units = outOfBounds.units as Record<string, unknown>[];
    units[0]!.position = { x: 99, y: 1 };
    expect(() => load(outOfBounds)).toThrow('outside map');
  });

  it('rejects malformed growth rates', () => {
    const characters = structuredClone(charactersJson);
    const growths = characters.characters[0]!.growths;
    growths.hp = 150;
    expect(() => loadChapterData(chapterJson, mapJson as MapData, itemsJson.items as ItemDefinition[], characters, classesJson))
      .toThrow('growths.hp exceeds 100');
  });

  it('resolves character and class data without duplicating chapter stats', () => {
    const chapter = copyChapter();
    const units = chapter.units as Record<string, unknown>[];
    expect(units[0]).not.toHaveProperty('stats');
    expect(units[0]).not.toHaveProperty('moveType');
    const marth = load(chapter).units.find((entry) => entry.unit.id === 'marth');
    expect(marth?.stats.maxHp).toBe(charactersJson.characters[0]?.baseStats.hp);
    expect(marth?.unit.moveType).toBe('foot');

    units[0]!.characterId = 'missing_character';
    expect(() => load(chapter)).toThrow('unknown character');
  });

  it('validates optional units and recruitable enemy IDs', () => {
    expect(initialChapterData.optionalUnits).toEqual([]);
    const duplicate = JSON.parse(JSON.stringify(talysChapterJson)) as Record<string, unknown>;
    duplicate.optionalUnits = [{ id: 'marth', characterId: 'marth', faction: 'player', position: { x: 0, y: 0 }, weaponId: 'rapier' }];
    expect(() => loadChapterData(duplicate, talysMapJson as MapData, itemsJson.items as ItemDefinition[]))
      .toThrow('Duplicate unit ID');

    const invalidRecruit = JSON.parse(JSON.stringify(galderChapterJson)) as Record<string, unknown>;
    invalidRecruit.recruitments = [{ speakerUnitId: 'marth', targetUnitId: 'marth', maxDistance: 1 }];
    expect(() => loadChapterData(invalidRecruit, galderMapJson as MapData, itemsJson.items as ItemDefinition[]))
      .toThrow('Recruitment must reference');
  });
});
