import { describe, expect, it } from 'vitest';
import chapterJson from '../../data/chapters/test_chapter_01.json';
import mapJson from '../../data/maps/test_map_01.json';
import itemsJson from '../../data/items.json';
import { initialChapterData, loadChapterData } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';

const load = (chapter: unknown) => loadChapterData(chapter, mapJson as MapData, itemsJson.items as ItemDefinition[]);
const copyChapter = () => JSON.parse(JSON.stringify(chapterJson)) as Record<string, unknown>;

describe('chapter data', () => {
  it('loads referenced units, weapons and objective', () => {
    expect(initialChapterData.units).toHaveLength(11);
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
});
