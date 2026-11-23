import { describe, expect, it } from 'vitest';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  STAFF_EXP_PER_USE,
  applyAgainUse,
  applyAumUse,
  applyBarrierUse,
  applyHammerneUse,
  applyRescueUse,
  applySilenceUse,
  applyStaffUse,
  applyThiefUse,
  applyUnlockUse,
  calculateStaffForecast,
  getStaffTargets,
  getUsableStaves,
  tickStatusEffects,
} from '../../src/core/combat/staff';
import { SeededRNG } from '../../src/core/combat/rng';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import type { ChapterChest, ChapterDoor, ChapterState } from '../../src/core/chapter/events';
import { CONVOY_SLOTS } from '../../src/core/data/convoy';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import { getUsableWeapons } from '../../src/core/combat/equip';
import { isGameSnapshot, isSaveGameData, type GameSnapshot } from '../../src/storage/saveLoad';
import itemsJson from '../../data/items.json';

const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));

function freshUnits(): ExtendedUnitState[] {
  return structuredClone(initialChapterData.units);
}

function find(units: readonly ExtendedUnitState[], id: string): ExtendedUnitState {
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

  it('Rescue pulls a distant ally to an adjacent traversable tile without overlapping (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth'); // at (24, 5)
    const ally = find(units, 'caeda');
    ally.unit = { ...ally.unit, position: { x: 10, y: 5 } };
    healer.unit = { ...healer.unit, weaponRanks: { staff: 'E' } };
    healer.inventory = [{ itemId: 'rescue_staff', uses: 5 }];

    const map: MapData = {
      id: 'test_map',
      name: 'Test Map',
      width: 30,
      height: 30,
      grid: Array.from({ length: 30 }, () => Array(30).fill('plains')),
    };

    const targets = getStaffTargets(units, healer, itemById.get('rescue_staff')!, healer.unit.position);
    expect(targets.map((t) => t.unit.id)).toContain('caeda');

    const result = applyRescueUse(units, 'marth', 'caeda', 'rescue_staff', itemById, new SeededRNG(42), map, defaultTerrainRegistry);
    expect(result, 'Rescue must succeed').not.toBeNull();

    const rescued = find(result!.units, 'caeda');
    const distToHealer = Math.abs(rescued.unit.position.x - healer.unit.position.x) + Math.abs(rescued.unit.position.y - healer.unit.position.y);
    expect(distToHealer).toBe(1);

    const livingPositions = result!.units
      .filter((u) => !u.unit.isDead && u.unit.id !== 'caeda')
      .map((u) => `${u.unit.position.x},${u.unit.position.y}`);
    expect(livingPositions).not.toContain(`${rescued.unit.position.x},${rescued.unit.position.y}`);

    const updatedHealer = find(result!.units, 'marth');
    expect(updatedHealer.inventory[0]?.uses).toBe(4);
    expect(updatedHealer.exp).toBe(STAFF_EXP_PER_USE);
  });

  it('Unlock opens a door 2 tiles away without a key and fails on a door 3 tiles away (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth'); // at (24, 5)
    healer.unit = { ...healer.unit, weaponRanks: { staff: 'C' } };
    healer.inventory = [{ itemId: 'unlock_staff', uses: 5 }];

    const door2Away: ChapterDoor = { id: 'door_2', position: { x: 24, y: 7 } };
    const door3Away: ChapterDoor = { id: 'door_3', position: { x: 24, y: 8 } };

    const state: ChapterState = {
      units,
      gold: 0,
      villageStates: {},
      doorStates: {},
    };

    const failResult = applyUnlockUse(state, 'marth', door3Away, 'unlock_staff', itemById, new SeededRNG(42));
    expect(failResult, 'Unlock must fail on door 3 tiles away').toBeNull();

    const successResult = applyUnlockUse(state, 'marth', door2Away, 'unlock_staff', itemById, new SeededRNG(42));
    expect(successResult, 'Unlock must succeed on door 2 tiles away').not.toBeNull();
    expect(successResult!.state.doorStates?.['door_2']).toBe('opened');
    expect(successResult!.events).toContainEqual(expect.objectContaining({ type: 'door_opened', doorId: 'door_2' }));

    const updatedHealer = find(successResult!.state.units, 'marth');
    expect(updatedHealer.inventory[0]?.uses).toBe(4);
    expect(updatedHealer.exp).toBe(STAFF_EXP_PER_USE);
  });

  it('Thief opens a chest into user inventory, sends to convoy if full, and fails when both are full (PLAN item 209)', () => {
    const units = healerSetup();
    const healer = find(units, 'marth'); // at (24, 5)
    healer.unit = { ...healer.unit, weaponRanks: { staff: 'E' } };
    healer.inventory = [{ itemId: 'thief_staff', uses: 5 }];

    const chest: ChapterChest = {
      id: 'chest_far',
      position: { x: 2, y: 2 },
      reward: { type: 'item', itemId: 'silver_sword' },
    };

    const state: ChapterState = {
      units,
      gold: 0,
      villageStates: {},
      chestStates: {},
    };

    const res1 = applyThiefUse(state, [], 'marth', chest, 'thief_staff', itemById, new SeededRNG(42));
    expect(res1, 'Thief must open chest').not.toBeNull();
    expect(res1!.state.chestStates?.['chest_far']).toBe('opened');
    const updatedHealer1 = find(res1!.state.units, 'marth');
    expect(updatedHealer1.inventory.some((i) => i.itemId === 'silver_sword')).toBe(true);
    expect(updatedHealer1.inventory.find((i) => i.itemId === 'thief_staff')?.uses).toBe(4);

    const fullWeaponsHealer = {
      ...healer,
      inventory: [
        { itemId: 'thief_staff', uses: 5 },
        { itemId: 'iron_sword', uses: 40 },
        { itemId: 'steel_sword', uses: 30 },
        { itemId: 'killing_edge', uses: 20 },
        { itemId: 'rapier', uses: 25 },
      ],
    };
    const stateWithFullWeapons: ChapterState = {
      ...state,
      units: state.units.map((u) => (u.unit.id === 'marth' ? fullWeaponsHealer : u)),
    };
    const res2 = applyThiefUse(stateWithFullWeapons, [], 'marth', chest, 'thief_staff', itemById, new SeededRNG(42));
    expect(res2, 'Thief sends to convoy when user inventory is full').not.toBeNull();
    expect(res2!.convoy.some((i) => i.itemId === 'silver_sword')).toBe(true);
    expect(res2!.state.chestStates?.['chest_far']).toBe('opened');

    const fullConvoy = Array.from({ length: CONVOY_SLOTS }, () => ({ itemId: 'iron_sword', uses: 40 }));
    const res3 = applyThiefUse(stateWithFullWeapons, fullConvoy, 'marth', chest, 'thief_staff', itemById, new SeededRNG(42));
    expect(res3, 'Thief must return null when both inventory and convoy are full').toBeNull();
  });

  it('Hammerne repairs an ally item back to maxUses, and getUsableStaves rejects non-Lena (PLAN item 209)', () => {
    const units = healerSetup();
    const marth = find(units, 'marth');
    marth.inventory = [{ itemId: 'hammerne_staff', uses: 3 }];
    expect(getUsableStaves(marth, itemById).map((s) => s.id)).not.toContain('hammerne_staff');

    const lena = structuredClone(find(units, 'caeda'));
    lena.unit = { ...lena.unit, id: 'lena', name: 'Lena', classId: 'curate', weaponRanks: { staff: 'E' }, position: { x: 24, y: 5 } };
    lena.inventory = [{ itemId: 'hammerne_staff', uses: 3 }];
    expect(getUsableStaves(lena, itemById).map((s) => s.id)).toContain('hammerne_staff');

    const caeda = find(units, 'caeda');
    caeda.unit = { ...caeda.unit, position: { x: 25, y: 5 } };
    caeda.inventory = [{ itemId: 'iron_sword', uses: 1 }];

    const testUnits = [...units.filter((u) => u.unit.id !== 'caeda'), lena, caeda];

    const result = applyHammerneUse(testUnits, 'lena', 'caeda', 0, 'hammerne_staff', itemById, new SeededRNG(42));
    expect(result, 'Hammerne must repair adjacent ally weapon').not.toBeNull();

    const repairedCaeda = find(result!.units, 'caeda');
    expect(repairedCaeda.inventory[0]?.uses).toBe(40);

    const updatedLena = find(result!.units, 'lena');
    expect(updatedLena.inventory[0]?.uses).toBe(2);
    expect(updatedLena.exp).toBe(STAFF_EXP_PER_USE);
  });

  it('Aum revives a fallen ally to max HP adjacent to caster with hasActed true, and rejects non-princesses (PLAN item 209)', () => {
    const units = healerSetup();
    const marth = find(units, 'marth');
    marth.unit = { ...marth.unit, weaponRanks: { staff: 'A' } };
    marth.inventory = [{ itemId: 'aum_staff', uses: 1 }];
    expect(getUsableStaves(marth, itemById).map((s) => s.id)).not.toContain('aum_staff');

    const caeda = find(units, 'caeda');
    caeda.unit = { ...caeda.unit, classId: 'cleric', weaponRanks: { staff: 'A' }, position: { x: 24, y: 5 } };
    caeda.inventory = [{ itemId: 'aum_staff', uses: 1 }];
    expect(getUsableStaves(caeda, itemById).map((s) => s.id)).toContain('aum_staff');

    const jagen = find(units, 'jagen');
    jagen.unit = { ...jagen.unit, isDead: true, position: { x: 0, y: 0 } };
    jagen.stats = { ...jagen.stats, hp: 0, maxHp: 28 };

    const map: MapData = {
      id: 'test_map',
      name: 'Test Map',
      width: 30,
      height: 30,
      grid: Array.from({ length: 30 }, () => Array(30).fill('plains')),
    };

    const result = applyAumUse(units, 'caeda', 'jagen', 'aum_staff', itemById, new SeededRNG(42), map, defaultTerrainRegistry);
    expect(result, 'Aum must revive fallen ally').not.toBeNull();

    const revivedJagen = find(result!.units, 'jagen');
    expect(revivedJagen.unit.isDead).toBe(false);
    expect(revivedJagen.stats.hp).toBe(28);
    expect(revivedJagen.unit.hasActed).toBe(true);

    const distToCaeda = Math.abs(revivedJagen.unit.position.x - caeda.unit.position.x)
      + Math.abs(revivedJagen.unit.position.y - caeda.unit.position.y);
    expect(distToCaeda).toBe(1);

    const updatedCaeda = find(result!.units, 'caeda');
    expect(updatedCaeda.inventory.find((i) => i.itemId === 'aum_staff')).toBeUndefined();
    expect(updatedCaeda.exp).toBe(STAFF_EXP_PER_USE);
  });

  it('Barrier raises ally Res by 7, reduces magic damage, expires after 7 turns, resets to 7 on re-use, and respects class cap (PLAN item 209)', () => {
    const units = healerSetup();
    const marth = find(units, 'marth');
    marth.unit = { ...marth.unit, weaponRanks: { staff: 'D' } };
    marth.inventory = [{ itemId: 'barrier_staff', uses: 18 }];
    marth.weapon = itemById.get('barrier_staff');

    const caeda = find(units, 'caeda');
    caeda.stats = { ...caeda.stats, res: 2, maxHp: 20, hp: 20 };

    // Sát thương phép nhận vào trước khi buff:
    const enemyMage: ExtendedUnitState = {
      unit: { id: 'enemy_mage', name: 'Mage', faction: 'enemy', position: { x: 26, y: 5 }, mov: 5, moveType: 'mage' },
      stats: { hp: 20, maxHp: 20, str: 0, mag: 12, skill: 5, spd: 5, lck: 0, def: 2, res: 5 },
      inventory: [{ itemId: 'fire', uses: 30 }],
      weapon: itemById.get('fire'),
      level: 1,
      exp: 0,
    };

    const forecastBefore = calculateCombatForecast(
      enemyMage.unit,
      enemyMage.stats,
      enemyMage.weapon,
      caeda.unit,
      caeda.stats,
      caeda.weapon,
      1,
      defaultTerrainRegistry,
      'plains',
      'plains',
    );
    expect(forecastBefore.attacker.damage).toBe(15);

    // Dùng Barrier:
    const res = applyBarrierUse(units, 'marth', 'caeda', 'barrier_staff', itemById, new SeededRNG(42));
    expect(res, 'Barrier must succeed').not.toBeNull();
    expect(res!.resBoost).toBe(7);

    const buffedCaeda = find(res!.units, 'caeda');
    expect(buffedCaeda.stats.res).toBe(9);
    expect(buffedCaeda.statusEffects).toEqual([{ type: 'barrier', value: 7, duration: 7 }]);

    const updatedMarth = find(res!.units, 'marth');
    expect(updatedMarth.inventory[0]?.uses).toBe(17);
    expect(updatedMarth.exp).toBe(STAFF_EXP_PER_USE);

    // Sát thương phép nhận vào sau khi buff: giảm đúng 7 (15 - 7 = 8)
    const forecastAfter = calculateCombatForecast(
      enemyMage.unit,
      enemyMage.stats,
      enemyMage.weapon,
      buffedCaeda.unit,
      buffedCaeda.stats,
      buffedCaeda.weapon,
      1,
      defaultTerrainRegistry,
      'plains',
      'plains',
    );
    expect(forecastAfter.attacker.damage).toBe(8);

    // Dùng lại khi còn hiệu lực: không thành +14, đặt lại về 7
    const reUseRes = applyBarrierUse(res!.units, 'marth', 'caeda', 'barrier_staff', itemById, new SeededRNG(42));
    expect(reUseRes, 'Barrier re-use must succeed').not.toBeNull();
    const reBuffedCaeda = find(reUseRes!.units, 'caeda');
    expect(reBuffedCaeda.stats.res).toBe(9);
    expect(reBuffedCaeda.statusEffects).toEqual([{ type: 'barrier', value: 7, duration: 7 }]);

    // Sau 7 lượt hiệu ứng hết và Res trở lại số gốc (2):
    let runningUnits = reUseRes!.units;
    for (let turn = 1; turn <= 6; turn++) {
      const ticked = tickStatusEffects(runningUnits, 'player');
      runningUnits = ticked.units;
      const c = find(runningUnits, 'caeda');
      expect(c.stats.res).toBe(9 - turn);
      expect(c.statusEffects?.[0]?.duration).toBe(7 - turn);
      expect(c.statusEffects?.[0]?.value).toBe(7 - turn);
    }
    const finalTick = tickStatusEffects(runningUnits, 'player');
    const expiredCaeda = find(finalTick.units, 'caeda');
    expect(expiredCaeda.stats.res).toBe(2);
    expect(expiredCaeda.statusEffects).toEqual([]);

    // Kiểm trần Res của class: unit có base Res 26, class cap là 30 -> buff tối đa 4, không vượt 30
    const nearCapCaeda = structuredClone(caeda);
    nearCapCaeda.stats.res = 26;
    nearCapCaeda.statusEffects = [];
    const testUnits = [marth, nearCapCaeda];
    const capRes = applyBarrierUse(testUnits, 'marth', 'caeda', 'barrier_staff', itemById, new SeededRNG(42));
    expect(capRes).not.toBeNull();
    expect(capRes!.resBoost).toBe(4);
    const cappedCaeda = find(capRes!.units, 'caeda');
    expect(cappedCaeda.stats.res).toBe(30);
  });

  it('Silence locks enemy magic and staves for 1 turn, retains physical weapons, and clears next turn (PLAN item 209)', () => {
    const units = healerSetup();
    const marth = find(units, 'marth');
    marth.unit = { ...marth.unit, weaponRanks: { staff: 'B' } };
    marth.inventory = [{ itemId: 'silence_staff', uses: 3 }];
    marth.weapon = itemById.get('silence_staff');

    const enemyMage: ExtendedUnitState = {
      unit: { id: 'enemy_mage', name: 'Enemy Mage', faction: 'enemy', position: { x: 20, y: 10 }, mov: 5, moveType: 'mage' },
      stats: { hp: 20, maxHp: 20, str: 5, mag: 10, skill: 5, spd: 5, lck: 0, def: 2, res: 5 },
      inventory: [
        { itemId: 'fire', uses: 30 },
        { itemId: 'heal_staff', uses: 20 },
        { itemId: 'iron_sword', uses: 40 },
      ],
      level: 1,
      exp: 0,
    };

    const allUnits = [...units, enemyMage];

    // Trước khi Silence: dùng được cả fire, heal_staff, iron_sword
    expect(getUsableWeapons(enemyMage, itemById).map((w) => w.itemId)).toContain('fire');
    expect(getUsableWeapons(enemyMage, itemById).map((w) => w.itemId)).toContain('iron_sword');
    expect(getUsableStaves(enemyMage, itemById).map((s) => s.id)).toContain('heal_staff');

    // Dùng Silence lên enemyMage:
    const res = applySilenceUse(allUnits, 'marth', 'enemy_mage', 'silence_staff', itemById, new SeededRNG(42));
    expect(res, 'Silence must succeed').not.toBeNull();

    const silencedEnemy = find(res!.units, 'enemy_mage');
    expect(silencedEnemy.statusEffects).toEqual([{ type: 'silence', value: 1, duration: 1 }]);

    // Quân bị khóa: getUsableWeapons và getUsableStaves loại bỏ tome và staff, giữ vũ khí vật lý
    const usableWeapons = getUsableWeapons(silencedEnemy, itemById);
    expect(usableWeapons.map((w) => w.itemId)).not.toContain('fire');
    expect(usableWeapons.map((w) => w.itemId)).toContain('iron_sword');
    expect(getUsableStaves(silencedEnemy, itemById)).toEqual([]);

    const updatedMarth = find(res!.units, 'marth');
    expect(updatedMarth.inventory[0]?.uses).toBe(2);
    expect(updatedMarth.exp).toBe(STAFF_EXP_PER_USE);

    // Sang lượt sau thì hết khóa:
    const nextTurn = tickStatusEffects(res!.units, 'enemy');
    const curedEnemy = find(nextTurn.units, 'enemy_mage');
    expect(curedEnemy.statusEffects).toEqual([]);
    expect(getUsableWeapons(curedEnemy, itemById).map((w) => w.itemId)).toContain('fire');
    expect(getUsableStaves(curedEnemy, itemById).map((s) => s.id)).toContain('heal_staff');
  });

  it('Again restores action to an acted ally, and rejects unacted allies or caster self (PLAN item 209)', () => {
    const units = healerSetup();
    const marth = find(units, 'marth');
    marth.unit = { ...marth.unit, weaponRanks: { staff: 'B' } };
    marth.inventory = [{ itemId: 'again_staff', uses: 3 }];
    marth.weapon = itemById.get('again_staff');

    const caeda = find(units, 'caeda');
    caeda.unit = { ...caeda.unit, hasActed: true, hasTraded: true, hasStored: true };

    // 1. Gọi lên đồng minh hasActed === true -> được trả về false và hành động lại được
    const res = applyAgainUse(units, 'marth', 'caeda', 'again_staff', itemById, new SeededRNG(42));
    expect(res, 'Again must succeed on acted ally').not.toBeNull();

    const refreshedCaeda = find(res!.units, 'caeda');
    expect(refreshedCaeda.unit.hasActed).toBe(false);
    expect(refreshedCaeda.unit.hasTraded).toBe(false);
    expect(refreshedCaeda.unit.hasStored).toBe(false);

    const updatedMarth = find(res!.units, 'marth');
    expect(updatedMarth.inventory[0]?.uses).toBe(2);
    expect(updatedMarth.exp).toBe(STAFF_EXP_PER_USE);

    // 2. Gọi lên quân chưa hành động trả null
    const unactedCaedaUnits = res!.units;
    const resUnacted = applyAgainUse(unactedCaedaUnits, 'marth', 'caeda', 'again_staff', itemById, new SeededRNG(42));
    expect(resUnacted, 'Again must return null for unacted ally').toBeNull();

    // 3. Gọi lên chính người cầm trả null
    const resSelf = applyAgainUse(units, 'marth', 'marth', 'again_staff', itemById, new SeededRNG(42));
    expect(resSelf, 'Again must return null when targeting self').toBeNull();
  });

  it('Save/Load preserves remaining status effect duration, and loads older saves without statusEffects (PLAN item 209)', () => {
    const baseSnapshot: GameSnapshot = {
      chapterId: initialChapterData.id,
      turnState: { turnNumber: 2, activePhase: 'player_phase' },
      extendedUnits: structuredClone(initialChapterData.units),
      rngSeed: 123456,
      chapterOutcome: 'ongoing',
      showStoryIntro: false,
      combatLog: [],
      gold: 0,
      villageStates: {},
    };

    // 1. Lưu hiệu ứng và nạp lại: thấy đúng số lượt còn lại
    const snapshotWithEffects = structuredClone(baseSnapshot);
    const marth = snapshotWithEffects.extendedUnits.find((u) => u.unit.id === 'marth')!;
    marth.statusEffects = [{ type: 'barrier', value: 5, duration: 5 }];

    expect(isGameSnapshot(snapshotWithEffects)).toBe(true);
    expect(isSaveGameData({ ...snapshotWithEffects, version: '6.0.0', timestamp: 1000 })).toBe(true);
    expect(snapshotWithEffects.extendedUnits.find((u) => u.unit.id === 'marth')?.statusEffects?.[0]?.duration).toBe(5);

    // 2. Bản lưu cũ không có trường mới (statusEffects === undefined) vẫn nạp được
    const snapshotOld = structuredClone(baseSnapshot);
    for (const u of snapshotOld.extendedUnits) {
      delete (u as any).statusEffects;
    }
    expect(isGameSnapshot(snapshotOld)).toBe(true);
    expect(isSaveGameData({ ...snapshotOld, version: '6.0.0', timestamp: 1000 })).toBe(true);
  });
});
