import { describe, expect, it } from 'vitest';
import { initialChapterData, testChapter01Data, type ExtendedUnitState } from '../../src/core/data/chapterData';
import { calculateCombatForecast, hasPincerAlly } from '../../src/core/combat/calculator';
import { defaultTerrainRegistry, getElevation } from '../../src/core/grid/terrain';
import { applyTrapDamage, trapAt } from '../../src/core/chapter/traps';
import type { MapData } from '../../src/core/grid/types';
import testMapJson from '../../data/maps/test_map_01.json';

const testMap = testMapJson as unknown as MapData;

function freshUnits(): ExtendedUnitState[] {
  return structuredClone(initialChapterData.units);
}

function find(units: ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

function forecastWith(units: ExtendedUnitState[], elevations?: { attacker: number; defender: number }) {
  const marth = find(units, 'marth');
  const pirate = find(units, 'enemy_pirate_5');
  return calculateCombatForecast(
    marth.unit, marth.stats, marth.weapon,
    pirate.unit, pirate.stats, pirate.weapon,
    1, defaultTerrainRegistry, 'plains', 'plains',
    units.map((u) => u.unit),
    elevations,
  );
}

describe('height advantage (PLAN item 104, V07)', () => {
  it('reads elevations from map data', () => {
    expect(getElevation(testMap, { x: 6, y: 0 })).toBe(2);
    expect(getElevation(testMap, { x: 0, y: 0 })).toBe(0);
  });

  it('adds +10 Hit per elevation level and caps at ±20', () => {
    const units = freshUnits();
    const flat = forecastWith(units);
    const up1 = forecastWith(units, { attacker: 1, defender: 0 });
    const up3 = forecastWith(units, { attacker: 3, defender: 0 });
    const down1 = forecastWith(units, { attacker: 0, defender: 1 });
    // Marth's raw accuracy is 108 (displayed 100), so the +10 shows on the
    // defender's side and the -10 shows on Marth's side.
    expect(up1.attacker.hitRate).toBe(100);
    expect(down1.attacker.hitRate).toBe(98);
    expect(up1.defender.hitRate).toBe(flat.defender.hitRate - 10);
    expect(up3.defender.hitRate).toBe(flat.defender.hitRate - 20);
  });
});

describe('pincer attack (PLAN item 103, V05)', () => {
  it('detects an ally on the far side of the opponent', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    const pirate = find(units, 'enemy_pirate_5');
    const ally = find(units, 'caeda');
    marth.unit.position = { x: 5, y: 5 };
    pirate.unit.position = { x: 6, y: 5 };
    ally.unit.position = { x: 7, y: 5 };
    expect(hasPincerAlly(marth.unit, pirate.unit, units.map((u) => u.unit))).toBe(true);
    ally.unit.position = { x: 6, y: 6 };
    expect(hasPincerAlly(marth.unit, pirate.unit, units.map((u) => u.unit))).toBe(false);
  });

  it('grants +15 Hit and +10 Crit in the forecast', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    const pirate = find(units, 'enemy_pirate_5');
    const ally = find(units, 'caeda');
    marth.unit.position = { x: 5, y: 5 };
    pirate.unit.position = { x: 6, y: 5 };
    ally.unit.position = { x: 0, y: 0 };
    const plain = forecastWith(units);
    ally.unit.position = { x: 7, y: 5 };
    const pincered = forecastWith(units);
    expect(pincered.attacker.hitRate).toBe(Math.min(100, plain.attacker.hitRate + 15));
    expect(pincered.attacker.critRate).toBe(Math.min(100, plain.attacker.critRate + 10));
  });
});

// PLAN item 143: the C12 destructible-object tests that lived here were
// removed with the mechanic itself (owner order 2026-11-19).

describe('traps (PLAN item 105, V08)', () => {
  it('loads traps from chapter data', () => {
    expect(testChapter01Data.traps).toHaveLength(1);
    expect(testChapter01Data.traps?.[0]?.damage).toBe(5);
  });

  it('triggers once and never reduces HP below 1', () => {
    const traps = testChapter01Data.traps ?? [];
    const trap = trapAt(traps, new Set(), { x: 7, y: 5 });
    expect(trap?.id).toBe('test_trap');
    expect(trapAt(traps, new Set(['test_trap']), { x: 7, y: 5 })).toBeUndefined();
    const units = freshUnits();
    const marth = find(units, 'marth');
    marth.stats.hp = 3;
    const after = applyTrapDamage(units, 'marth', 5);
    expect(find(after, 'marth').stats.hp).toBe(1);
  });
});
