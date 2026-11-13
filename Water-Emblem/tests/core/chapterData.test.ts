import { describe, expect, it } from 'vitest';
import chapterJson from '../../data/chapters/test_chapter_01.json';
import mapJson from '../../data/maps/test_map_01.json';
import talysChapterJson from '../../data/chapters/chapter_01_talys.json';
import talysMapJson from '../../data/maps/chapter_01_talys.json';
import itemsJson from '../../data/items.json';
import charactersJson from '../../data/characters.json';
import classesJson from '../../data/classes.json';
import { initialChapterData, loadChapterData } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';

const load = (chapter: unknown) => loadChapterData(chapter, mapJson as MapData, itemsJson.items as ItemDefinition[]);
const copyChapter = () => JSON.parse(JSON.stringify(chapterJson)) as Record<string, unknown>;

describe('chapter data', () => {
  it('loads canonical Chapter 1 Talys 30x13 map and units successfully', () => {
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

  it('loads referenced units, weapons and objective', () => {
    expect(initialChapterData.units).toHaveLength(13);
    expect(initialChapterData.units[0]?.weapon.id).toBe('rapier');
    expect(initialChapterData.objective.bossUnitId).toBe('gazzak');
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
});
