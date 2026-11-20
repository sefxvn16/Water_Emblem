import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadChapterData } from '../../src/core/data/chapterData';
import type { MapData } from '../../src/core/grid/types';
import type { ItemDefinition } from '../../src/core/combat/types';

const WE = path.resolve(__dirname, '../..');

const talysChapterJson = JSON.parse(fs.readFileSync(path.join(WE, 'data/chapters/chapter_01_talys.json'), 'utf8'));
const devilMtnChapterJson = JSON.parse(fs.readFileSync(path.join(WE, 'data/chapters/chapter_03_devil_mountain.json'), 'utf8'));
const talysMapJson = JSON.parse(fs.readFileSync(path.join(WE, 'data/maps/chapter_01_talys.json'), 'utf8'));
const devilMtnMapJson = JSON.parse(fs.readFileSync(path.join(WE, 'data/maps/chapter_03_devil_mountain.json'), 'utf8'));
const itemsJson = JSON.parse(fs.readFileSync(path.join(WE, 'data/items.json'), 'utf8'));
const charactersJson = JSON.parse(fs.readFileSync(path.join(WE, 'data/characters.json'), 'utf8'));

describe('Rà soát nguồn FE3 Book 1 Chương 1–3 (Báo cáo 2026-11-21)', () => {
  it('khớp thưởng chiếm cổng, trang bị khởi đầu, cấp quân địch và scripted opening move theo FE3', () => {
    // 1. Thưởng chiếm cổng Chương 3: 10.000G
    expect(devilMtnChapterJson.seizeReward).toEqual({ type: 'gold', amount: 10000 });

    const ch3 = loadChapterData(devilMtnChapterJson, devilMtnMapJson as MapData, itemsJson.items as ItemDefinition[]);
    expect(ch3.seizeReward).toEqual({ type: 'gold', amount: 10000 });

    // 2. Vật phẩm khởi đầu của nhân vật trong characters.json
    const charMap = new Map<string, { id: string; startingWeapons?: string[] }>(
      charactersJson.characters.map((c: { id: string; startingWeapons?: string[] }) => [c.id, c])
    );
    expect(charMap.get('marth')?.startingWeapons).toEqual(['rapier', 'vulnerary']);
    expect(charMap.get('abel')?.startingWeapons).toEqual(['iron_sword', 'javelin']);
    expect(charMap.get('gordin')?.startingWeapons).toEqual(['iron_bow', 'steel_bow']);
    expect(charMap.get('lena')?.startingWeapons).toEqual(['warp_staff']);

    // 3. Phân bố cấp quân Chương 3: 2 Bandit cấp 3, 1 Hunter cấp 3
    const ch3Units = ch3.units.map((u) => u);
    const guards = ch3Units.filter((u) => u.unit.id === 'samsoian_guard_1' || u.unit.id === 'samsoian_guard_2');
    expect(guards.length).toBe(2);
    for (const g of guards) {
      expect(g.level).toBe(3);
    }
    const hunter3 = ch3Units.find((u) => u.unit.id === 'enemy_hunter_3');
    expect(hunter3?.level).toBe(3);

    // 4. Chương 1: Scripted opening move cho Gazzak và 2 Pirate nam Gate
    const ch1 = loadChapterData(talysChapterJson, talysMapJson as MapData, itemsJson.items as ItemDefinition[]);
    const gazzak = ch1.units.find((u) => u.unit.id === 'gazzak');
    expect(gazzak).toBeDefined();
    expect(gazzak?.openingMove).toEqual({
      targetPosition: { x: 4, y: 4 },
      nextAiRole: 'stationary',
      turn: 1,
    });
  });
});
