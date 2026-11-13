import { describe, expect, it } from 'vitest';
import { carryUnitsToChapter } from '../../src/core/chapter/transition';
import { chapter01Data, chapter02Data } from '../../src/core/data/chapterData';
import { isGameSnapshot } from '../../src/storage/saveLoad';

describe('chapter transition', () => {
  it('preserves HP and weapon and adds chapter two allies', () => {
    const current = structuredClone(chapter01Data.units);
    const marth = current.find(({ unit }) => unit.id === 'marth')!;
    marth.stats.hp = 7;
    marth.weapon = chapter01Data.units.find(({ unit }) => unit.id === 'cain')!.weapon;

    const next = carryUnitsToChapter(current, chapter02Data);
    const carriedMarth = next.find(({ unit }) => unit.id === 'marth')!;
    expect(carriedMarth.stats.hp).toBe(7);
    expect(carriedMarth.weapon.id).toBe('iron_sword');
    expect(carriedMarth.unit.position).toEqual({ x: 23, y: 9 });
    expect(next.some(({ unit }) => unit.id === 'wrys')).toBe(false);
    expect(next.some(({ unit }) => unit.id === 'ogma')).toBe(true);
    expect(isGameSnapshot({
      chapterId: chapter02Data.id,
      turnState: { turnNumber: 1, activePhase: 'player_phase' },
      extendedUnits: next,
      rngSeed: 123,
      chapterOutcome: 'ongoing',
      showStoryIntro: true,
      combatLog: [],
    })).toBe(true);
  });

  it('does not revive fallen units', () => {
    const current = structuredClone(chapter01Data.units);
    const cain = current.find(({ unit }) => unit.id === 'cain')!;
    cain.stats.hp = 0;
    Object.assign(cain.unit, { isDead: true });
    const next = carryUnitsToChapter(current, chapter02Data);
    const carriedCain = next.find(({ unit }) => unit.id === 'cain')!;
    expect(carriedCain.stats.hp).toBe(0);
    expect(carriedCain.unit.isDead).toBe(true);
  });
});
