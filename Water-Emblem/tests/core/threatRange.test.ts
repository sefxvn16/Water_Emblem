import { describe, it, expect } from 'vitest';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { computeCombinedThreatKeys, computeUnitThreatKeys } from '../../src/core/grid/threatRange';
import type { GridUnit, MapData } from '../../src/core/grid/types';

// PLAN item 145: enemy-range display (Fire Emblem style). The threat set of
// one enemy = weapon range from every tile it can move to; the combined
// danger zone is the union over all enemies.

const registry = new TerrainRegistry();

const plainsMap = (width: number, height: number): MapData => ({
  id: 'threat-test',
  name: 'Threat',
  width,
  height,
  grid: Array.from({ length: height }, () => Array.from({ length: width }, () => 'plains')),
});

const enemyAt = (id: string, x: number, y: number, mov: number): GridUnit => ({
  id, name: id, faction: 'enemy', classId: 'brigand', position: { x, y }, mov, moveType: 'foot',
});

describe('computeUnitThreatKeys (PLAN item 145)', () => {
  it('stationary unit threatens only weapon range from its own tile', () => {
    const map = plainsMap(5, 5);
    const unit = enemyAt('e1', 2, 2, 5);
    const keys = computeUnitThreatKeys(
      { unit, attackRange: { min: 1, max: 1 }, stationary: true },
      { map, terrains: registry, units: [unit] },
    );
    expect([...keys].sort()).toEqual(['1,2', '2,1', '2,3', '3,2']);
  });

  it('moving unit threatens weapon range from every reachable tile', () => {
    const map = plainsMap(7, 1);
    const unit = enemyAt('e1', 0, 0, 2);
    const keys = computeUnitThreatKeys(
      { unit, attackRange: { min: 1, max: 1 }, stationary: false },
      { map, terrains: registry, units: [unit] },
    );
    // Can move to x=0..2 (start tile included), attacks one further each
    // way: from x=1 the start tile x=0 is threatened, from x=2 tile x=3 is.
    expect([...keys].sort()).toEqual(['0,0', '1,0', '2,0', '3,0']);
  });

  it('respects minimum range (a bow cannot threaten adjacent tiles from one spot)', () => {
    const map = plainsMap(5, 1);
    const unit = enemyAt('e1', 2, 0, 5);
    const keys = computeUnitThreatKeys(
      { unit, attackRange: { min: 2, max: 2 }, stationary: true },
      { map, terrains: registry, units: [unit] },
    );
    expect([...keys].sort()).toEqual(['0,0', '4,0']);
  });

  it('unarmed unit (max range 0) threatens nothing', () => {
    const map = plainsMap(3, 3);
    const unit = enemyAt('e1', 1, 1, 5);
    const keys = computeUnitThreatKeys(
      { unit, attackRange: { min: 1, max: 0 }, stationary: false },
      { map, terrains: registry, units: [unit] },
    );
    expect(keys.size).toBe(0);
  });

  it('clips threat tiles at the map edge', () => {
    const map = plainsMap(2, 2);
    const unit = enemyAt('e1', 0, 0, 5);
    const keys = computeUnitThreatKeys(
      { unit, attackRange: { min: 1, max: 1 }, stationary: true },
      { map, terrains: registry, units: [unit] },
    );
    expect([...keys].sort()).toEqual(['0,1', '1,0']);
  });
});

describe('computeCombinedThreatKeys (PLAN item 145)', () => {
  it('unions the threat of every source without duplicates', () => {
    const map = plainsMap(5, 1);
    const a = enemyAt('a', 0, 0, 5);
    const b = enemyAt('b', 4, 0, 5);
    const keys = computeCombinedThreatKeys(
      [
        { unit: a, attackRange: { min: 1, max: 1 }, stationary: true },
        { unit: b, attackRange: { min: 1, max: 1 }, stationary: true },
      ],
      { map, terrains: registry, units: [a, b] },
    );
    expect([...keys].sort()).toEqual(['1,0', '3,0']);
  });

  it('returns an empty set for no sources', () => {
    const map = plainsMap(3, 3);
    expect(computeCombinedThreatKeys([], { map, terrains: registry, units: [] }).size).toBe(0);
  });
});
