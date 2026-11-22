import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import itemsJson from '../../data/items.json';
import objectivesJson from '../../data/chapter_objectives.json';
import ch01Dialogues from '../../data/dialogues/chapter_01_dialogues.json';
import ch02Dialogues from '../../data/dialogues/chapter_02_dialogues.json';
import { chapter01Data, chapter02Data, chapter03Data, type ChapterData } from '../../src/core/data/chapterData';
import { evaluateChapterOutcome } from '../../src/core/chapter/types';
import {
  bossStartEvent, recruit, resolveDefeat, visitVillage, type ChapterState,
} from '../../src/core/chapter/events';

const DATA_DIR = path.resolve(__dirname, '../../data');

describe('Tích hợp dữ liệu FE3 chuẩn xác và toàn vẹn', () => {
  describe('1. Chuẩn hóa Hội thoại Chapter 1, 2, 3 theo FE3 gốc', () => {
    it('Chương 1 có đủ opening, ending, villages, non-lord refusal và boss quotes chuẩn FE3', () => {
      const ch1 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dialogues/chapter_01_dialogues.json'), 'utf8'));
      expect(ch1.chapterId).toBe('chapter_01');
      expect(ch1.opening.length).toBeGreaterThanOrEqual(4);
      expect(ch1.opening[0].speaker).toBe('Jagen');
      expect(ch1.opening[0].text).toContain('Caeda has come from Talys Castle');
      expect(ch1.opening[2].text).toContain('Galder pirates suddenly attacked us');

      expect(ch1.ending.length).toBeGreaterThanOrEqual(4);
      expect(ch1.ending[0].speaker).toBe('King Mostyn');
      expect(ch1.ending[1].text).toContain('Captain Ogma');

      expect(ch1.villages.village_west[0].text).toContain('5000 gold');
      expect(ch1.villages.village_non_lord[0].text).toContain('village is waiting for you with its gates open');

      expect(ch1.boss_gazzak.startCombat).toContain('What? The Altean army!?');
      expect(ch1.boss_gazzak.death).toContain('Guh... defeated');
    });

    it('Chương 2 có chiêu mộ Castor, làng giải cứu Lena và Boss Gomer chuẩn FE3', () => {
      const ch2 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dialogues/chapter_02_dialogues.json'), 'utf8'));
      expect(ch2.chapterId).toBe('chapter_02');
      expect(ch2.opening[0].speaker).toBe('Ogma');
      expect(ch2.opening[0].text).toContain('mercenary of Talys');

      expect(ch2.recruit_castor.length).toBeGreaterThanOrEqual(4);
      expect(ch2.recruit_castor[0].text).toContain("Castor!? You're Castor!");
      expect(ch2.recruit_castor[1].text).toContain('My mother is ill');

      expect(ch2.villages.village_center[0].text).toContain('Sister Lena');
      expect(ch2.villages.village_center[0].text).toContain('3000 Gold');

      expect(ch2.boss_gomer.startCombat).toContain('Don\'t underestimate the Galder pirates');
      expect(ch2.ending[1].text).toContain('Soothsires on Devil Mountain');
    });

    it('Chương 3 có màn đào thoát của Julian & Lena, chiêu mộ Navarre, làng Rìu Quỷ chuẩn FE3', () => {
      const ch3 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dialogues/chapter_03_dialogues.json'), 'utf8'));
      expect(ch3.chapterId).toBe('chapter_03');
      expect(ch3.opening[0].speaker).toBe('Julian');
      expect(ch3.opening[0].text).toContain('Sister Lena!');
      expect(ch3.opening[1].text).toContain('Mend staff');

      expect(ch3.recruit_navarre.length).toBeGreaterThanOrEqual(4);
      expect(ch3.recruit_navarre[0].speaker).toBe('Caeda');
      expect(ch3.recruit_navarre[0].text).toContain('Swordfighter Navarre!');
      expect(ch3.recruit_navarre[3].text).toContain('not strike a woman down');

      expect(ch3.villages.village_devil_axe[0].text).toContain('Devil Axe');
      expect(ch3.boss_hyman.startCombat).toContain('So you guys want to die?');
      expect(ch3.ending[0].text).toContain('10000 Gold');
    });
  });

  describe('2. Dẫn chuyện World Map và Mở màn Book 1 / Book 2', () => {
    it('prologues.json có lời dẫn chuyện Book 1 và Book 2', () => {
      const prologues = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'prologues.json'), 'utf8'));
      expect(prologues.book1.title).toBe('Book 1: War of Darkness');
      expect(prologues.book1.paragraphs.length).toBeGreaterThanOrEqual(8);
      expect(prologues.book1.paragraphs[0]).toContain('Medeus');

      expect(prologues.book2.title).toBe('Book 2: War of Heroes');
      expect(prologues.book2.paragraphs.length).toBeGreaterThanOrEqual(5);
      expect(prologues.book2.paragraphs[3]).toContain('Hardin');
    });

    it('world_map.json chứa dẫn chuyện đầy đủ cho 42+ chương FE3', () => {
      const wm = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'world_map.json'), 'utf8'));
      expect(wm.chapterNarrations).toBeDefined();
      expect(Object.keys(wm.chapterNarrations).length).toBeGreaterThanOrEqual(42);
      expect(wm.chapterNarrations.chapter_01.length).toBeGreaterThan(0);
      expect(wm.chapterNarrations.b1_ch01.length).toBeGreaterThan(0);
      expect(wm.chapterNarrations.b2_ch01.length).toBeGreaterThan(0);
      expect(wm.chapterNarrations.b1_ch01[0]).toContain('Prince Marth of Altea');
    });
  });

  describe('3. Mô tả chuẩn cho mọi class trong classes.json', () => {
    it('mọi class đều có description và descriptionVi phong phú, và catalog đủ cho dữ liệu nhân vật', () => {
      const classes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'classes.json'), 'utf8'));
      const list = Array.isArray(classes) ? classes : classes.classes;
      // Chủ dự án 2026-11-22: "số class không giới hạn, miễn đủ là được" — mục 203 thêm 6 class chỉ
      // có ở hàng địch. Thay con số chụp hiện trạng bằng phép kiểm "đủ": mọi classId mà
      // characters.json tham chiếu đều phải có trong catalog.
      expect(list.length).toBeGreaterThanOrEqual(40);
      const classIds = new Set(list.map((cls: { id: string }) => cls.id));
      const characters = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'characters.json'), 'utf8'));
      for (const character of characters.characters as { id: string; classId: string }[]) {
        expect(classIds.has(character.classId),
          `Nhân vật ${character.id} dùng class ${character.classId} chưa có trong classes.json`).toBe(true);
      }

      for (const cls of list) {
        expect(cls.description, `Class ${cls.id} missing description`).toBeDefined();
        expect(cls.descriptionVi, `Class ${cls.id} missing descriptionVi`).toBeDefined();
        expect(cls.description.length).toBeGreaterThan(15);
        expect(cls.descriptionVi.length).toBeGreaterThan(15);
      }

      // Kiểm tra class gốc
      const lord = list.find((c: { id: string }) => c.id === 'lord');
      expect(lord.description).toContain('Marth');

      // Kiểm tra class mới thêm
      const warlord = list.find((c: { id: string }) => c.id === 'warlord');
      expect(warlord.description).toContain('Promoted Lord');

      const trickster = list.find((c: { id: string }) => c.id === 'trickster');
      expect(trickster.description).toContain('Promoted Thieves');
    });
  });

  describe('4. Bảng tra cứu điều kiện thắng 44 chương chuẩn FE3', () => {
    it('chapter_objectives.json có đủ 44 chương với mục tiêu chuẩn xác', () => {
      const objectives = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'chapter_objectives.json'), 'utf8'));
      expect(objectives.length).toBe(44);

      // Book 1 Ch 1: Seize castle
      expect(objectives[0].chapterKey).toBe('b1_ch01');
      expect(objectives[0].objectiveType).toBe('seize_castle');

      // Book 1 Ch 5: Seize throne
      expect(objectives[4].chapterKey).toBe('b1_ch05');
      expect(objectives[4].objectiveType).toBe('seize_throne');

      // Book 2 Final Chapter: Defeat Medeus & Seize throne
      expect(objectives[43].chapterKey).toBe('b2_ch24');
      expect(objectives[43].objectiveType).toBe('defeat_boss_and_seize');
    });
  });

  describe('5. Kịch bản Đấu trường và Cửa hàng', () => {
    it('shopping.json có kịch bản đầy đủ cho armory, vendor, secretShop', () => {
      const shop = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dialogues/shopping.json'), 'utf8'));
      expect(shop.armory.welcome).toBe('This is the armory.');
      expect(shop.armory.priceQuote).toContain('{gold}');
      expect(shop.armory.sendToStorage).toBeDefined();
      expect(shop.vendor.welcome).toBe('This is a vendor.');
      expect(shop.secretShop.welcome).toBe('This is a secret shop.');
    });

    it('arena.json có kịch bản đầy đủ cho đấu trường', () => {
      const arena = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dialogues/arena.json'), 'utf8'));
      expect(arena.welcomePrompt).toContain('{gold}');
      expect(arena.matchRules).toContain('{level}');
      expect(arena.victory).toContain('{gold}');
      expect(arena.surrender).toBeDefined();
      expect(arena.defeat).toBeDefined();
    });
  });

  describe('6. Bảng màu Character Palettes cho nhân vật trong game', () => {
    it('character_palettes.json chứa đủ palettes cho các nhân vật FE3 kèm offsets và file bin', () => {
      const palettes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'character_palettes.json'), 'utf8'));
      expect(Object.keys(palettes.characters).length).toBe(18);
      expect(palettes.characters.marth).toBeDefined();
      expect(palettes.characters.marth.variants.base.binFile).toContain('00_Marth.bin');
      expect(palettes.characters.caeda.variants.mounted).toBeDefined();
      expect(palettes.characters.caeda.variants.dismounted).toBeDefined();
      expect(palettes.characters.caeda.variants.promoted).toBeDefined();
    });
  });
});

/**
 * PLAN item 201, for item 178. The ten tests above read a data file and then
 * assert the content of that same file, so they hold whether or not the game
 * can reach any of it. These drive the FE3 tables through the core functions
 * that consume them - recruitment, village visits, boss lines, the chapter
 * objective table - and assert the events and state those functions return.
 * Each one is also run against an empty dialogue table, so a passing
 * assertion can only come from the committed FE3 data, never from the code.
 */
describe('FE3 dialogue and objective tables decide what core events carry (PLAN item 201)', () => {
  const items = itemsJson.items;

  const stateOf = (chapter: ChapterData, gold = 0): ChapterState => ({
    units: structuredClone(chapter.units), gold, villageStates: {},
  });

  const place = (state: ChapterState, id: string, x: number, y: number): ChapterState => ({
    ...state,
    units: state.units.map((entry) => (entry.unit.id === id
      ? { ...entry, unit: { ...entry.unit, position: { x, y } } }
      : entry)),
  });

  it('turns Castor from enemy to ally and carries the chapter 2 FE3 recruit script in the event', () => {
    const base = stateOf(chapter02Data);
    const withCastor: ChapterState = {
      ...base,
      units: [...base.units, ...structuredClone(chapter02Data.optionalUnits)],
    };
    expect(withCastor.units.find(({ unit }) => unit.id === 'castor')?.unit.faction).toBe('enemy');

    // Caeda has to stand next to him: the chapter rule's maxDistance is 1.
    const adjacent = place(place(withCastor, 'castor', 5, 4), 'caeda', 5, 5);
    const result = recruit(adjacent, 'caeda', 'castor', chapter02Data, ch02Dialogues);

    expect(result.state.units.find(({ unit }) => unit.id === 'castor')?.unit.faction).toBe('player');
    expect(result.state.units.find(({ unit }) => unit.id === 'castor')?.aiRole).toBeUndefined();
    const dialogue = result.events.find((event) => event.type === 'dialogue');
    if (dialogue?.type !== 'dialogue') throw new Error('expected a dialogue event');
    expect(dialogue.kind).toBe('recruit');
    // The script itself, as the event hands it to the UI.
    expect(dialogue.lines.length).toBeGreaterThanOrEqual(4);
    expect(dialogue.lines[0]!.speaker).toBe('Caeda');
    expect(dialogue.lines.some(({ speaker }) => speaker === 'Castor')).toBe(true);
    expect(dialogue.lines.map(({ text }) => text).join(' ')).toContain('mother');

    // Without the table the recruit still happens but speaks nothing, so the
    // lines above can only have come out of chapter_02_dialogues.json.
    const bare = recruit(adjacent, 'caeda', 'castor', chapter02Data, {});
    expect(bare.events.map(({ type }) => type)).toEqual(['unit_recruited']);
    // Pure function: the input state keeps Castor hostile.
    expect(adjacent.units.find(({ unit }) => unit.id === 'castor')?.unit.faction).toBe('enemy');
  });

  it('pays the chapter 1 village rewards and speaks each village its own FE3 line', () => {
    const west = chapter01Data.villages!.find(({ id }) => id === 'village_west')!;
    const east = chapter01Data.villages!.find(({ id }) => id === 'village_east')!;
    const lord = chapter01Data.lordUnitId;

    const eastVisit = visitVillage(stateOf(chapter01Data, 100), lord, east, items, ch01Dialogues);
    expect(eastVisit.state.gold).toBe(100 + 5000);
    expect(eastVisit.state.villageStates['village_east']).toBe('visited');
    const eastLines = eastVisit.events.find((event) => event.type === 'dialogue');
    if (eastLines?.type !== 'dialogue') throw new Error('expected a dialogue event');
    expect(eastLines.lines[0]!.speaker).toBe('Talys Elder');
    expect(eastLines.lines[0]!.text).toContain('5000 gold');

    const westVisit = visitVillage(stateOf(chapter01Data), lord, west, items, ch01Dialogues);
    const westLines = westVisit.events.find((event) => event.type === 'dialogue');
    if (westLines?.type !== 'dialogue') throw new Error('expected a dialogue event');
    // The west village pays its Vulnerary rather than gold.
    expect(westVisit.state.gold).toBe(0);
    expect(westVisit.events).toContainEqual(
      expect.objectContaining({ type: 'item_gained', itemId: 'vulnerary', source: 'village' }),
    );
    expect(westLines.lines[0]!.speaker).toBe('Talys Elder');

    // With no table at all the visit falls back to the shared default line,
    // which is how we know the two above came from the chapter's own file.
    const fallback = visitVillage(stateOf(chapter01Data), lord, east, items, {});
    const fallbackLines = fallback.events.find((event) => event.type === 'dialogue');
    if (fallbackLines?.type !== 'dialogue') throw new Error('expected a dialogue event');
    expect(fallbackLines.lines[0]!.text).not.toContain('5000 gold');
  });

  it('speaks the FE3 boss quote when Gazzak engages and his death line when he falls', () => {
    const start = bossStartEvent(ch01Dialogues, 'gazzak', 'Gazzak');
    if (start?.type !== 'dialogue') throw new Error('expected a dialogue event');
    expect(start.kind).toBe('boss_start');
    expect(start.lines[0]!.speaker).toBe('Gazzak');
    expect(start.lines[0]!.text).toContain('Altean army');
    // No table, no quote: the text is data, not a string in the code.
    expect(bossStartEvent({}, 'gazzak', 'Gazzak')).toBeUndefined();

    const state = stateOf(chapter01Data);
    const fallen = resolveDefeat(state, 'gazzak', chapter01Data.lordUnitId, items, ch01Dialogues);
    const death = fallen.events.find((event) => event.type === 'dialogue');
    if (death?.type !== 'dialogue') throw new Error('expected a dialogue event');
    expect(death.kind).toBe('boss_death');
    expect(death.lines[0]!.text).toContain('defeated');
    expect(resolveDefeat(state, 'gazzak', chapter01Data.lordUnitId, items, {})
      .events.some((event) => event.type === 'dialogue')).toBe(false);
  });

  it('plays chapters 1-3 to the win condition their row of the 44-chapter objective table names', () => {
    const rowFor = (key: string) => {
      const row = objectivesJson.find((entry) => entry.chapterKey === key);
      if (!row) throw new Error(`no objective row for ${key}`);
      return row;
    };

    const cases = [
      { key: 'b1_ch01', chapter: chapter01Data },
      { key: 'b1_ch02', chapter: chapter02Data },
      { key: 'b1_ch03', chapter: chapter03Data },
    ] as const;

    for (const { key, chapter } of cases) {
      // The lookup table says every one of these is seized, not routed.
      expect(rowFor(key).objectiveType).toBe('seize_castle');
      expect(chapter.objective.type).toBe('seize');

      const tile = chapter.objective.seizeTargetTile;
      if (!tile) throw new Error(`${key} declares no seize tile`);
      const units = structuredClone(chapter.units).map(({ unit }) => unit);
      const enemiesDown = units.map((unit) => (unit.faction === 'enemy' ? { ...unit, isDead: true } : unit));
      // Killing every enemy is not the win condition here, wherever the lord
      // stands: this chapter is seized.
      expect(evaluateChapterOutcome(enemiesDown, chapter.objective, true, chapter.lordUnitId)).toBe('ongoing');
      const lordOnTile = enemiesDown.map((unit) => (unit.id === chapter.lordUnitId
        ? { ...unit, position: { x: tile.x, y: tile.y } } : unit));
      // On the gate tile but without the Seize command it is still not won.
      expect(evaluateChapterOutcome(lordOnTile, chapter.objective, false, chapter.lordUnitId)).toBe('ongoing');
      expect(evaluateChapterOutcome(lordOnTile, chapter.objective, true, chapter.lordUnitId)).toBe('victory');
      // And the lord falling loses it however many enemies are down.
      const lordDown = lordOnTile.map((unit) => (unit.id === chapter.lordUnitId ? { ...unit, isDead: true } : unit));
      expect(evaluateChapterOutcome(lordDown, chapter.objective, true, chapter.lordUnitId)).toBe('defeat');
    }
  });
});
