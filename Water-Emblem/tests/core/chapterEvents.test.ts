import { describe, it, expect } from 'vitest';
import itemsJson from '../../data/items.json';
import ch02Dialogues from '../../data/dialogues/chapter_02_dialogues.json';
import ch03Dialogues from '../../data/dialogues/chapter_03_dialogues.json';
import { chapter02Data, chapter03Data, type ChapterData, type ChapterVillage, type ExtendedUnitState } from '../../src/core/data/chapterData';
import { evaluateChapterOutcome } from '../../src/core/chapter/types';
import {
  getBossLines,
  pillageVillage,
  recruit,
  resolveDefeat,
  seize,
  visitVillage,
  type ChapterState,
} from '../../src/core/chapter/events';

const items = itemsJson.items;

function stateOf(chapter: ChapterData, gold = 0): ChapterState {
  return { units: structuredClone(chapter.units), gold, villageStates: {} };
}

function unitIn(state: ChapterState, id: string): ExtendedUnitState {
  const entry = state.units.find(({ unit }) => unit.id === id);
  if (!entry) throw new Error(`missing unit ${id}`);
  return entry;
}

function moveUnit(state: ChapterState, id: string, x: number, y: number): ChapterState {
  return {
    ...state,
    units: state.units.map((entry) => (entry.unit.id === id ? { ...entry, unit: { ...entry.unit, position: { x, y } } } : entry)),
  };
}

const village = chapter02Data.villages![0]!;
const itemVillage: ChapterVillage = { ...village, id: 'village_item', reward: { type: 'item', itemId: 'vulnerary' } };

describe('visitVillage', () => {
  it('adds gold, marks the village visited and emits events', () => {
    const state = stateOf(chapter02Data, 100);
    const result = visitVillage(state, chapter02Data.lordUnitId, village, items, ch02Dialogues);
    expect(result.state.gold).toBe(100 + 3000);
    expect(result.state.villageStates[village.id]).toBe('visited');
    expect(result.events.map(({ type }) => type)).toEqual(['gold_gained', 'village_visited', 'dialogue']);
    expect(state.gold).toBe(100);
    expect(state.villageStates).toEqual({});
  });

  it('gives the visitor an item reward without mutating the input', () => {
    const state = stateOf(chapter02Data);
    const before = unitIn(state, chapter02Data.lordUnitId).inventory.length;
    const result = visitVillage(state, chapter02Data.lordUnitId, itemVillage, items, ch02Dialogues);
    expect(unitIn(result.state, chapter02Data.lordUnitId).inventory).toHaveLength(before + 1);
    expect(unitIn(state, chapter02Data.lordUnitId).inventory).toHaveLength(before);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'item_gained', itemId: 'vulnerary', source: 'village' }));
  });

  it('uses the village dialogue from the chapter table when present', () => {
    const lines = [{ speaker: 'Elder', avatarUrl: '', text: 'Welcome.' }];
    const result = visitVillage(stateOf(chapter02Data), chapter02Data.lordUnitId, village, items, { villages: { [village.id]: lines } });
    expect(result.events).toContainEqual({ type: 'dialogue', kind: 'village', lines });
  });

  it('cannot visit a destroyed village', () => {
    const state: ChapterState = { ...stateOf(chapter02Data), villageStates: { [village.id]: 'destroyed' } };
    const result = visitVillage(state, chapter02Data.lordUnitId, village, items, ch02Dialogues);
    expect(result.events).toEqual([]);
    expect(result.state).toBe(state);
  });
});

describe('pillageVillage', () => {
  it('destroys an intact village under a pillage unit only', () => {
    const thief = chapter02Data.units.find(({ aiRole }) => aiRole === 'pillage')!;
    const raiding = moveUnit(stateOf(chapter02Data), thief.unit.id, village.position.x, village.position.y);
    const result = pillageVillage(raiding, thief.unit.id, chapter02Data);
    expect(result.state.villageStates[village.id]).toBe('destroyed');
    expect(result.events).toEqual([expect.objectContaining({ type: 'village_destroyed', villageId: village.id })]);

    const lordOnVillage = moveUnit(stateOf(chapter02Data), chapter02Data.lordUnitId, village.position.x, village.position.y);
    expect(pillageVillage(lordOnVillage, chapter02Data.lordUnitId, chapter02Data).events).toEqual([]);
  });
});

describe('seize', () => {
  const atGate = (chapter: ChapterData) => {
    const tile = chapter.objective.seizeTargetTile!;
    return moveUnit(stateOf(chapter), chapter.lordUnitId, tile.x, tile.y);
  };

  it('lets the lord seize and applies the gold reward', () => {
    const result = seize(atGate(chapter03Data), chapter03Data.lordUnitId, chapter03Data, items);
    expect(result.state.gold).toBe(15000);
    expect(result.events.map(({ type }) => type)).toEqual(['gold_gained', 'chapter_seized']);
  });

  it('applies an item reward to the lord', () => {
    const chapter: ChapterData = { ...chapter03Data, seizeReward: { type: 'item', itemId: 'vulnerary' } };
    const state = atGate(chapter);
    const before = unitIn(state, chapter.lordUnitId).inventory.length;
    const result = seize(state, chapter.lordUnitId, chapter, items);
    expect(unitIn(result.state, chapter.lordUnitId).inventory).toHaveLength(before + 1);
    expect(result.events.map(({ type }) => type)).toEqual(['item_gained', 'chapter_seized']);
  });

  it('refuses a non-lord unit, even on the gate tile', () => {
    const tile = chapter03Data.objective.seizeTargetTile!;
    const other = chapter03Data.units.find(({ unit }) => unit.faction === 'player' && unit.id !== chapter03Data.lordUnitId)!;
    const state = moveUnit(atGate(chapter03Data), other.unit.id, tile.x + 1, tile.y);
    const result = seize(state, other.unit.id, chapter03Data, items);
    expect(result.events).toEqual([]);
    expect(result.state).toBe(state);
  });

  it('refuses when the lord is not on the gate', () => {
    const result = seize(stateOf(chapter03Data), chapter03Data.lordUnitId, chapter03Data, items);
    expect(result.events).toEqual([]);
  });
});

describe('recruit', () => {
  const rule = chapter02Data.recruitments[0]!;

  it('flips the target to the player faction, clears its AI role and returns the dialogue', () => {
    const target = unitIn(stateOf(chapter02Data), rule.targetUnitId);
    const state = moveUnit(stateOf(chapter02Data), rule.speakerUnitId, target.unit.position.x + 1, target.unit.position.y);
    const result = recruit(state, rule.speakerUnitId, rule.targetUnitId, chapter02Data, ch02Dialogues);
    const recruited = unitIn(result.state, rule.targetUnitId);
    expect(recruited.unit.faction).toBe('player');
    expect(recruited.aiRole).toBeUndefined();
    expect(unitIn(state, rule.targetUnitId).unit.faction).toBe('enemy');
    const dialogue = result.events.find((event) => event.type === 'dialogue');
    expect(dialogue?.type === 'dialogue' && dialogue.lines.length).toBeGreaterThan(0);
    expect(result.events[0]).toEqual({ type: 'unit_recruited', unitId: rule.targetUnitId, speakerId: rule.speakerUnitId });
  });

  it('does nothing when the speaker is out of range or not named by a rule', () => {
    const far = recruit(stateOf(chapter02Data), rule.speakerUnitId, rule.targetUnitId, chapter02Data, ch02Dialogues);
    expect(far.events).toEqual([]);
    const wrongSpeaker = recruit(stateOf(chapter02Data), chapter02Data.lordUnitId, rule.targetUnitId, chapter02Data, ch02Dialogues);
    expect(wrongSpeaker.events).toEqual([]);
  });
});

describe('resolveDefeat', () => {
  const dropper = chapter03Data.units.find(({ dropItemId }) => dropItemId !== undefined)!;
  const dropItemId = dropper.dropItemId!;

  it('gives the drop to a living player killer', () => {
    const state = stateOf(chapter03Data);
    const before = unitIn(state, chapter03Data.lordUnitId).inventory.length;
    const result = resolveDefeat(state, dropper.unit.id, chapter03Data.lordUnitId, items, ch03Dialogues);
    const inventory = unitIn(result.state, chapter03Data.lordUnitId).inventory;
    expect(inventory).toHaveLength(before + 1);
    expect(inventory[before]!.itemId).toBe(dropItemId);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'item_gained', source: 'loot', itemId: dropItemId }));
  });

  it('gives nothing to an enemy killer or a dead player killer', () => {
    const enemyKiller = chapter03Data.units.find(({ unit }) => unit.faction === 'enemy' && unit.id !== dropper.unit.id)!;
    const toEnemy = resolveDefeat(stateOf(chapter03Data), dropper.unit.id, enemyKiller.unit.id, items, ch03Dialogues);
    expect(toEnemy.events.some(({ type }) => type === 'item_gained')).toBe(false);
    expect(unitIn(toEnemy.state, enemyKiller.unit.id).inventory).toEqual(unitIn(stateOf(chapter03Data), enemyKiller.unit.id).inventory);

    const deadLord: ChapterState = {
      ...stateOf(chapter03Data),
      units: stateOf(chapter03Data).units.map((entry) => (entry.unit.id === chapter03Data.lordUnitId ? { ...entry, unit: { ...entry.unit, isDead: true } } : entry)),
    };
    const toDead = resolveDefeat(deadLord, dropper.unit.id, chapter03Data.lordUnitId, items, ch03Dialogues);
    expect(toDead.events.some(({ type }) => type === 'item_gained')).toBe(false);
  });

  it('emits boss last words from boss_<unitId> dialogue', () => {
    const result = resolveDefeat(stateOf(chapter03Data), 'hyman', chapter03Data.lordUnitId, items, ch03Dialogues);
    const death = getBossLines(ch03Dialogues, 'hyman')?.death;
    expect(death).toBeTruthy();
    expect(result.events[0]).toEqual({
      type: 'dialogue',
      kind: 'boss_death',
      lines: [{ speaker: unitIn(stateOf(chapter03Data), 'hyman').unit.name, avatarUrl: '', text: death }],
    });
  });
});

describe('evaluateChapterOutcome with a lord id', () => {
  it('loses when the named lord falls, whatever its id', () => {
    const units = [
      { id: 'hero', name: 'Hero', faction: 'player' as const, position: { x: 0, y: 0 }, mov: 4, moveType: 'foot' as const, isDead: true },
      { id: 'other', name: 'Other', faction: 'player' as const, position: { x: 1, y: 0 }, mov: 4, moveType: 'foot' as const },
      { id: 'boss', name: 'Boss', faction: 'enemy' as const, position: { x: 3, y: 3 }, mov: 0, moveType: 'armor' as const },
    ];
    const objective = { type: 'defeat_boss' as const, bossUnitId: 'boss' };
    expect(evaluateChapterOutcome(units, objective, false, 'hero')).toBe('defeat');
    expect(evaluateChapterOutcome(units, objective, false, 'other')).toBe('ongoing');
    expect(evaluateChapterOutcome(units, objective, false, 'nobody')).toBe('defeat');
  });
});
