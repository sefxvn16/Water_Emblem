import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  STAFF_EXP_PER_USE,
  applyStaffUse,
  calculateStaffForecast,
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

  /**
   * PLAN item 209. The staves added by item 185 carried no `healBase`, so
   * `getStaffTargets` returned nothing and a healer holding one could not act.
   * Physic's FE11 row (serenesforest.net/shadow-dragon/inventory/staves/):
   * rank C, 10 uses, worth 1500, range "All", restores Magic/2 + 8 HP — the
   * same amount as Heal, but reaching any ally on the map.
   */
  it('heals with Physic across the map where Heal cannot reach (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth');
    const wounded = find(units, 'caeda');
    // Move the wounded ally well outside Heal's single tile of range.
    wounded.unit = { ...wounded.unit, position: { x: healer.unit.position.x - 6, y: healer.unit.position.y } };
    healer.unit = { ...healer.unit, weaponRanks: { staff: 'C' } };
    healer.inventory = [{ itemId: 'heal_staff', uses: 20 }, { itemId: 'physic_staff', uses: 10 }];

    const heal = itemById.get('heal_staff')!;
    const physic = itemById.get('physic_staff')!;
    expect(getStaffTargets(units, healer, heal, healer.unit.position).map((t) => t.unit.id)).toEqual([]);
    expect(getStaffTargets(units, healer, physic, healer.unit.position).map((t) => t.unit.id))
      .toEqual(['caeda']);

    const before = wounded.stats.hp;
    const result = applyStaffUse(units, 'marth', 'caeda', 'physic_staff', itemById, new SeededRNG(7));
    expect(result, 'Physic phải dùng được').not.toBeNull();
    // healBase 8 + floor(MAG 6 / 2) = 11, the same as Heal.
    expect(result!.healed).toBe(11);
    expect(result!.units.find((u) => u.unit.id === 'caeda')!.stats.hp).toBe(before + 11);
    expect(result!.units.find((u) => u.unit.id === 'marth')!.inventory
      .find((i) => i.itemId === 'physic_staff')!.uses).toBe(9);
    // A C-rank staff stays out of an E-rank healer's hands.
    const novice = healerSetup();
    find(novice, 'marth').inventory = [{ itemId: 'physic_staff', uses: 10 }];
    expect(getUsableStaves(find(novice, 'marth'), itemById)).toEqual([]);
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

  it('heals a wounded ally to full HP with Recover, spends 1 use, and forecasts exact missing HP (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth');
    const wounded = find(units, 'caeda');
    wounded.stats = { ...wounded.stats, hp: 5, maxHp: 30 };
    healer.unit = { ...healer.unit, weaponRanks: { staff: 'B' } };
    healer.inventory = [{ itemId: 'recover_staff', uses: 13 }];
    healer.weapon = itemById.get('recover_staff');

    const recover = itemById.get('recover_staff')!;
    const forecast = calculateStaffForecast(healer, wounded, recover);
    expect(forecast.healAmount).toBe(25);
    expect(forecast.targetHpAfter).toBe(30);
    expect(forecast.staffRemainingUses).toBe(12);

    const result = applyStaffUse(units, 'marth', 'caeda', 'recover_staff', itemById, new SeededRNG(42));
    expect(result, 'Recover must be usable').not.toBeNull();
    expect(result!.healed).toBe(25);
    const healedCaeda = find(result!.units, 'caeda');
    expect(healedCaeda.stats.hp).toBe(30);
    const updatedHealer = find(result!.units, 'marth');
    expect(updatedHealer.inventory[0]?.uses).toBe(12);
  });

  it('heals MAG/2 + 15 with Mend without being capped by max HP (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth');
    const wounded = find(units, 'caeda');
    wounded.stats = { ...wounded.stats, hp: 10, maxHp: 50 };
    healer.stats = { ...healer.stats, mag: 6 };
    healer.unit = { ...healer.unit, classId: 'sage', weaponRanks: { staff: 'D' } };
    healer.inventory = [{ itemId: 'mend_staff', uses: 16 }];
    healer.weapon = itemById.get('mend_staff');

    const mend = itemById.get('mend_staff')!;
    const forecast = calculateStaffForecast(healer, wounded, mend);
    expect(forecast.healAmount).toBe(18); // 15 + floor(6/2), not 20 + 3 = 23

    const result = applyStaffUse(units, 'marth', 'caeda', 'mend_staff', itemById, new SeededRNG(42));
    expect(result, 'Mend must be usable').not.toBeNull();
    expect(result!.healed).toBe(18);
    const healedCaeda = find(result!.units, 'caeda');
    expect(healedCaeda.stats.hp).toBe(28);
  });

  it('heals multiple allies simultaneously across different distances with Fortify and spends 1 use (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth');
    healer.stats = { ...healer.stats, mag: 6 };
    healer.unit = { ...healer.unit, classId: 'sage', weaponRanks: { staff: 'A' } };
    healer.inventory = [{ itemId: 'fortify_staff', uses: 12 }];
    healer.weapon = itemById.get('fortify_staff');

    // Ally 1: adjacent at (25, 5)
    const caeda = find(units, 'caeda');
    caeda.stats = { ...caeda.stats, hp: 10, maxHp: 30 };

    // Ally 2: far away at (10, 5)
    const jagen = find(units, 'jagen');
    jagen.unit = { ...jagen.unit, position: { x: 10, y: 5 } };
    jagen.stats = { ...jagen.stats, hp: 5, maxHp: 30 };

    const fortify = itemById.get('fortify_staff')!;
    const targets = getStaffTargets(units, healer, fortify, healer.unit.position);
    expect(targets.map((t) => t.unit.id)).toContain('caeda');
    expect(targets.map((t) => t.unit.id)).toContain('jagen');

    // Expected heal: MAG 6 / 2 + 8 = 11 HP for each ally
    const result = applyStaffUse(units, 'marth', 'caeda', 'fortify_staff', itemById, new SeededRNG(42));
    expect(result, 'Fortify must be usable').not.toBeNull();
    const updatedCaeda = find(result!.units, 'caeda');
    const updatedJagen = find(result!.units, 'jagen');
    expect(updatedCaeda.stats.hp).toBe(21); // 10 + 11
    expect(updatedJagen.stats.hp).toBe(16); // 5 + 11

    const updatedHealer = find(result!.units, 'marth');
    expect(updatedHealer.inventory[0]?.uses).toBe(11);
  });

  it('does not heal enemies when using Fortify (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth');
    healer.unit = { ...healer.unit, weaponRanks: { staff: 'A' } };
    healer.inventory = [{ itemId: 'fortify_staff', uses: 12 }];

    const enemy = units.find((u) => u.unit.faction === 'enemy')!;
    enemy.stats = { ...enemy.stats, hp: 5, maxHp: 30 };

    const caeda = find(units, 'caeda');
    caeda.stats = { ...caeda.stats, hp: 10, maxHp: 30 };

    const fortify = itemById.get('fortify_staff')!;
    const targets = getStaffTargets(units, healer, fortify, healer.unit.position);
    expect(targets.map((t) => t.unit.id)).not.toContain(enemy.unit.id);

    const result = applyStaffUse(units, 'marth', 'caeda', 'fortify_staff', itemById, new SeededRNG(42));
    expect(result).not.toBeNull();
    const updatedEnemy = find(result!.units, enemy.unit.id);
    expect(updatedEnemy.stats.hp).toBe(5);
  });
});
