// PLAN mục 204: thứ tự chiến dịch 44 chương và việc giữ đội hình khi sang chương kế tiếp.
import { describe, expect, it } from 'vitest';
import chapterObjectives from '../../data/chapter_objectives.json' with { type: 'json' };
import { chapters } from '../../src/core/data/chapterData';
import { CAMPAIGN_CHAPTER_IDS, nextCampaignChapterId } from '../../src/core/data/chapterRegistry';
import { carryUnitsToChapter, placeDeployedUnits } from '../../src/core/chapter/transition';

describe('campaign order (PLAN mục 204)', () => {
  it('lists all 44 chapters in Book 1 then Book 2 then Endgame order', () => {
    expect(CAMPAIGN_CHAPTER_IDS).toHaveLength(44);
    expect(CAMPAIGN_CHAPTER_IDS).toHaveLength(chapterObjectives.length);
    expect(CAMPAIGN_CHAPTER_IDS[0]).toBe('chapter_01');
    expect(CAMPAIGN_CHAPTER_IDS[19]).toBe('chapter_20');
    expect(CAMPAIGN_CHAPTER_IDS[20]).toBe('book2_chapter_01');
    expect(CAMPAIGN_CHAPTER_IDS.slice(-3)).toEqual(['book2_endgame_a', 'book2_endgame_b', 'book2_endgame_c']);
    // Thứ tự phải khớp bảng tra 44 điều kiện thắng, theo từng vị trí.
    CAMPAIGN_CHAPTER_IDS.forEach((chapterId, index) => {
      const row = chapterObjectives[index]!;
      const expectedBook = chapterId.startsWith('book2_') ? 2 : 1;
      expect(row.book, `${chapterId} ở vị trí ${index} lệch Book`).toBe(expectedBook);
    });
    // Mỗi id trong thứ tự phải có dữ liệu chương nạp được.
    for (const chapterId of CAMPAIGN_CHAPTER_IDS) {
      expect(chapters[chapterId], `thiếu dữ liệu chương ${chapterId}`).toBeDefined();
    }
  });

  it('advances from the last Book 1 chapter into Book 2 and stops after the final Endgame part', () => {
    expect(nextCampaignChapterId('chapter_01')).toBe('chapter_02');
    expect(nextCampaignChapterId('chapter_20')).toBe('book2_chapter_01');
    expect(nextCampaignChapterId('book2_chapter_21')).toBe('book2_endgame_a');
    expect(nextCampaignChapterId('book2_endgame_c')).toBeUndefined();
    expect(nextCampaignChapterId('test_chapter_01')).toBeUndefined();
  });

  it('carries the roster and its inventory from Book 1 chapter 20 into Book 2 chapter 1', () => {
    const source = chapters.chapter_20!;
    const target = chapters.book2_chapter_01!;
    const veterans = source.units
      .filter(({ unit }) => unit.faction === 'player')
      .map((entry) => ({
        ...entry,
        level: entry.level + 4,
        stats: { ...entry.stats, hp: Math.max(1, entry.stats.hp - 3) },
        inventory: [...entry.inventory, { itemId: 'vulnerary', uses: 3 }],
      }));
    expect(veterans.length).toBeGreaterThan(0);

    const carried = carryUnitsToChapter(veterans, target);
    for (const veteran of veterans) {
      const moved = carried.find(({ unit }) => unit.id === veteran.unit.id);
      if (!target.carryoverUnitIds.includes(veteran.unit.id)) continue;
      expect(moved, `${veteran.unit.id} không sang chương sau`).toBeDefined();
      expect(moved!.level, `${veteran.unit.id} mất level`).toBe(veteran.level);
      expect(moved!.stats.hp, `${veteran.unit.id} mất HP đã trừ`).toBe(veteran.stats.hp);
      expect(moved!.inventory.some((entry) => entry.itemId === 'vulnerary'),
        `${veteran.unit.id} mất đồ trong kho`).toBe(true);
    }

    // Đặt quân vào ô triển khai của chương mới không được ném lỗi thiếu ô.
    const placed = placeDeployedUnits(carried, target);
    const slots = new Set(target.deploymentSlots.map(({ x, y }) => `${x},${y}`));
    for (const entry of placed.filter(({ unit }) => unit.faction === 'player'
      && target.carryoverUnitIds.includes(unit.id))) {
      expect(slots.has(`${entry.unit.position.x},${entry.unit.position.y}`),
        `${entry.unit.id} không đứng trên ô triển khai của chương`).toBe(true);
    }
  });
});
