import { describe, expect, it } from 'vitest';
import { chapters, initialChapterData } from '../../src/core/data/chapterData';
import { buildNewGameSnapshot, isGameSnapshot } from '../../src/storage/saveLoad';

// H1 (PLAN item 75): starting a New Game at an empty slot must save a fresh
// chapter-01 game, not the previous game's state. Before the fix there was no
// way to build such a snapshot: onNewGameAtSlot called loadChapter (which only
// queues React state updates) and then handleSave, whose closure still held
// the old game — and which refused to save at all outside the player phase.
describe('H1 new game at an empty slot saves a fresh chapter-01 game', () => {
  it('buildNewGameSnapshot returns a fresh chapter-01 snapshot', () => {
    const snapshot = buildNewGameSnapshot('chapter_01', 123456);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.chapterId).toBe('chapter_01');
    expect(snapshot?.turnState).toEqual({ turnNumber: 1, activePhase: 'player_phase' });
    expect(snapshot?.gold).toBe(0);
    expect(snapshot?.villageStates).toEqual({});
    expect(snapshot?.chapterOutcome).toBe('ongoing');
    expect(snapshot?.showStoryIntro).toBe(true);
    expect(snapshot?.combatLog).toEqual([`📜 Started ${initialChapterData.name}`]);
    expect(snapshot?.extendedUnits).toEqual(initialChapterData.units);
    expect(snapshot?.reserveUnits).toEqual([]);
    expect(snapshot?.rngSeed).toBe(123456);
    // Valid under the same validation saveGameState applies before writing.
    expect(snapshot ? isGameSnapshot(snapshot) : false).toBe(true);
  });

  it('the fresh snapshot is a deep copy of chapter data', () => {
    const snapshot = buildNewGameSnapshot('chapter_01', 1);
    expect(snapshot).not.toBeNull();
    const firstUnit = snapshot!.extendedUnits[0];
    expect(firstUnit).toBeDefined();
    firstUnit!.stats.hp = 1;
    expect(chapters['chapter_01']?.units[0]?.stats.hp).not.toBe(1);
  });

  it('returns null for an unknown chapter', () => {
    expect(buildNewGameSnapshot('chapter_99', 1)).toBeNull();
  });
});
