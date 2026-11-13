import { describe, expect, it } from 'vitest';
import { initialChapterData } from '../../src/core/data/chapterData';
import { isGameSnapshot, isSaveGameData, type GameSnapshot } from '../../src/core/storage/saveLoad';

const makeSnapshot = (): GameSnapshot => ({
  chapterId: initialChapterData.id,
  turnState: { turnNumber: 2, activePhase: 'player_phase' },
  extendedUnits: structuredClone(initialChapterData.units),
  rngSeed: 123456,
  chapterOutcome: 'ongoing',
  showStoryIntro: false,
  combatLog: [],
});

describe('save validation', () => {
  it('accepts a complete stable turn snapshot', () => {
    const snapshot = makeSnapshot();
    expect(isGameSnapshot(snapshot)).toBe(true);
    expect(isGameSnapshot({ ...snapshot, rngSeed: -123456 })).toBe(true);
    expect(isSaveGameData({ ...snapshot, version: '2.0.0', timestamp: 1000 })).toBe(true);
  });

  it('rejects malformed or incompatible saves', () => {
    const snapshot = makeSnapshot();
    expect(isSaveGameData({ ...snapshot, version: '1.0.0', timestamp: 1000 })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, rngSeed: -0x80000001 })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, turnState: { turnNumber: 0, activePhase: 'player_phase' } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, extendedUnits: [] })).toBe(false);
  });

  it('rejects an inconsistent death flag or overlapping live units', () => {
    const deadMismatch = makeSnapshot();
    deadMismatch.extendedUnits[0]!.stats.hp = 0;
    expect(isGameSnapshot(deadMismatch)).toBe(false);

    const collision = makeSnapshot();
    collision.extendedUnits[1]!.unit.position = collision.extendedUnits[0]!.unit.position;
    expect(isGameSnapshot(collision)).toBe(false);
  });

  it('rejects a changed weapon definition or movement type in a save', () => {
    const tamperedWeapon = makeSnapshot();
    tamperedWeapon.extendedUnits[0]!.weapon = {
      ...tamperedWeapon.extendedUnits[0]!.weapon,
      might: 999,
    };
    expect(isGameSnapshot(tamperedWeapon)).toBe(false);

    const tamperedMovement = makeSnapshot();
    Object.assign(tamperedMovement.extendedUnits[0]!.unit, { moveType: 'teleport' });
    expect(isGameSnapshot(tamperedMovement)).toBe(false);
  });
});
