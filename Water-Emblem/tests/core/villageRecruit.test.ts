// PLAN mục 206: thăm làng nhận nhân vật vào đội. Nguồn: kịch bản FE3 trong kho build files
// (`project/text/dialogue/*.txt`) cho thấy Merric, Bantu, Jeorge, Linde, Arran/Samson, Castor,
// Minerva, Marisha gia nhập khi thăm làng, chứ không phải trao vật phẩm.
import { describe, expect, it } from 'vitest';
import talysChapterJson from '../../data/chapters/chapter_01_talys.json' with { type: 'json' };
import talysMapJson from '../../data/maps/chapter_01_talys.json' with { type: 'json' };
import itemsJson from '../../data/items.json' with { type: 'json' };
import { loadChapterData } from '../../src/core/data/chapterData';
import { visitVillage } from '../../src/core/chapter/events';
import type { ChapterState } from '../../src/core/chapter/events';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';

const map = talysMapJson as MapData;
const items = itemsJson.items as ItemDefinition[];

/** Chương 1 với một làng trao nhân vật: Merric chờ ở làng (24,1). */
function chapterWithVillageRecruit(): ReturnType<typeof loadChapterData> {
  const raw = JSON.parse(JSON.stringify(talysChapterJson)) as Record<string, unknown>;
  const villages = raw.villages as { id: string; position: { x: number; y: number }; reward: unknown }[];
  const village = villages[0]!;
  village.reward = { type: 'unit', unitId: 'merric' };
  raw.optionalUnits = [
    ...((raw.optionalUnits ?? []) as unknown[]),
    {
      id: 'merric', characterId: 'merric', faction: 'player',
      position: { x: village.position.x, y: village.position.y }, weaponId: 'fire',
    },
  ];
  return loadChapterData(raw, map, items);
}

function stateFor(chapter: ReturnType<typeof loadChapterData>): ChapterState {
  return { units: structuredClone(chapter.units), gold: 0, villageStates: {}, chestStates: {}, doorStates: {} };
}

describe('village that hands over a character (PLAN mục 206)', () => {
  it('adds the character to the player army on a free passable tile and marks the village visited', () => {
    const chapter = chapterWithVillageRecruit();
    const village = chapter.villages![0]!;
    const state = stateFor(chapter);
    const visitor = state.units.find(({ unit }) => unit.faction === 'player')!;
    // Người thăm đứng trên ô làng, như khi chơi thật.
    visitor.unit.position = { ...village.position };

    expect(state.units.some(({ unit }) => unit.id === 'merric')).toBe(false);
    const result = visitVillage(state, visitor.unit.id, village, items, {}, chapter, map);

    const joined = result.state.units.find(({ unit }) => unit.id === 'merric');
    expect(joined, 'Merric phải nhập đội sau khi thăm làng').toBeDefined();
    expect(joined!.unit.faction).toBe('player');
    // Không chồng ô với người thăm, và ô phải nằm sát làng.
    expect(`${joined!.unit.position.x},${joined!.unit.position.y}`)
      .not.toBe(`${village.position.x},${village.position.y}`);
    const distance = Math.abs(joined!.unit.position.x - village.position.x)
      + Math.abs(joined!.unit.position.y - village.position.y);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThanOrEqual(3);
    expect(map.grid[joined!.unit.position.y]![joined!.unit.position.x]).not.toBe('wall');
    // Quân vừa nhận không hành động ngay trong lượt đó.
    expect(joined!.unit.hasActed).toBe(true);
    expect(result.state.villageStates[village.id]).toBe('visited');
    expect(result.events.some((event) => event.type === 'unit_recruited'
      && event.unitId === 'merric' && event.speakerId === visitor.unit.id)).toBe(true);
    // Kho đồ của nhân vật được dựng từ catalog, không rỗng.
    expect(joined!.inventory.length).toBeGreaterThan(0);
    expect(joined!.weapon?.id).toBe('fire');
  });

  it('does not hand the character over twice', () => {
    const chapter = chapterWithVillageRecruit();
    const village = chapter.villages![0]!;
    const state = stateFor(chapter);
    const visitor = state.units.find(({ unit }) => unit.faction === 'player')!;
    visitor.unit.position = { ...village.position };

    const first = visitVillage(state, visitor.unit.id, village, items, {}, chapter, map);
    const second = visitVillage(first.state, visitor.unit.id, village, items, {}, chapter, map);
    expect(second.state.units.filter(({ unit }) => unit.id === 'merric')).toHaveLength(1);
    expect(second.events.some((event) => event.type === 'unit_recruited')).toBe(false);
  });

  it('rejects a village unit reward that no optionalUnits entry declares', () => {
    const raw = JSON.parse(JSON.stringify(talysChapterJson)) as Record<string, unknown>;
    const villages = raw.villages as { reward: unknown }[];
    villages[0]!.reward = { type: 'unit', unitId: 'merric' };
    expect(() => loadChapterData(raw, map, items))
      .toThrow(/must be a player unit in chapter.optionalUnits/);
  });
});
