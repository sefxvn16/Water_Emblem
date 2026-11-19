import { describe, expect, it } from 'vitest';
import { chapters, loadChapterData } from '../../src/core/data/chapterData';
import { announcedReinforcements, dueReinforcements, spawnReinforcements } from '../../src/core/chapter/reinforcements';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import type { MapData } from '../../src/core/grid/types';
import { buildNewGameSnapshot, isGameSnapshot } from '../../src/storage/saveLoad';
import itemsJson from '../../data/items.json';
import testChapterJson from '../../data/chapters/test_chapter_01.json';
import testMapJson from '../../data/maps/test_map_01.json';

const testChapter = chapters.test_chapter_01!;
const map = testMapJson as MapData;

describe('reinforcements (PLAN item 94)', () => {
  it('loads reinforcement groups from chapter data and rejects duplicate unit ids', () => {
    expect(testChapter.reinforcements).toHaveLength(1);
    expect(testChapter.reinforcements![0]!.turn).toBe(2);
    expect(testChapter.reinforcements![0]!.units.map((u) => u.unit.id)).toEqual(['enemy_pirate_reinforcement']);

    const bad = JSON.parse(JSON.stringify(testChapterJson)) as Record<string, unknown>;
    const groups = bad.reinforcements as Record<string, unknown>[];
    (groups[0]!.units as Record<string, unknown>[])[0]!.id = 'marth';
    expect(() => loadChapterData(bad, map, itemsJson.items as never[])).toThrow('Duplicate unit ID marth');
  });

  it('is due only on its turn and only once; announced the same turn', () => {
    expect(dueReinforcements(testChapter, 1, [])).toEqual([]);
    expect(dueReinforcements(testChapter, 2, [])).toHaveLength(1);
    expect(dueReinforcements(testChapter, 2, ['test_reinforcements'])).toEqual([]);
    expect(announcedReinforcements(testChapter, 2, [])).toHaveLength(1);
    expect(announcedReinforcements(testChapter, 3, [])).toEqual([]);
  });

  it('spawns units flagged as reinforcements that have already acted', () => {
    const group = testChapter.reinforcements![0]!;
    const result = spawnReinforcements(structuredClone(testChapter.units), group, map, defaultTerrainRegistry);
    expect(result.spawned).toHaveLength(1);
    expect(result.skippedIds).toEqual([]);
    const spawned = result.spawned[0]!;
    expect(spawned.unit.position).toEqual({ x: 7, y: 1 });
    expect(spawned.unit.hasActed).toBe(true);
    expect(spawned.unit.isReinforcement).toBe(true);
    expect(result.units).toHaveLength(testChapter.units.length + 1);
  });

  it('shifts to the nearest free tile when the spawn tile is occupied', () => {
    const group = testChapter.reinforcements![0]!;
    const units = structuredClone(testChapter.units);
    units[0]!.unit.position = { x: 7, y: 1 };
    const result = spawnReinforcements(units, group, map, defaultTerrainRegistry);
    expect(result.spawned).toHaveLength(1);
    expect(result.spawned[0]!.unit.position).not.toEqual({ x: 7, y: 1 });
  });

  it('saves carry spawned groups and accept spawned units', () => {
    const snapshot = buildNewGameSnapshot('test_chapter_01', 12345)!;
    expect(snapshot.spawnedReinforcements).toEqual([]);
    const group = testChapter.reinforcements![0]!;
    const spawned = spawnReinforcements(snapshot.extendedUnits, group, map, defaultTerrainRegistry);
    const withSpawn = {
      ...snapshot,
      extendedUnits: spawned.units,
      spawnedReinforcements: ['test_reinforcements'],
    };
    expect(isGameSnapshot(withSpawn)).toBe(true);
    const bogus = { ...snapshot, spawnedReinforcements: ['no_such_group'] };
    expect(isGameSnapshot(bogus)).toBe(false);
  });
});
