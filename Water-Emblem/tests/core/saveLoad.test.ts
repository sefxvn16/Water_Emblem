import { describe, expect, it } from 'vitest';
import { chapter02Data, chapter03Data, initialChapterData } from '../../src/core/data/chapterData';
import { isGameSnapshot, isSaveGameData, migrateSaveGameData, type GameSnapshot } from '../../src/storage/saveLoad';

const makeSnapshot = (): GameSnapshot => ({
  chapterId: initialChapterData.id,
  turnState: { turnNumber: 2, activePhase: 'player_phase' },
  extendedUnits: structuredClone(initialChapterData.units),
  rngSeed: 123456,
  chapterOutcome: 'ongoing',
  showStoryIntro: false,
  combatLog: [],
  gold: 0,
  villageStates: {},
});

describe('save validation', () => {
  it('accepts a complete stable turn snapshot', () => {
    const snapshot = makeSnapshot();
    expect(isGameSnapshot(snapshot)).toBe(true);
    expect(isGameSnapshot({ ...snapshot, rngSeed: -123456 })).toBe(true);
    expect(isSaveGameData({ ...snapshot, version: '5.0.0', timestamp: 1000 })).toBe(true);
  });

  it('accepts a Chapter 3 snapshot for saving', () => {
    const snapshot = makeSnapshot();
    snapshot.chapterId = chapter03Data.id;
    snapshot.extendedUnits = structuredClone(chapter03Data.units);
    expect(isGameSnapshot(snapshot)).toBe(true);
  });

  it('rejects malformed or incompatible saves', () => {
    const snapshot = makeSnapshot();
    expect(isSaveGameData({ ...snapshot, version: '1.0.0', timestamp: 1000 })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, rngSeed: -0x80000001 })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, turnState: { turnNumber: 0, activePhase: 'player_phase' } })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, extendedUnits: [] })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, gold: -1 })).toBe(false);
    expect(isGameSnapshot({ ...snapshot, villageStates: { unknown: 'visited' } })).toBe(false);
  });

  it('keeps village rewards in a save and migrates an older chapter layout', () => {
    const snapshot = makeSnapshot();
    snapshot.gold = 5000;
    snapshot.villageStates = { village_east: 'visited', village_west: 'destroyed' };
    expect(isGameSnapshot(snapshot)).toBe(true);
    const old = structuredClone({ ...snapshot, version: '4.0.0', timestamp: 1000 });
    old.extendedUnits = old.extendedUnits.filter(({ unit }) =>
      !/^enemy_pirate_(?:[4-9]|10|11)$/.test(unit.id));
    delete (old as unknown as Record<string, unknown>).gold;
    delete (old as unknown as Record<string, unknown>).villageStates;
    const migrated = migrateSaveGameData(old);
    expect(migrated?.version).toBe('5.0.0');
    expect(migrated?.gold).toBe(0);
    expect(migrated?.villageStates).toEqual({});
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'enemy_pirate_11')?.unit.isDead).toBe(true);
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

  it('validates inventory item IDs, uses, and equipped item presence', () => {
    const snapshot = makeSnapshot();
    const marth = snapshot.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
    marth.inventory.push({ itemId: 'master_seal', uses: 1 });
    expect(isGameSnapshot(snapshot)).toBe(true);
    const roundTrip = JSON.parse(JSON.stringify({ ...snapshot, version: '5.0.0', timestamp: 1000 }));
    expect(isSaveGameData(roundTrip)).toBe(true);
    expect(roundTrip.extendedUnits.find((entry: { unit: { id: string } }) => entry.unit.id === 'marth').inventory)
      .toContainEqual({ itemId: 'master_seal', uses: 1 });
    marth.inventory[0]!.uses = 0;
    expect(isGameSnapshot(snapshot)).toBe(false);
    marth.inventory[0]!.uses = 29;
    expect(isGameSnapshot(snapshot)).toBe(false);
    marth.inventory[0]!.uses = 28;
    marth.inventory[0]!.itemId = 'missing_item';
    expect(isGameSnapshot(snapshot)).toBe(false);
    marth.inventory = [{ itemId: 'iron_sword', uses: 40 }];
    expect(isGameSnapshot(snapshot)).toBe(false);
  });

  it('accepts a damaged Marth with Vulnerary and level-ten Gordin with Master Seal', () => {
    const snapshot = makeSnapshot();
    const marth = snapshot.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
    const gordin = snapshot.extendedUnits.find(({ unit }) => unit.id === 'gordin')!;
    marth.stats.hp = 8;
    marth.inventory.push({ itemId: 'vulnerary', uses: 2 });
    gordin.level = 10;
    gordin.inventory.push({ itemId: 'master_seal', uses: 1 });
    expect(isGameSnapshot(snapshot)).toBe(true);
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

  it('migrates version two stats and keeps campaign progress', () => {
    const old = structuredClone({ ...makeSnapshot(), version: '2.0.0', timestamp: 1000 });
    const marth = old.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
    marth.stats.hp -= 3;
    marth.unit.position = { x: 3, y: 5 };
    for (const entry of old.extendedUnits) {
      const stats = entry.stats as unknown as Record<string, unknown>;
      stats.dex = stats.skill;
      delete stats.skill;
      const growths = entry.growths as Record<string, unknown>;
      growths.dex = growths.skill;
      delete growths.skill;
      delete (entry as unknown as Record<string, unknown>).level;
      delete (entry as unknown as Record<string, unknown>).exp;
      delete (entry.unit as unknown as Record<string, unknown>).classId;
    }
    const migrated = migrateSaveGameData(old);
    expect(migrated?.version).toBe('5.0.0');
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'marth')?.stats.hp).toBe(marth.stats.hp);
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'marth')?.unit.position).toEqual({ x: 3, y: 5 });
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'marth')?.stats.skill).toBe(3);
  });

  it('migrates a recruited unit and a reserve without dropping equipment', () => {
    const units = structuredClone(chapter02Data.units);
    const castor = units.find(({ unit }) => unit.id === 'castor')!;
    Object.assign(castor.unit, { faction: 'player' });
    const abel = units.find(({ unit }) => unit.id === 'abel')!;
    const old = {
      ...makeSnapshot(),
      chapterId: 'chapter_02',
      extendedUnits: units.filter(({ unit }) => unit.id !== 'abel'),
      reserveUnits: [abel],
      version: '2.0.0',
      timestamp: 1000,
    };
    const migrated = migrateSaveGameData(old);
    expect(migrated?.reserveUnits?.map(({ unit }) => unit.id)).toEqual(['abel']);
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'castor')?.unit.faction).toBe('player');
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'castor')?.weapon.id).toBe(castor.weapon.id);
  });

  it('migrates v3 inventory while preserving HP, EXP, equipment, and recruits', () => {
    const units = structuredClone(chapter02Data.units);
    const castor = units.find(({ unit }) => unit.id === 'castor')!;
    Object.assign(castor.unit, { faction: 'player' });
    const marth = units.find(({ unit }) => unit.id === 'marth')!;
    marth.stats.hp -= 4;
    marth.level = 3;
    marth.exp = 42;
    const ironSword = units.find(({ unit }) => unit.id === 'ogma')!.weapon;
    marth.weapon = ironSword;
    const abel = units.find(({ unit }) => unit.id === 'abel')!;
    const old = {
      ...makeSnapshot(),
      chapterId: 'chapter_02',
      extendedUnits: units.filter(({ unit }) => unit.id !== 'abel'),
      reserveUnits: [abel],
      version: '3.0.0',
      timestamp: 1000,
    };
    for (const entry of [...old.extendedUnits, ...old.reserveUnits]) {
      delete (entry as unknown as Record<string, unknown>).inventory;
    }
    const migrated = migrateSaveGameData(old);
    const restoredMarth = migrated?.extendedUnits.find(({ unit }) => unit.id === 'marth');
    expect(migrated?.version).toBe('5.0.0');
    expect(restoredMarth?.stats.hp).toBe(marth.stats.hp);
    expect(restoredMarth?.level).toBe(3);
    expect(restoredMarth?.exp).toBe(42);
    expect(restoredMarth?.weapon.id).toBe('iron_sword');
    expect(restoredMarth?.inventory.some(({ itemId }) => itemId === 'iron_sword')).toBe(true);
    expect(migrated?.extendedUnits.find(({ unit }) => unit.id === 'castor')?.unit.faction).toBe('player');
    expect(migrated?.reserveUnits?.map(({ unit }) => unit.id)).toEqual(['abel']);
  });
});
