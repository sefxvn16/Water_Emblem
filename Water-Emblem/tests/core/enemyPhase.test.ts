import { describe, it, expect } from 'vitest';
import { runEnemyPhase, type EnemyPhaseContext } from '../../src/core/turn/enemyPhase';
import { chapter01Data } from '../../src/core/data/chapterData';
import { SeededRNG } from '../../src/core/combat/rng';
import talysMapRaw from '../../data/maps/chapter_01_talys.json';
import itemsJson from '../../data/items.json';
import type { MapData } from '../../src/core/grid/types';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

describe('runEnemyPhase module (PLAN items 54 + 196)', () => {
  const mapData = talysMapRaw as MapData;
  const items = itemsJson.items as ItemDefinition[];
  const itemById = new Map(items.map((i) => [i.id, i]));

  function createBaseContext(units: ExtendedUnitState[]): EnemyPhaseContext & { units: ExtendedUnitState[] } {
    return {
      mapData,
      chapter: chapter01Data,
      chapterObjective: chapter01Data.objective,
      items,
      itemById,
      dialogues: {},
      turnNumber: 1,
      openedDoors: new Set(),
      gold: 1000,
      villageStates: { village_west: 'intact', village_east: 'intact' },
      chestStates: {},
      spawnedReinforcements: [],
      units,
    };
  }

  // 1. Địch đánh quân ta: attack_resolved có đúng số đòn, trúng/trượt/crit và HP sau khớp state mới
  it('1. enemy attacks player unit: emits attack_resolved and matches post-combat HP', () => {
    const units = structuredClone(chapter01Data.units);
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;

    // Đặt pirate cạnh Marth
    pirate.unit.position = { x: marth.unit.position.x + 1, y: marth.unit.position.y };
    pirate.aiRole = 'pursue';
    pirate.openingMove = undefined;

    const testUnits = [pirate, marth];
    const context = createBaseContext(testUnits);
    const rng = new SeededRNG(42);

    const result = runEnemyPhase(context, rng);

    const attackEv = result.events.find((e) => e.type === 'attack_resolved');
    expect(attackEv).toBeDefined();
    if (!attackEv || attackEv.type !== 'attack_resolved') throw new Error('attack_resolved event missing');

    expect(attackEv.attackerId).toBe(pirate.unit.id);
    expect(attackEv.defenderId).toBe(marth.unit.id);
    expect(attackEv.strikes.length).toBeGreaterThan(0);

    const updatedPirate = result.state.units.find((u) => u.unit.id === pirate.unit.id)!;
    const updatedMarth = result.state.units.find((u) => u.unit.id === marth.unit.id)!;

    expect(attackEv.hpAfter.attacker).toBe(updatedPirate.stats.hp);
    expect(attackEv.hpAfter.defender).toBe(updatedMarth.stats.hp);
  });

  // 2. Quân ta chết trong lượt địch: có unit_died, quân đó isDead trong state mới
  it('2. player unit killed in enemy phase: emits unit_died and unit isDead in state', () => {
    const units = structuredClone(chapter01Data.units);
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const jagen = units.find((u) => u.unit.id === 'jagen')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;

    // Marth ở xa an toàn
    marth.unit.position = { x: 0, y: 0 };

    // Cho Jagen 1 HP, def 0 để chắc chắn chết khi pirate đánh
    jagen.stats.hp = 1;
    jagen.stats.def = 0;
    jagen.stats.spd = 0;
    jagen.stats.lck = 0;
    jagen.weapon = undefined;

    pirate.stats.str = 20;
    pirate.stats.skill = 30;
    pirate.unit.position = { x: jagen.unit.position.x + 1, y: jagen.unit.position.y };
    pirate.aiRole = 'pursue';
    pirate.openingMove = undefined;

    const testUnits = [pirate, jagen, marth];
    const context = createBaseContext(testUnits);
    const rng = new SeededRNG(42);

    const result = runEnemyPhase(context, rng);

    const diedEv = result.events.find((e) => e.type === 'unit_died');
    expect(diedEv).toBeDefined();
    if (!diedEv || diedEv.type !== 'unit_died') throw new Error('unit_died event missing');

    expect(diedEv.unitId).toBe(jagen.unit.id);
    expect(diedEv.faction).toBe('player');

    const updatedJagen = result.state.units.find((u) => u.unit.id === jagen.unit.id)!;
    expect(updatedJagen.unit.isDead).toBe(true);
    expect(updatedJagen.stats.hp).toBe(0);
  });

  // 3. Rơi đồ khi địch chết: có sự kiện nhận vật phẩm, món đó vào đúng nơi
  it('3. enemy drops item on death: emits item_gained and item is added to killer inventory', () => {
    const units = structuredClone(chapter01Data.units);
    const pirate = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;

    // Địch có 15 HP và mang dropItemId: 'vulnerary'
    pirate.dropItemId = 'vulnerary';
    pirate.stats.hp = 15;
    pirate.stats.maxHp = 15;
    pirate.stats.lck = 0;
    pirate.unit.position = { x: marth.unit.position.x + 1, y: marth.unit.position.y };
    pirate.aiRole = 'pursue';
    pirate.openingMove = undefined;

    // Marth có base damage 5 (< 15 HP của pirate nên pirate không sợ tự sát)
    // Nhưng Marth có Skill 200 cho Crit Rate 100%, phản đòn bạo kích 15 damage kết liễu pirate
    marth.stats.skill = 200;

    const testUnits = [pirate, marth];
    const context = createBaseContext(testUnits);
    const rng = new SeededRNG(42);

    const result = runEnemyPhase(context, rng);

    const itemEv = result.events.find((e) => e.type === 'item_gained' && e.source === 'loot');
    expect(itemEv).toBeDefined();
    if (!itemEv || itemEv.type !== 'item_gained') throw new Error('item_gained event missing');

    expect(itemEv.unitId).toBe(marth.unit.id);
    expect(itemEv.itemId).toBe('vulnerary');

    const updatedMarth = result.state.units.find((u) => u.unit.id === marth.unit.id)!;
    expect(updatedMarth.inventory.some((i) => i.itemId === 'vulnerary')).toBe(true);
  });

  // 4. Địch cướp làng: có village_destroyed, villageStates đổi đúng
  it('4. thief destroys village: emits village_destroyed and villageState becomes destroyed', () => {
    const units = structuredClone(chapter01Data.units);
    const thief = units.find((u) => u.unit.id === 'enemy_thief')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;
    const village = chapter01Data.villages![0]!; // village_west tại (3, 8)

    // Marth ở xa an toàn
    marth.unit.position = { x: 0, y: 0 };

    // Đặt thief ngay sát ô làng (4, 8) và có role pillage
    thief.unit.position = { x: village.position.x + 1, y: village.position.y };
    thief.aiRole = 'pillage';
    thief.openingMove = undefined;

    const testUnits = [thief, marth];
    const context = createBaseContext(testUnits);
    context.villageStates = { [village.id]: 'intact' };
    const rng = new SeededRNG(42);

    const result = runEnemyPhase(context, rng);

    const destroyedEv = result.events.find((e) => e.type === 'village_destroyed');
    expect(destroyedEv).toBeDefined();
    if (!destroyedEv || destroyedEv.type !== 'village_destroyed') throw new Error('village_destroyed event missing');

    expect(destroyedEv.villageId).toBe(village.id);
    expect(result.state.villageStates[village.id]).toBe('destroyed');
  });

  // 5. Chương kết thúc giữa lượt địch (Marth chết): có chapter_outcome với defeat, và vòng lượt dừng ngay
  it('5. Lord Marth killed mid-turn: emits chapter_outcome defeat and halts remaining enemy actions', () => {
    const units = structuredClone(chapter01Data.units);
    const pirate1 = units.find((u) => u.unit.id === 'enemy_pirate_1')!;
    const pirate2 = units.find((u) => u.unit.id === 'enemy_pirate_2')!;
    const marth = units.find((u) => u.unit.id === 'marth')!;

    // Marth có 1 HP, không có vũ khí
    marth.stats.hp = 1;
    marth.weapon = undefined;

    // Pirate 1 đứng cạnh Marth
    pirate1.unit.position = { x: marth.unit.position.x + 1, y: marth.unit.position.y };
    pirate1.aiRole = 'pursue';
    pirate1.openingMove = undefined;

    // Pirate 2 cũng đứng gần
    pirate2.unit.position = { x: marth.unit.position.x - 1, y: marth.unit.position.y };
    pirate2.aiRole = 'pursue';
    pirate2.openingMove = undefined;

    const testUnits = [pirate1, pirate2, marth];
    const context = createBaseContext(testUnits);
    const rng = new SeededRNG(42);

    const result = runEnemyPhase(context, rng);

    const outcomeEv = result.events.find((e) => e.type === 'chapter_outcome');
    expect(outcomeEv).toBeDefined();
    if (!outcomeEv || outcomeEv.type !== 'chapter_outcome') throw new Error('chapter_outcome event missing');

    expect(outcomeEv.outcome).toBe('defeat');
    expect(result.state.chapterOutcome).toBe('defeat');

    // Chỉ có pirate1 hành động và kết liễu Marth, pirate2 không được hành động vì lượt dừng ngay
    expect(result.steps.length).toBe(1);
    expect(result.steps[0]!.enemy.unit.id).toBe(pirate1.unit.id);
    const updatedPirate2 = result.state.units.find((u) => u.unit.id === pirate2.unit.id)!;
    expect(updatedPirate2.unit.hasActed).toBe(false);
  });

  // 6. Địch dùng vật phẩm hồi máu (item_use): HP tăng, lần dùng bị trừ, có item_used
  it('6. enemy uses healing item: emits item_used, recovers HP and deducts item uses', () => {
    const units = structuredClone(chapter01Data.units);
    const boss = units.find((u) => u.isBoss)!;

    // Boss bị mất máu (5/30 HP), mang Vulnerary
    boss.stats.hp = 5;
    boss.stats.maxHp = 30;
    boss.inventory = [{ itemId: 'vulnerary', uses: 3 }];
    boss.aiRole = 'stationary';
    boss.openingMove = undefined;

    // Đặt player ở xa để boss không attack được và ưu tiên tự heal
    const marth = units.find((u) => u.unit.id === 'marth')!;
    marth.unit.position = { x: 0, y: 0 };
    boss.unit.position = { x: 20, y: 20 };

    const testUnits = [boss, marth];
    const context = createBaseContext(testUnits);
    const rng = new SeededRNG(42);

    const result = runEnemyPhase(context, rng);

    const usedEv = result.events.find((e) => e.type === 'item_used');
    expect(usedEv).toBeDefined();
    if (!usedEv || usedEv.type !== 'item_used') throw new Error('item_used event missing');

    expect(usedEv.unitId).toBe(boss.unit.id);
    expect(usedEv.itemId).toBe('vulnerary');
    expect(usedEv.healAmount).toBe(10);

    const updatedBoss = result.state.units.find((u) => u.unit.id === boss.unit.id)!;
    expect(updatedBoss.stats.hp).toBe(15); // 5 + 10
    const itemInInv = updatedBoss.inventory.find((i) => i.itemId === 'vulnerary')!;
    expect(itemInInv.uses).toBe(2); // 3 - 1
  });
});
