import { describe, expect, it } from 'vitest';
import itemsData from '../../data/items.json';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { getAttackRange } from '../../src/core/class/classRules';
import {
  canTransform,
  imitateUnit,
  tickSpecialStates,
  transformUnit,
} from '../../src/core/combat/transform';
import { initialChapterData, testChapter01Data, type ExtendedUnitState } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';

const items = itemsData.items as readonly ItemDefinition[];
const itemById = new Map(items.map((item) => [item.id, item]));

function freshTestUnits(): ExtendedUnitState[] {
  return structuredClone(testChapter01Data.units);
}

function find(units: ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

describe('spheres (PLAN item 120, A12)', () => {
  it('darksphere negates damage unless the attacker holds the lightsphere', () => {
    const units = structuredClone(initialChapterData.units);
    const marth = find(units, 'marth');
    const pirate = find(units, 'enemy_pirate_5');
    const all = units.map((u) => u.unit);
    const plain = calculateCombatForecast(
      marth.unit, marth.stats, marth.weapon, pirate.unit, pirate.stats, pirate.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', all,
    );
    expect(plain.attacker.damage).toBeGreaterThan(0);
    const blocked = calculateCombatForecast(
      marth.unit, marth.stats, marth.weapon, pirate.unit, pirate.stats, pirate.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', all, undefined, undefined,
      { defenderHasDark: true },
    );
    expect(blocked.attacker.damage).toBe(0);
    const pierced = calculateCombatForecast(
      marth.unit, marth.stats, marth.weapon, pirate.unit, pirate.stats, pirate.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', all, undefined, undefined,
      { defenderHasDark: true, attackerHasLight: true },
    );
    expect(pierced.attacker.damage).toBe(plain.attacker.damage);
  });

  it('sphere items exist in data and are not sold', () => {
    expect(itemById.get('lightsphere')?.buyable).toBe(false);
    expect(itemById.get('darksphere')?.buyable).toBe(false);
  });
});

describe('manakete (PLAN item 121, A13)', () => {
  it('transforms without a stone for 5 turns, then cools down for 2', () => {
    const units = freshTestUnits();
    const tiki = find(units, 'tiki');
    expect(canTransform(tiki)).toBe(true);
    const baseStr = tiki.stats.str;
    const transformed = transformUnit(tiki, itemById)!;
    expect(transformed.unit.transformTurns).toBe(5);
    expect(transformed.stats.str).toBe(baseStr + 5);
    expect(transformed.weapon?.id).toBe('dragon_breath');
    expect(canTransform(transformed)).toBe(false);

    let current = [transformed];
    for (let i = 0; i < 4; i++) current = tickSpecialStates(current, itemById).units;
    expect(current[0]!.unit.transformTurns).toBe(1);
    const ended = tickSpecialStates(current, itemById);
    expect(ended.events).toHaveLength(1);
    expect(ended.units[0]!.unit.transformTurns).toBe(0);
    expect(ended.units[0]!.unit.transformCooldown).toBe(2);
    expect(ended.units[0]!.stats.str).toBe(baseStr);
    expect(canTransform(ended.units[0]!)).toBe(false);
    const cooled = tickSpecialStates(tickSpecialStates(ended.units, itemById).units, itemById).units;
    expect(canTransform(cooled[0]!)).toBe(true);
  });

  it('high Luck grants a sixth turn', () => {
    const units = freshTestUnits();
    const tiki = find(units, 'tiki');
    tiki.stats.lck = 15;
    expect(transformUnit(tiki, itemById)!.unit.transformTurns).toBe(6);
  });
});

describe('ballista (PLAN item 122, A14)', () => {
  it('archer-line units on a ballista shoot 3-10 with +6 might', () => {
    const units = freshTestUnits();
    const gordin = find(units, 'gordin');
    const pirate = find(units, 'enemy_pirate_1');
    expect(getAttackRange(gordin.unit, gordin.weapon, 'ballista')).toEqual({ min: 3, max: 10 });
    expect(getAttackRange(gordin.unit, gordin.weapon, 'plains')).toEqual({ min: 2, max: 2 });
    expect(getAttackRange(pirate.unit, pirate.weapon, 'ballista')).toEqual({ min: 1, max: 1 });

    const all = units.map((u) => u.unit);
    const normal = calculateCombatForecast(
      gordin.unit, gordin.stats, gordin.weapon, pirate.unit, pirate.stats, pirate.weapon,
      2, defaultTerrainRegistry, 'plains', 'plains', all,
    );
    const ballista = calculateCombatForecast(
      gordin.unit, gordin.stats, gordin.weapon, pirate.unit, pirate.stats, pirate.weapon,
      5, defaultTerrainRegistry, 'ballista', 'plains', all,
    );
    expect(ballista.attacker.damage).toBe(normal.attacker.damage + 6);
    expect(ballista.attacker.attackCount).toBeGreaterThan(0);
  });
});

describe('triangle attack (PLAN items 123, 154)', () => {
  it('only the three sisters (Palla/Catria/Est) guarantee a crit; other fliers do not', () => {
    const units = structuredClone(initialChapterData.units);
    const caeda = find(units, 'caeda'); // pegasus knight (flier), not a sister
    const pirate = find(units, 'enemy_pirate_5');
    pirate.unit.position = { x: 5, y: 5 };
    caeda.unit.position = { x: 5, y: 4 };
    // Two more allied fliers around the target: not enough (item 154).
    const wing1 = structuredClone(caeda);
    wing1.unit = { ...wing1.unit, id: 'wing1', position: { x: 4, y: 5 } };
    const wing2 = structuredClone(caeda);
    wing2.unit = { ...wing2.unit, id: 'wing2', position: { x: 6, y: 5 } };
    const all = [...units.map((u) => u.unit), wing1.unit, wing2.unit];
    const forecast = calculateCombatForecast(
      caeda.unit, caeda.stats, caeda.weapon, pirate.unit, pirate.stats, pirate.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', all,
    );
    expect(forecast.attacker.critRate).toBeLessThan(100);
    // The three sisters surrounding the target: guaranteed crit.
    const palla = structuredClone(caeda);
    palla.unit = { ...palla.unit, id: 'palla', position: { x: 5, y: 4 } };
    const catria = structuredClone(caeda);
    catria.unit = { ...catria.unit, id: 'catria', position: { x: 4, y: 5 } };
    const est = structuredClone(caeda);
    est.unit = { ...est.unit, id: 'est', position: { x: 6, y: 5 } };
    const sisters = [...units.map((u) => u.unit), palla.unit, catria.unit, est.unit];
    const triangle = calculateCombatForecast(
      palla.unit, palla.stats, palla.weapon, pirate.unit, pirate.stats, pirate.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', sisters,
    );
    expect(triangle.attacker.critRate).toBe(100);
    const solo = calculateCombatForecast(
      palla.unit, palla.stats, palla.weapon, pirate.unit, pirate.stats, pirate.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', units.map((u) => u.unit),
    );
    expect(solo.attacker.critRate).toBeLessThan(100);
  });
});

describe('dancer and Xane (PLAN item 124, A16)', () => {
  it('dancer and chameleon classes and characters exist', () => {
    const units = freshTestUnits();
    expect(find(units, 'feena').unit.classId).toBe('dancer');
    expect(find(units, 'xane').unit.classId).toBe('chameleon');
  });

  it('imitate copies stats and weapon for 5 turns, then reverts', () => {
    const units = freshTestUnits();
    const xane = find(units, 'xane');
    const marth = find(units, 'marth');
    const baseStr = xane.stats.str;
    const imitated = imitateUnit(xane, marth)!;
    expect(imitated.stats.str).toBe(marth.stats.str);
    expect(imitated.weapon?.id).toBe(marth.weapon?.id);
    expect(imitated.unit.imitateTurns).toBe(5);
    let current = [imitated];
    for (let i = 0; i < 5; i++) current = tickSpecialStates(current, itemById).units;
    expect(current[0]!.unit.imitateTurns).toBe(0);
    expect(current[0]!.stats.str).toBe(baseStr);
    expect(current[0]!.imitateBackup).toBeUndefined();
  });
});
