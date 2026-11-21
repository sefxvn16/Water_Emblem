import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

  describe('3. Mô tả chuẩn cho tất cả 40 class trong classes.json', () => {
    it('tất cả 40 class đều có description và descriptionVi phong phú', () => {
      const classes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'classes.json'), 'utf8'));
      const list = Array.isArray(classes) ? classes : classes.classes;
      expect(list.length).toBe(40);

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

  describe('6. Bảng màu Character Palettes cho 61 nhân vật', () => {
    it('character_palettes.json chứa đủ 61 nhân vật FE3 kèm offsets và file bin', () => {
      const palettes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'character_palettes.json'), 'utf8'));
      expect(Object.keys(palettes.characters).length).toBe(61);
      expect(palettes.characters.marth).toBeDefined();
      expect(palettes.characters.marth.variants.base.binFile).toContain('00_Marth.bin');
      expect(palettes.characters.sheeda.variants.mounted).toBeDefined();
      expect(palettes.characters.sheeda.variants.dismounted).toBeDefined();
      expect(palettes.characters.sheeda.variants.promoted).toBeDefined();
    });
  });
});
