import { afterEach, describe, expect, it } from 'vitest';
import { chapter03Data, chapters } from '../../src/core/data/chapterData';
import { isGameSnapshot, type GameSnapshot } from '../../src/storage/saveLoad';

// No data chapter has a lord other than marth, so register a variant of chapter 3 in the shared registry.
const original = chapters.chapter_03!;
const newLordId = original.units.find(({ unit }) => unit.faction === 'player' && unit.id !== 'marth')!.unit.id;

afterEach(() => {
  chapters.chapter_03 = original;
});

function snapshotWithLordInReserve(movedId: string): GameSnapshot {
  const units = structuredClone(chapter03Data.units);
  return {
    chapterId: 'chapter_03',
    turnState: { turnNumber: 1, activePhase: 'player_phase' },
    extendedUnits: units.filter(({ unit }) => unit.id !== movedId),
    reserveUnits: units.filter(({ unit }) => unit.id === movedId),
    rngSeed: 1,
    chapterOutcome: 'ongoing',
    showStoryIntro: false,
    combatLog: [],
    gold: 0,
    villageStates: {},
  };
}

describe('save validation uses the chapter lord id', () => {
  it('accepts a snapshot whose lord is in extendedUnits and rejects one where the lord is missing there', () => {
    chapters.chapter_03 = { ...original, lordUnitId: newLordId };
    // Marth in reserve is fine now; the new lord in reserve is not.
    expect(isGameSnapshot(snapshotWithLordInReserve('marth'))).toBe(true);
    expect(isGameSnapshot(snapshotWithLordInReserve(newLordId))).toBe(false);
  });

  it('still requires marth when he is the lord', () => {
    expect(isGameSnapshot(snapshotWithLordInReserve(newLordId))).toBe(true);
    expect(isGameSnapshot(snapshotWithLordInReserve('marth'))).toBe(false);
  });
});
