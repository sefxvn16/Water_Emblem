import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  STAFF_EXP_PER_USE,
  applyStaffUse,
  getStaffTargets,
  getUsableStaves,
} from '../../src/core/combat/staff';
import { SeededRNG } from '../../src/core/combat/rng';
import type { ItemDefinition } from '../../src/core/combat/types';
import itemsJson from '../../data/items.json';

const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));

function freshUnits(): ExtendedUnitState[] {
  return structuredClone(initialChapterData.units);
}

function find(units: ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

/** Turn Marth into a curate holding a Heal staff, next to a wounded Caeda. */
function healerSetup(): ExtendedUnitState[] {
  const units = freshUnits();
  const healer = find(units, 'marth'); // (24,5); Caeda at (25,5)
  healer.unit = { ...healer.unit, classId: 'curate', weaponRanks: { staff: 'E' } };
  healer.inventory = [{ itemId: 'heal_staff', uses: 20 }];
  healer.weapon = itemById.get('heal_staff');
  healer.stats = { ...healer.stats, mag: 6 };
  const caeda = find(units, 'caeda');
  caeda.stats = { ...caeda.stats, hp: 5 };
  return units;
}

describe('staff use (PLAN item 89)', () => {
  it('lists usable staves for a healer, none for a swordsman', () => {
    const units = healerSetup();
    expect(getUsableStaves(find(units, 'marth'), itemById).map((s) => s.id)).toEqual(['heal_staff']);

    const plain = freshUnits();
    expect(getUsableStaves(find(plain, 'marth'), itemById)).toEqual([]);
  });

  it('targets wounded allies in staff range only', () => {
    const units = healerSetup();
    const healer = find(units, 'marth');
    const staff = itemById.get('heal_staff')!;

    const targets = getStaffTargets(units, healer, staff, healer.unit.position);

    expect(targets.map((t) => t.unit.id)).toEqual(['caeda']);
  });

  it('heals healBase + MAG/divisor, spends a use, and awards EXP', () => {
    const units = healerSetup();
    const rng = new SeededRNG(42);

    const result = applyStaffUse(units, 'marth', 'caeda', 'heal_staff', itemById, rng);

    expect(result).not.toBeNull();
    // healBase 8 + floor(6/2) = 11, capped by missing HP.
    const caeda = find(result!.units, 'caeda');
    expect(caeda.stats.hp).toBe(Math.min(caeda.stats.maxHp, 5 + 11));
    expect(result!.healed).toBe(caeda.stats.hp - 5);
    const healer = find(result!.units, 'marth');
    expect(healer.inventory[0]?.uses).toBe(19);
    expect(healer.exp).toBe(STAFF_EXP_PER_USE);
    expect(find(units, 'caeda').stats.hp).toBe(5);
  });

  it('a staff at 1 use disappears after use', () => {
    const units = healerSetup();
    find(units, 'marth').inventory = [{ itemId: 'heal_staff', uses: 1 }];
    const rng = new SeededRNG(42);

    const result = applyStaffUse(units, 'marth', 'caeda', 'heal_staff', itemById, rng);

    expect(find(result!.units, 'marth').inventory).toEqual([]);
    expect(find(result!.units, 'marth').weapon).toBeUndefined();
  });

  it('rejects invalid uses', () => {
    const units = healerSetup();
    const rng = new SeededRNG(42);

    // Target at full HP is not a valid heal target.
    find(units, 'caeda').stats = { ...find(units, 'caeda').stats, hp: find(units, 'caeda').stats.maxHp };
    expect(applyStaffUse(units, 'marth', 'caeda', 'heal_staff', itemById, rng)).toBeNull();
    // Warp is not a heal staff (recorded as not yet implemented).
    expect(applyStaffUse(units, 'marth', 'caeda', 'warp_staff', itemById, rng)).toBeNull();
  });
});
