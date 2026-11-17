import { describe, expect, it } from 'vitest';
import itemsJson from '../../data/items.json';
import ch02Dialogues from '../../data/dialogues/chapter_02_dialogues.json';
import ch03Dialogues from '../../data/dialogues/chapter_03_dialogues.json';
import { chapter02Data, chapter03Data, type ChapterData, type ChapterVillage } from '../../src/core/data/chapterData';
import { bossStartEvent, pillageVillage, seize, visitVillage, type ChapterState } from '../../src/core/chapter/events';

const items = itemsJson.items;
const village = chapter02Data.villages![0]!;

const stateOf = (chapter: ChapterData): ChapterState => ({ units: structuredClone(chapter.units), gold: 0, villageStates: {} });

function moveUnit(state: ChapterState, id: string, x: number, y: number): ChapterState {
  return {
    ...state,
    units: state.units.map((entry) => (entry.unit.id === id ? { ...entry, unit: { ...entry.unit, position: { x, y } } } : entry)),
  };
}

describe('bossStartEvent', () => {
  it('returns the start line for a boss with a boss_<id> dialogue', () => {
    const event = bossStartEvent(ch02Dialogues, 'gomer', 'Gomer');
    expect(event).toEqual({
      type: 'dialogue',
      kind: 'boss_start',
      lines: [{ speaker: 'Gomer', avatarUrl: '', text: ch02Dialogues.boss_gomer.startCombat }],
    });
  });

  it('returns nothing for a unit without a boss dialogue', () => {
    expect(bossStartEvent(ch02Dialogues, 'galder_pirate_1', 'Pirate')).toBeUndefined();
    expect(bossStartEvent(ch03Dialogues, 'gomer', 'Gomer')).toBeUndefined();
  });
});

describe('rewards with an unknown item id', () => {
  it('visitVillage leaves the state unchanged', () => {
    const badVillage: ChapterVillage = { ...village, id: 'village_bad', reward: { type: 'item', itemId: 'no_such_item' } };
    const state = stateOf(chapter02Data);
    const result = visitVillage(state, chapter02Data.lordUnitId, badVillage, items, ch02Dialogues);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('seize still seizes but adds no item', () => {
    const chapter: ChapterData = { ...chapter03Data, seizeReward: { type: 'item', itemId: 'no_such_item' } };
    const tile = chapter.objective.seizeTargetTile!;
    const state = moveUnit(stateOf(chapter), chapter.lordUnitId, tile.x, tile.y);
    const result = seize(state, chapter.lordUnitId, chapter, items);
    expect(result.events).toEqual([{ type: 'chapter_seized', unitId: chapter.lordUnitId }]);
    expect(result.state).toBe(state);
  });
});

describe('pillageVillage edge cases', () => {
  it('does nothing for a pillage unit on an already destroyed village', () => {
    const thief = chapter02Data.units.find(({ aiRole }) => aiRole === 'pillage')!;
    const state: ChapterState = {
      ...moveUnit(stateOf(chapter02Data), thief.unit.id, village.position.x, village.position.y),
      villageStates: { [village.id]: 'destroyed' },
    };
    const result = pillageVillage(state, thief.unit.id, chapter02Data);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
  });

  it('does not let a non-pillage enemy destroy an intact village', () => {
    const enemy = chapter02Data.units.find(({ unit, aiRole }) => unit.faction === 'enemy' && aiRole !== 'pillage')!;
    const state = moveUnit(stateOf(chapter02Data), enemy.unit.id, village.position.x, village.position.y);
    const result = pillageVillage(state, enemy.unit.id, chapter02Data);
    expect(result.state.villageStates).toEqual({});
    expect(result.events).toEqual([]);
  });
});
