import { describe, expect, it } from 'vitest';
import itemsData from '../../data/items.json';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import type { MapData } from '../../src/core/grid/types';
import { computeEnemyIntents } from '../../src/core/ai/intent';
import { testChapter01Data, type ExtendedUnitState } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';
import {
  getAnimationSpeed,
  runMovementAnimation,
  setAnimationSpeed,
} from '../../src/renderer/movementAnimation';

const terrains = new TerrainRegistry();
const items = itemsData.items as readonly ItemDefinition[];
const itemById = new Map(items.map((item) => [item.id, item]));

const testMap: MapData = {
  id: 'batch_d_map',
  name: 'Batch D',
  width: 8,
  height: 8,
  grid: Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 'plains')),
};

function contextFor(units: ExtendedUnitState[]) {
  return {
    map: testMap,
    terrains,
    units: units.map((u) => u.unit),
    unitStatsMap: new Map(units.map((u) => [u.unit.id, u.stats])),
    unitWeaponsMap: new Map(units.map((u) => [u.unit.id, u.weapon])),
    turnNumber: 1,
  };
}

describe('enemy intent preview (PLAN items 106/107, B02/B03)', () => {
  function isolatedUnits(): ExtendedUnitState[] {
    const units = structuredClone(testChapter01Data.units) as ExtendedUnitState[];
    // Park everyone except marth and the pirate in a far corner, dead.
    for (const entry of units) {
      if (entry.unit.id !== 'marth' && entry.unit.id !== 'enemy_pirate_1') {
        entry.unit.isDead = true;
        entry.unit.position = { x: 7, y: 7 };
      }
    }
    return units;
  }

  it('marks the intended attack target when a player is in range', () => {
    const units = isolatedUnits();
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;
    pirate.unit.position = { x: 4, y: 4 };
    marth.unit.position = { x: 4, y: 5 };
    const intents = computeEnemyIntents([pirate], contextFor(units));
    expect(intents).toHaveLength(1);
    expect(intents[0]?.targetUnitId).toBe('marth');
  });

  it('shows a movement path toward the player when out of range', () => {
    const units = isolatedUnits();
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;
    pirate.unit.position = { x: 0, y: 0 };
    marth.unit.position = { x: 7, y: 7 };
    const intents = computeEnemyIntents([pirate], contextFor(units));
    expect(intents).toHaveLength(1);
    expect(intents[0]?.targetUnitId).toBeUndefined();
    expect(intents[0]!.path.length).toBeGreaterThan(1);
    expect(intents[0]!.path[0]).toEqual({ x: 0, y: 0 });
  });

  it('skips dead enemies', () => {
    const units = structuredClone(testChapter01Data.units) as ExtendedUnitState[];
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    pirate.unit.isDead = true;
    expect(computeEnemyIntents([pirate], contextFor(units))).toHaveLength(0);
  });
});

describe('animation speed (PLAN item 117, Q07)', () => {
  it('off completes instantly, normal is the default', () => {
    expect(getAnimationSpeed()).toBe('normal');
    setAnimationSpeed('off');
    let steps = 0;
    let completed = false;
    runMovementAnimation(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      'foot',
      { playMoveStep: () => {} },
      () => { steps += 1; },
      () => { completed = true; },
    );
    expect(completed).toBe(true);
    expect(steps).toBe(1); // only the final position is reported
    setAnimationSpeed('normal');
    expect(getAnimationSpeed()).toBe('normal');
    void itemById;
  });
});
