import { describe, expect, it } from 'vitest';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';
import {
  calculateStaffForecast,
  getAllStaffTargets,
  getStavesForTarget,
  applyStaffUse,
} from '../../src/core/combat/staff';
import { canAttackAtDistance, getAttackWeapons } from '../../src/core/combat/equip';
import { getAttackRange } from '../../src/core/class/classRules';
import { SeededRNG } from '../../src/core/combat/rng';
import itemsJson from '../../data/items.json' with { type: 'json' };

const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));

const healStaff = itemById.get('heal_staff')!;
const mendStaff = itemById.get('mend_staff')!;

function makeUnit(overrides: Partial<ExtendedUnitState>): ExtendedUnitState {
  return {
    unit: {
      id: 'unit1',
      name: 'Unit 1',
      classId: 'curate',
      faction: 'player',
      position: { x: 5, y: 5 },
      mov: 5,
      moveType: 'foot',
      weaponRanks: { staff: 'C', sword: 'E', lance: 'D' },
      isDead: false,
      hasActed: false,
    },
    stats: {
      hp: 20,
      maxHp: 20,
      str: 1,
      mag: 5,
      skill: 5,
      spd: 5,
      def: 2,
      res: 6,
      lck: 4,
    },
    inventory: [],
    level: 1,
    exp: 0,
    avatarUrl: '',
    ...overrides,
  };
}

describe('attackHealFlow.test.ts: Luồng chọn mục tiêu rồi chọn vũ khí rồi hiện dự báo cho cả tấn công và hồi máu', () => {
  it('Staff Forecast: Tính toán chính xác lượng máu hồi, HP sau hồi, và độ bền còn lại', () => {
    const lena = makeUnit({
      unit: {
        id: 'lena',
        name: 'Lena',
        classId: 'cleric',
        faction: 'player',
        position: { x: 5, y: 5 },
        mov: 5,
        moveType: 'foot',
        weaponRanks: { staff: 'C' },
        isDead: false,
        hasActed: false,
      },
      stats: {
        hp: 18,
        maxHp: 18,
        str: 1,
        mag: 6,
        skill: 7,
        spd: 8,
        def: 3,
        res: 8,
        lck: 8,
      },
      level: 3,
      inventory: [{ itemId: 'heal_staff', uses: 12 }],
    });

    const injuredMarth = makeUnit({
      unit: {
        id: 'marth',
        name: 'Marth',
        classId: 'lord',
        faction: 'player',
        position: { x: 5, y: 6 },
        mov: 5,
        moveType: 'foot',
        weaponRanks: { sword: 'D' },
        isDead: false,
        hasActed: false,
      },
      stats: {
        hp: 10,
        maxHp: 28,
        str: 5,
        mag: 0,
        skill: 3,
        spd: 7,
        def: 7,
        res: 0,
        lck: 7,
      },
      level: 1,
      inventory: [{ itemId: 'iron_sword', uses: 40 }],
    });

    // Lena MAG=6, heal_staff (healBase=8, divisor=2) -> 8 + floor(6/2) = 11 HP
    const forecast = calculateStaffForecast(lena, injuredMarth, healStaff);

    expect(forecast.healAmount).toBe(11);
    expect(forecast.targetHpAfter).toBe(21);
    expect(forecast.staffRemainingUses).toBe(11);
    expect(forecast.healer.unit.name).toBe('Lena');
    expect(forecast.target.unit.name).toBe('Marth');
  });

  it('Staff Forecast: Giới hạn lượng hồi máu ở mức maxHp khi lượng hồi vượt quá máu mất', () => {
    const lena = makeUnit({
      unit: {
        id: 'lena',
        name: 'Lena',
        classId: 'cleric',
        faction: 'player',
        position: { x: 5, y: 5 },
        mov: 5,
        moveType: 'foot',
        weaponRanks: { staff: 'C' },
        isDead: false,
        hasActed: false,
      },
      stats: {
        hp: 18,
        maxHp: 18,
        str: 1,
        mag: 8,
        skill: 7,
        spd: 8,
        def: 3,
        res: 8,
        lck: 8,
      },
      level: 3,
      inventory: [{ itemId: 'mend_staff', uses: 10 }],
    });

    const slightlyInjuredAbel = makeUnit({
      unit: {
        id: 'abel',
        name: 'Abel',
        classId: 'cavalier',
        faction: 'player',
        position: { x: 6, y: 5 },
        mov: 7,
        moveType: 'cavalry',
        weaponRanks: { lance: 'D' },
        isDead: false,
        hasActed: false,
      },
      stats: {
        hp: 20,
        maxHp: 24,
        str: 6,
        mag: 0,
        skill: 7,
        spd: 7,
        def: 7,
        res: 0,
        lck: 2,
      },
      level: 1,
    });

    // Mend base=20 + MAG=8 = 28 HP potential, but Abel only needs 4 HP (20/24)
    const forecast = calculateStaffForecast(lena, slightlyInjuredAbel, mendStaff);

    expect(forecast.healAmount).toBe(4);
    expect(forecast.targetHpAfter).toBe(24);
    expect(forecast.staffRemainingUses).toBe(9);
  });

  it('Staff Target Selection: getAllStaffTargets lọc đúng các đồng đội cần hồi máu trong tầm', () => {
    const lena = makeUnit({
      unit: {
        id: 'lena',
        name: 'Lena',
        classId: 'cleric',
        faction: 'player',
        position: { x: 5, y: 5 },
        mov: 5,
        moveType: 'foot',
        weaponRanks: { staff: 'C' },
        isDead: false,
        hasActed: false,
      },
      inventory: [
        { itemId: 'heal_staff', uses: 20 },
        { itemId: 'warp_staff', uses: 7 },
      ],
    });

    const adjacentInjured = makeUnit({
      unit: { id: 'adj_injured', name: 'Adj Injured', classId: 'knight', faction: 'player', position: { x: 5, y: 6 }, mov: 4, moveType: 'armor', isDead: false, hasActed: false },
      stats: { hp: 10, maxHp: 20, str: 5, mag: 0, skill: 3, spd: 3, def: 11, res: 0, lck: 2 },
    });

    const adjacentFullHp = makeUnit({
      unit: { id: 'adj_full', name: 'Adj Full', classId: 'archer', faction: 'player', position: { x: 4, y: 5 }, mov: 5, moveType: 'foot', isDead: false, hasActed: false },
      stats: { hp: 20, maxHp: 20, str: 5, mag: 0, skill: 3, spd: 3, def: 5, res: 0, lck: 2 },
    });

    const distantInjured = makeUnit({
      unit: { id: 'dist_injured', name: 'Dist Injured', classId: 'mercenary', faction: 'player', position: { x: 5, y: 9 }, mov: 5, moveType: 'foot', isDead: false, hasActed: false },
      stats: { hp: 5, maxHp: 22, str: 6, mag: 0, skill: 8, spd: 9, def: 6, res: 0, lck: 3 },
    });

    const enemyUnit = makeUnit({
      unit: { id: 'enemy_pirate', name: 'Pirate', classId: 'pirate', faction: 'enemy', position: { x: 5, y: 4 }, mov: 5, moveType: 'foot', isDead: false, hasActed: false },
      stats: { hp: 5, maxHp: 20, str: 5, mag: 0, skill: 3, spd: 3, def: 4, res: 0, lck: 2 },
    });

    const allUnits = [lena, adjacentInjured, adjacentFullHp, distantInjured, enemyUnit];

    const targets = getAllStaffTargets(allUnits, lena, itemById, lena.unit.position);

    // adjacentInjured (dist 1, reaches by Heal & Warp)
    expect(targets.some((t) => t.unit.id === 'adj_injured')).toBe(true);
    // adjacentFullHp (dist 1, reaches by Warp even if full HP)
    expect(targets.some((t) => t.unit.id === 'adj_full')).toBe(true);
    // distantInjured (dist 4, no staff has dist 4 in inventory)
    expect(targets.some((t) => t.unit.id === 'dist_injured')).toBe(false);
    // enemyUnit is enemy faction -> excluded
    expect(targets.some((t) => t.unit.id === 'enemy_pirate')).toBe(false);

    // Staves for adjacent injured: reaches by both Heal (rng 1) and Warp (rng 1)
    const stavesForAdj = getStavesForTarget(allUnits, lena, adjacentInjured, itemById, lena.unit.position);
    expect(stavesForAdj.length).toBe(2);
    expect(stavesForAdj.some((s) => s.id === 'heal_staff')).toBe(true);
    expect(stavesForAdj.some((s) => s.id === 'warp_staff')).toBe(true);
  });

  it('Attack Flow: Chọn địch trước, sau đó lọc vũ khí đánh tới ở khoảng cách đó', () => {
    const abel = makeUnit({
      unit: {
        id: 'abel',
        name: 'Abel',
        classId: 'cavalier',
        faction: 'player',
        position: { x: 5, y: 5 },
        mov: 7,
        moveType: 'cavalry',
        weaponRanks: { sword: 'E', lance: 'D' },
        isDead: false,
        hasActed: false,
      },
      inventory: [
        { itemId: 'iron_sword', uses: 40 },
        { itemId: 'javelin', uses: 25 },
      ],
    });

    const enemyClose = makeUnit({
      unit: { id: 'enemy_1', name: 'Enemy 1', classId: 'pirate', faction: 'enemy', position: { x: 5, y: 6 }, mov: 5, moveType: 'foot', isDead: false, hasActed: false },
    });

    const enemyRanged = makeUnit({
      unit: { id: 'enemy_2', name: 'Enemy 2', classId: 'hunter', faction: 'enemy', position: { x: 5, y: 7 }, mov: 5, moveType: 'foot', isDead: false, hasActed: false },
    });

    // Distance 1 can attack with Iron Sword and Javelin
    expect(canAttackAtDistance(abel, itemById, 1)).toBe(true);
    expect(canAttackAtDistance(abel, itemById, 2)).toBe(true);
    expect(canAttackAtDistance(abel, itemById, 3)).toBe(false);

    expect(enemyClose.unit.position.y - abel.unit.position.y).toBe(1);
    expect(enemyRanged.unit.position.y - abel.unit.position.y).toBe(2);

    // Usable weapons against close enemy (dist 1): Iron Sword (rng 1) and Javelin (rng 1-2)
    const distClose = 1;
    const weaponsClose = getAttackWeapons(abel, itemById).filter((w) => {
      const r = getAttackRange(abel.unit, w.definition);
      return distClose >= r.min && distClose <= r.max;
    });
    expect(weaponsClose.length).toBe(2);

    // Usable weapons against ranged enemy (dist 2): ONLY Javelin (rng 1-2)
    const distRanged = 2;
    const weaponsRanged = getAttackWeapons(abel, itemById).filter((w) => {
      const r = getAttackRange(abel.unit, w.definition);
      return distRanged >= r.min && distRanged <= r.max;
    });
    expect(weaponsRanged.length).toBe(1);
    expect(weaponsRanged[0]!.itemId).toBe('javelin');
  });

  it('Staff Execution: applyStaffUse cập nhật đúng máu, EXP và độ bền gậy', () => {
    const rng = new SeededRNG(42);
    const lena = makeUnit({
      unit: {
        id: 'lena',
        name: 'Lena',
        classId: 'cleric',
        faction: 'player',
        position: { x: 5, y: 5 },
        mov: 5,
        moveType: 'foot',
        weaponRanks: { staff: 'C' },
        isDead: false,
        hasActed: false,
      },
      stats: { hp: 16, maxHp: 16, str: 1, mag: 4, skill: 5, spd: 7, def: 3, res: 7, lck: 8 },
      inventory: [{ itemId: 'heal_staff', uses: 5 }],
    });

    const marth = makeUnit({
      unit: {
        id: 'marth',
        name: 'Marth',
        classId: 'lord',
        faction: 'player',
        position: { x: 5, y: 6 },
        mov: 5,
        moveType: 'foot',
        weaponRanks: { sword: 'D' },
        isDead: false,
        hasActed: false,
      },
      stats: { hp: 12, maxHp: 28, str: 5, mag: 0, skill: 3, spd: 7, def: 7, res: 0, lck: 7 },
    });

    const result = applyStaffUse([lena, marth], 'lena', 'marth', 'heal_staff', itemById, rng);
    expect(result).not.toBeNull();
    if (!result) return;

    const nextLena = result.units.find((u) => u.unit.id === 'lena')!;
    const nextMarth = result.units.find((u) => u.unit.id === 'marth')!;

    // Heal base=8 + floor(MAG=4 / 2) = 10 HP
    expect(result.healed).toBe(10);
    expect(nextMarth.stats.hp).toBe(22);
    expect(nextLena.inventory[0]!.uses).toBe(4);
    expect(nextLena.exp).toBeGreaterThan(0);
  });
});
