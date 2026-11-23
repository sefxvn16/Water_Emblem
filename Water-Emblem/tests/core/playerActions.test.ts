import { describe, it, expect } from 'vitest';
import { chapter01Data } from '../../src/core/data/chapterData';
import { SeededRNG } from '../../src/core/combat/rng';
import talysMapRaw from '../../data/maps/chapter_01_talys.json';
import itemsJson from '../../data/items.json';
import type { MapData } from '../../src/core/grid/types';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  attack,
  wait,
  useItem,
  mountOrDismount,
  cancelMove,
  type PlayerActionState,
} from '../../src/core/turn/playerActions';
import { getAttackRange } from '../../src/core/class/classRules';

describe('Player Actions Core (PLAN item 55)', () => {
  const mapData = talysMapRaw as MapData;
  const items = itemsJson.items as ItemDefinition[];
  const itemById = new Map(items.map((i) => [i.id, i]));

  function createBaseState(units: ExtendedUnitState[]): PlayerActionState {
    return {
      units,
      mapData,
      chapter: chapter01Data,
      gold: 1000,
      villageStates: { village_west: 'intact', village_east: 'intact' },
      chestStates: {},
      doorStates: {},
      dialogues: {},
      itemById,
      items,
    };
  }

  // 1. attack: HP mục tiêu giảm đúng, events có kết quả giao tranh, người đánh hasActed
  it('1. attack: target HP decreases, events has attack_resolved, attacker hasActed is true', () => {
    const units = structuredClone(chapter01Data.units);
    const marth = units.find((u) => u.unit.id === 'marth')!;
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;

    marth.unit.position = { x: 5, y: 5 };
    pirate.unit.position = { x: 5, y: 6 }; // distance 1

    const state = createBaseState([marth, pirate]);
    const rng = new SeededRNG(42);

    const initialDefenderHp = pirate.stats.hp;
    const result = attack(state, { attackerId: marth.unit.id, defenderId: pirate.unit.id }, rng);

    expect(result).not.toBeNull();
    if (!result) throw new Error('attack result was null');

    const updatedMarth = result.state.units.find((u) => u.unit.id === marth.unit.id)!;
    const updatedPirate = result.state.units.find((u) => u.unit.id === pirate.unit.id)!;

    // Attacker hasActed
    expect(updatedMarth.unit.hasActed).toBe(true);

    // Target HP reduced
    expect(updatedPirate.stats.hp).toBeLessThan(initialDefenderHp);

    // Events has attack_resolved
    const attackEv = result.events.find((e) => e.type === 'attack_resolved');
    expect(attackEv).toBeDefined();
    if (!attackEv || attackEv.type !== 'attack_resolved') throw new Error('attack_resolved event missing');
    expect(attackEv.attackerId).toBe(marth.unit.id);
    expect(attackEv.defenderId).toBe(pirate.unit.id);
    expect(attackEv.hpAfter.defender).toBe(updatedPirate.stats.hp);
  });

  // 2. attack trả null khi mục tiêu ngoài tầm vũ khí đang trang bị
  it('2. attack: returns null when target is outside equipped weapon range', () => {
    const units = structuredClone(chapter01Data.units);
    const marth = units.find((u) => u.unit.id === 'marth')!;
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;

    marth.unit.position = { x: 1, y: 1 };
    pirate.unit.position = { x: 10, y: 10 }; // distance 18 > 1

    const state = createBaseState([marth, pirate]);
    const rng = new SeededRNG(42);

    const result = attack(state, { attackerId: marth.unit.id, defenderId: pirate.unit.id }, rng);
    expect(result).toBeNull();
  });

  // 3. wait: hasActed thành true, không đổi gì khác
  it('3. wait: hasActed becomes true, nothing else changes', () => {
    const units = structuredClone(chapter01Data.units);
    const marth = units.find((u) => u.unit.id === 'marth')!;
    marth.unit.hasActed = false;

    const state = createBaseState([marth]);
    const result = wait(state, { unitId: marth.unit.id });

    expect(result).not.toBeNull();
    if (!result) throw new Error('wait result was null');

    const updatedMarth = result.state.units.find((u) => u.unit.id === marth.unit.id)!;
    expect(updatedMarth.unit.hasActed).toBe(true);

    // Everything else remains identical
    expect(updatedMarth.unit.position).toEqual(marth.unit.position);
    expect(updatedMarth.stats).toEqual(marth.stats);
    expect(updatedMarth.level).toBe(marth.level);
    expect(updatedMarth.inventory).toEqual(marth.inventory);
    expect(result.events).toEqual([]);
  });

  // 4. useItem: thuốc hồi đúng lượng, trừ lần dùng, hết lần thì món biến mất
  it('4. useItem: recovers HP, decrements uses, and removes item when uses reach 0', () => {
    const units = structuredClone(chapter01Data.units);
    const marth = units.find((u) => u.unit.id === 'marth')!;
    marth.stats.hp = 5;
    marth.stats.maxHp = 20;
    marth.inventory = [{ itemId: 'vulnerary', uses: 2 }];

    const state = createBaseState([marth]);
    const result1 = useItem(state, { unitId: marth.unit.id, itemId: 'vulnerary' });

    expect(result1).not.toBeNull();
    if (!result1) throw new Error('useItem result1 was null');

    const updated1 = result1.state.units.find((u) => u.unit.id === marth.unit.id)!;
    expect(updated1.stats.hp).toBe(15); // +10
    expect(updated1.unit.hasActed).toBe(true);
    expect(updated1.inventory).toEqual([{ itemId: 'vulnerary', uses: 1 }]);

    const itemEv = result1.events.find((e) => e.type === 'item_used');
    expect(itemEv).toBeDefined();
    if (!itemEv || itemEv.type !== 'item_used') throw new Error('item_used event missing');
    expect(itemEv.healAmount).toBe(10);
    expect(itemEv.itemId).toBe('vulnerary');

    // Use again when 1 use remaining: item should disappear
    const state2 = createBaseState([{ ...updated1, stats: { ...updated1.stats, hp: 8 }, unit: { ...updated1.unit, hasActed: false } }]);
    const result2 = useItem(state2, { unitId: marth.unit.id, itemId: 'vulnerary' });

    expect(result2).not.toBeNull();
    if (!result2) throw new Error('useItem result2 was null');

    const updated2 = result2.state.units.find((u) => u.unit.id === marth.unit.id)!;
    expect(updated2.stats.hp).toBe(18); // 8 + 10
    expect(updated2.inventory.find((i) => i.itemId === 'vulnerary')).toBeUndefined();
    expect(updated2.inventory.length).toBe(0);
  });

  // 5. mountOrDismount: chỉ số và tầm đánh đổi theo classRules, và trả null với class không lên/xuống ngựa được
  it('5. mountOrDismount: mobility and attack range change per classRules, returns null for non-mounted', () => {
    const units = structuredClone(chapter01Data.units);
    const jagen = units.find((u) => u.unit.id === 'jagen')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;

    // Mangudai has ground mount, uses bow (with override 2-2)
    const mangudaiUnit: ExtendedUnitState = {
      ...jagen,
      unit: {
        ...jagen.unit,
        id: 'test_mangudai',
        classId: 'mangudai',
        mountedClassId: undefined,
        moveType: 'cavalry',
        mov: 9,
      },
    };
    const bow = items.find((i) => i.id === 'iron_bow')!;
    const bowRangeMounted = getAttackRange(mangudaiUnit.unit, bow);
    expect(bowRangeMounted.min).toBe(2);
    expect(bowRangeMounted.max).toBe(2);

    const state = createBaseState([mangudaiUnit, marth]);
    const dismountResult = mountOrDismount(state, { unitId: 'test_mangudai' });

    expect(dismountResult).not.toBeNull();
    if (!dismountResult) throw new Error('dismountResult was null');

    const dismounted = dismountResult.state.units.find((u) => u.unit.id === 'test_mangudai')!;
    expect(dismounted.unit.classId).toBe('paladin');
    expect(dismounted.unit.moveType).toBe('foot');
    expect(dismounted.unit.mov).toBe(7);
    expect(dismounted.unit.mountedClassId).toBe('mangudai');
    expect(dismounted.unit.hasActed).toBe(false);

    // Range changes: Paladin cannot use Bow (weapon unusable, range max 0)
    const bowRangeDismounted = getAttackRange(dismounted.unit, bow);
    expect(bowRangeDismounted.max).toBe(0);

    // Remounting restores Mangudai mobility and attack range
    const remountResult = mountOrDismount(dismountResult.state, { unitId: 'test_mangudai' });
    expect(remountResult).not.toBeNull();
    const remounted = remountResult!.state.units.find((u) => u.unit.id === 'test_mangudai')!;
    expect(remounted.unit.classId).toBe('mangudai');
    expect(getAttackRange(remounted.unit, bow).max).toBe(2);

    // Marth is Lord (foot, not mounted): returns null
    const marthResult = mountOrDismount(state, { unitId: marth.unit.id });
    expect(marthResult).toBeNull();
  });

  // 6. cancelMove: quân về đúng ô ban đầu, không mất lượt
  it('6. cancelMove: unit returns to original tile without losing turn', () => {
    const units = structuredClone(chapter01Data.units);
    const marth = units.find((u) => u.unit.id === 'marth')!;
    const origin = { x: 2, y: 3 };
    marth.unit.position = { x: 8, y: 8 }; // moved to (8, 8)
    marth.unit.hasActed = false;

    const state = createBaseState([marth]);
    const result = cancelMove(state, { unitId: marth.unit.id, origin });

    expect(result).not.toBeNull();
    if (!result) throw new Error('cancelMove result was null');

    const cancelledMarth = result.state.units.find((u) => u.unit.id === marth.unit.id)!;
    expect(cancelledMarth.unit.position).toEqual(origin);
    expect(cancelledMarth.unit.hasActed).toBe(false);

    const moveEv = result.events.find((e) => e.type === 'unit_moved');
    expect(moveEv).toBeDefined();
    if (!moveEv || moveEv.type !== 'unit_moved') throw new Error('unit_moved event missing');
    expect(moveEv.from).toEqual({ x: 8, y: 8 });
    expect(moveEv.to).toEqual(origin);
  });

  // 7. Tính thuần: state truyền vào không bị sửa sau mỗi lời gọi (so sánh snapshot trước/sau)
  it('7. purity: input state is not mutated by any player action', () => {
    const units = structuredClone(chapter01Data.units);
    const marth = units.find((u) => u.unit.id === 'marth')!;
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const jagen = units.find((u) => u.unit.id === 'jagen')!;

    marth.unit.position = { x: 5, y: 5 };
    marth.stats.hp = 10;
    marth.inventory = [{ itemId: 'vulnerary', uses: 2 }];
    pirate.unit.position = { x: 5, y: 6 };

    const state = createBaseState([marth, pirate, jagen]);
    const snapshotBefore = JSON.stringify(state);
    const rng = new SeededRNG(99);

    // Call wait
    wait(state, { unitId: marth.unit.id });
    expect(JSON.stringify(state)).toBe(snapshotBefore);

    // Call cancelMove
    cancelMove(state, { unitId: marth.unit.id, origin: { x: 1, y: 1 } });
    expect(JSON.stringify(state)).toBe(snapshotBefore);

    // Call useItem
    useItem(state, { unitId: marth.unit.id, itemId: 'vulnerary' });
    expect(JSON.stringify(state)).toBe(snapshotBefore);

    // Call mountOrDismount
    mountOrDismount(state, { unitId: jagen.unit.id });
    expect(JSON.stringify(state)).toBe(snapshotBefore);

    // Call attack
    attack(state, { attackerId: marth.unit.id, defenderId: pirate.unit.id }, rng);
    expect(JSON.stringify(state)).toBe(snapshotBefore);
  });
});
