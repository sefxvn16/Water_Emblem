import { describe, it, expect } from 'vitest';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import { canDanceFor, executeDance } from '../../src/core/turn/dance';
import { SeededRNG } from '../../src/core/combat/rng';

describe('dance core pure module tests', () => {
  const feena: ExtendedUnitState = {
    unit: {
      id: 'feena',
      name: 'Feena',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 5,
      moveType: 'foot',
      classId: 'dancer',
    },
    stats: { hp: 16, maxHp: 16, str: 3, mag: 0, skill: 2, spd: 13, lck: 8, def: 5, res: 0 },
    level: 1,
    exp: 0,
    inventory: [],
  };

  const marthActed: ExtendedUnitState = {
    unit: {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 5, y: 6 },
      mov: 4,
      moveType: 'foot',
      classId: 'lord',
      hasActed: true,
    },
    stats: { hp: 18, maxHp: 18, str: 5, mag: 0, skill: 3, spd: 7, lck: 7, def: 7, res: 0 },
    level: 1,
    exp: 0,
    inventory: [],
  };

  const marthReady: ExtendedUnitState = {
    ...marthActed,
    unit: { ...marthActed.unit, hasActed: false },
  };

  const enemyActed: ExtendedUnitState = {
    unit: {
      id: 'enemy_1',
      name: 'Enemy',
      faction: 'enemy',
      position: { x: 5, y: 6 },
      mov: 4,
      moveType: 'foot',
      classId: 'pirate',
      hasActed: true,
    },
    stats: { hp: 20, maxHp: 20, str: 5, mag: 0, skill: 1, spd: 4, lck: 0, def: 2, res: 0 },
    level: 1,
    exp: 0,
    inventory: [],
  };

  it('canDanceFor checks dancer class, friendly faction, acted status and adjacent distance', () => {
    // Valid dance: adjacent (dist 1), friendly player, acted unit
    expect(canDanceFor(feena, marthActed, 1)).toBe(true);

    // Invalid: unit has not acted yet
    expect(canDanceFor(feena, marthReady, 1)).toBe(false);

    // Invalid: distance > 1
    expect(canDanceFor(feena, marthActed, 2)).toBe(false);

    // Invalid: enemy unit
    expect(canDanceFor(feena, enemyActed, 1)).toBe(false);

    // Invalid: non-dancer unit trying to dance
    expect(canDanceFor(marthActed, feena, 1)).toBe(false);

    // Invalid: dancer cannot dance for herself
    expect(canDanceFor(feena, feena, 1)).toBe(false);
  });

  it('executeDance refreshes target, exhausts dancer, and awards experience', () => {
    const rng = new SeededRNG(12345);
    const result = executeDance(feena, marthActed, [feena, marthActed], 18, rng);

    expect(result.refreshedTarget.unit.hasActed).toBe(false);
    expect(result.dancer.unit.hasActed).toBe(true);
    expect(result.dancer.exp).toBe(18);
    expect(result.message).toContain('Feena dances for Marth');

    const marthInList = result.updatedUnits.find((u) => u.unit.id === 'marth');
    const feenaInList = result.updatedUnits.find((u) => u.unit.id === 'feena');

    expect(marthInList?.unit.hasActed).toBe(false);
    expect(feenaInList?.unit.hasActed).toBe(true);
  });
});
