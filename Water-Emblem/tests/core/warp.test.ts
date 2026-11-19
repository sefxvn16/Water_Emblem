import { describe, expect, it } from 'vitest';
import { chapters } from '../../src/core/data/chapterData';
import {
  applyWarpUse,
  getStaffTargets,
  getWarpDestinations,
  isWarpStaff,
  STAFF_EXP_PER_USE,
} from '../../src/core/combat/staff';
import { SeededRNG } from '../../src/core/combat/rng';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import itemsJson from '../../data/items.json';
import chapter03MapJson from '../../data/maps/chapter_03_devil_mountain.json';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';

// PLAN item 156 (owner 2026-11-20): Warp follows FE11/FE12 — rank C,
// 7 uses, worth 0, target an adjacent ally, destination any traversable
// visible tile; EXP/WEx use the existing staff system.
const warpStaff = (itemsJson.items as ItemDefinition[]).find((item) => item.id === 'warp_staff')!;
const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));
const map = chapter03MapJson as MapData;

function unitsWithWarp() {
  const units = structuredClone(chapters.chapter_03!.units);
  const lena = units.find((u) => u.unit.id === 'lena')!;
  const withWarp = {
    ...lena,
    inventory: [...lena.inventory, { itemId: 'warp_staff', uses: 7 }],
    unit: { ...lena.unit, weaponRanks: { ...lena.unit.weaponRanks, staff: 'C' as const } },
  };
  // Stand Marth next to Lena so a Warp target exists.
  const marth = units.find((u) => u.unit.id === 'marth')!;
  const adjacent = { ...marth, unit: { ...marth.unit, position: { x: lena.unit.position.x + 1, y: lena.unit.position.y } } };
  return {
    units: units.map((u) => (u.unit.id === 'lena' ? withWarp : u.unit.id === 'marth' ? adjacent : u)),
    lena: withWarp,
  };
}

describe('Warp staff (PLAN item 156)', () => {
  it('matches FE11/FE12 data: rank C, 7 uses, worth 0', () => {
    expect(isWarpStaff(warpStaff)).toBe(true);
    expect(warpStaff.requiredRank).toBe('C');
    expect(warpStaff.maxUses).toBe(7);
    expect(warpStaff.price).toBe(0);
    expect(warpStaff.buyable).toBe(false);
  });

  it('targets only adjacent allies, regardless of HP', () => {
    const { units, lena } = unitsWithWarp();
    const targets = getStaffTargets(units, lena, warpStaff, lena.unit.position);
    for (const target of targets) {
      const dist = Math.abs(target.unit.position.x - lena.unit.position.x)
        + Math.abs(target.unit.position.y - lena.unit.position.y);
      expect(dist).toBe(1);
      expect(target.unit.faction).toBe(lena.unit.faction);
    }
  });

  it('destinations exclude occupied and impassable tiles', () => {
    const { units } = unitsWithWarp();
    const marth = units.find((u) => u.unit.id === 'marth')!;
    const destinations = getWarpDestinations(units, marth, map, defaultTerrainRegistry);
    const occupied = new Set(units.filter((u) => !u.unit.isDead)
      .map((u) => `${u.unit.position.x},${u.unit.position.y}`));
    for (const pos of destinations) {
      expect(occupied.has(`${pos.x},${pos.y}`)).toBe(false);
      expect(defaultTerrainRegistry.isPassable(map.grid[pos.y]![pos.x]!, marth.unit.moveType, marth.unit.classId)).toBe(true);
    }
    expect(destinations.length).toBeGreaterThan(0);
  });

  it('moves the ally, spends one use and awards staff EXP', () => {
    const { units, lena } = unitsWithWarp();
    const targets = getStaffTargets(units, lena, warpStaff, lena.unit.position);
    expect(targets.length).toBeGreaterThan(0);
    const target = targets[0]!;
    const destination = getWarpDestinations(units, target, map, defaultTerrainRegistry)[0]!;

    const result = applyWarpUse(
      units, 'lena', target.unit.id, 'warp_staff', destination,
      itemById, new SeededRNG(7), map, defaultTerrainRegistry,
    );
    expect(result).not.toBeNull();
    const moved = result!.units.find((u) => u.unit.id === target.unit.id)!;
    expect(moved.unit.position).toEqual(destination);
    const userAfter = result!.units.find((u) => u.unit.id === 'lena')!;
    expect(userAfter.inventory.find((i) => i.itemId === 'warp_staff')?.uses).toBe(6);
    expect(userAfter.level * 100 + userAfter.exp).toBe(lena.level * 100 + lena.exp + STAFF_EXP_PER_USE);
  });

  it('rejects non-adjacent targets and occupied destinations', () => {
    const { units, lena } = unitsWithWarp();
    const far = units.find((u) => u.unit.id === 'julian')!;
    const destination = getWarpDestinations(units, far, map, defaultTerrainRegistry)[0]!;
    expect(applyWarpUse(units, 'lena', 'julian', 'warp_staff', destination, itemById, new SeededRNG(7), map, defaultTerrainRegistry))
      .toBeNull();

    const targets = getStaffTargets(units, lena, warpStaff, lena.unit.position);
    const target = targets[0]!;
    expect(applyWarpUse(units, 'lena', target.unit.id, 'warp_staff', lena.unit.position, itemById, new SeededRNG(7), map, defaultTerrainRegistry))
      .toBeNull();
  });
});
