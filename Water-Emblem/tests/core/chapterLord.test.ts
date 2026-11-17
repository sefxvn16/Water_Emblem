import { describe, it, expect } from 'vitest';
import itemsJson from '../../data/items.json';
import galderChapterJson from '../../data/chapters/chapter_02_galder.json';
import galderMapJson from '../../data/maps/chapter_02_galder.json';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';
import { loadChapterData } from '../../src/core/data/chapterData';

const load = (lordUnitId: unknown) => loadChapterData(
  { ...galderChapterJson, lordUnitId },
  galderMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

describe('chapter lordUnitId loading', () => {
  it('accepts a player unit as the lord', () => {
    expect(load('marth').lordUnitId).toBe('marth');
  });

  it('rejects a missing, unknown or enemy lord', () => {
    expect(() => load(undefined)).toThrow('lordUnitId');
    expect(() => load('nobody')).toThrow('lordUnitId');
    expect(() => load('castor')).toThrow('lordUnitId');
  });
});
