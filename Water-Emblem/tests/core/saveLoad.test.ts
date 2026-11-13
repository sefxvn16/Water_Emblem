import { describe, expect, it } from 'vitest';
import { chapter02Data, initialChapterData } from '../../src/core/data/chapterData';
import { isGameSnapshot, isSaveGameData, type GameSnapshot } from '../../src/storage/saveLoad';

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

  it('accepts recruited units while rejecting unauthorized faction changes', () => {
    const galder: GameSnapshot = {
      ...makeSnapshot(),
      chapterId: chapter02Data.id,
      extendedUnits: structuredClone(chapter02Data.units),
    };
    const castor = galder.extendedUnits.find(({ unit }) => unit.id === 'castor')!;
    Object.assign(castor.unit, { faction: 'player' });
    expect(isGameSnapshot(galder)).toBe(true);
    const gomer = galder.extendedUnits.find(({ unit }) => unit.id === 'gomer')!;
    Object.assign(gomer.unit, { faction: 'player' });
    expect(isGameSnapshot(galder)).toBe(false);
  });

  it('saves a chapter two reserve without treating it as a map collision', () => {
    const units = structuredClone(chapter02Data.units);
    const abel = units.find(({ unit }) => unit.id === 'abel')!;
    const snapshot: GameSnapshot = {
      ...makeSnapshot(),
      chapterId: chapter02Data.id,
      extendedUnits: units.filter(({ unit }) => unit.id !== 'abel'),
      reserveUnits: [abel],
    };
    expect(isGameSnapshot(snapshot)).toBe(true);
    snapshot.reserveUnits!.push(abel);
    expect(isGameSnapshot(snapshot)).toBe(false);
  });
});
