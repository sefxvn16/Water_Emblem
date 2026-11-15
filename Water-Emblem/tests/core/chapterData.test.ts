import { describe, expect, it } from 'vitest';
import chapterJson from '../../data/chapters/test_chapter_01.json';
import mapJson from '../../data/maps/test_map_01.json';
import talysChapterJson from '../../data/chapters/chapter_01_talys.json';
import talysMapJson from '../../data/maps/chapter_01_talys.json';
import galderChapterJson from '../../data/chapters/chapter_02_galder.json';
import galderMapJson from '../../data/maps/chapter_02_galder.json';
import devilMountainChapterJson from '../../data/chapters/chapter_03_devil_mountain.json';
import devilMountainMapJson from '../../data/maps/chapter_03_devil_mountain.json';
import itemsJson from '../../data/items.json';
import charactersJson from '../../data/characters.json';
import classesJson from '../../data/classes.json';
import { initialChapterData, loadChapterData } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';
import type { MapData } from '../../src/core/grid/types';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';

const load = (chapter: unknown) => loadChapterData(chapter, mapJson as MapData, itemsJson.items as ItemDefinition[]);
const copyChapter = () => JSON.parse(JSON.stringify(chapterJson)) as Record<string, unknown>;

function hasFootRoute(map: MapData, start: { x: number; y: number }, target: { x: number; y: number }): boolean {
  const queue = [start];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const x = current.x + dx;
      const y = current.y + dy;
      const terrain = map.grid[y]?.[x];
      if (terrain && defaultTerrainRegistry.getMovementCost(terrain, 'foot') !== null) {
        queue.push({ x, y });
      }
    }
  }
  return visited.has(`${target.x},${target.y}`);
}

describe('chapter data', () => {
  it('keeps Navarre in FE3 Mercenary class with FE11-derived Mercenary stats and growth', () => {
    const navarre = charactersJson.characters.find((character) => character.id === 'navarre');
    expect(navarre?.classId).toBe('mercenary');
    expect(navarre?.baseStats).toEqual({ hp: 19, str: 6, mag: 0, skill: 8, spd: 10, lck: 8, def: 7, res: 0 });
    expect(navarre?.growths).toEqual({ hp: 100, str: 40, mag: 0, skill: 45, spd: 45, lck: 40, def: 10, res: 0 });
  });

  it('loads prototype Chapter 1 Talys 30x13 map and units successfully', () => {
    const talysChapter = loadChapterData(
      talysChapterJson,
      talysMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(talysChapter.id).toBe('chapter_01');
    expect(talysChapter.mapId).toBe('chapter_01_talys');
    expect(talysChapter.units.length).toBe(21);
    const players = talysChapter.units.filter((u) => u.unit.faction === 'player');
    const enemies = talysChapter.units.filter((u) => u.unit.faction === 'enemy');
    expect(players.length).toBe(7);
    expect(enemies.length).toBe(14);
    const marth = talysChapter.units.find((u) => u.unit.id === 'marth');
    expect(marth?.unit.position).toEqual({ x: 24, y: 5 });
    const gazzak = talysChapter.units.find((u) => u.unit.id === 'gazzak');
    expect(gazzak?.unit.position).toEqual({ x: 4, y: 4 });
    const pirateLv3 = talysChapter.units.find((u) => u.unit.id === 'enemy_pirate_4');
    expect(pirateLv3?.level).toBe(3);
    expect(pirateLv3?.unit.position).toEqual({ x: 4, y: 1 });
  });

  it('has traversable foot routes from Marth to both chapter gates', () => {
    expect(hasFootRoute(talysMapJson as MapData, { x: 24, y: 5 }, { x: 4, y: 4 })).toBe(true);
    expect(hasFootRoute(galderMapJson as MapData, { x: 23, y: 9 }, { x: 1, y: 1 })).toBe(true);
  });

  it('loads prototype Chapter 2 Galder 30x13 map, Ogma group and Gomer boss', () => {
    const galderChapter = loadChapterData(
      galderChapterJson,
      galderMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(galderChapter.id).toBe('chapter_02');
    expect(galderChapter.mapId).toBe('chapter_02_galder');
    expect(galderChapter.units.length).toBeGreaterThanOrEqual(15);
    const ogma = galderChapter.units.find((u) => u.unit.id === 'ogma');
    expect(ogma?.unit.position).toEqual({ x: 14, y: 2 });
    expect(ogma?.weapon.id).toBe('iron_sword');
    expect(ogma?.unit.moveType).toBe('foot');
    const gomer = galderChapter.units.find((u) => u.unit.id === 'gomer');
    expect(gomer?.unit.position).toEqual({ x: 1, y: 1 });
    expect(gomer?.weapon.id).toBe('hand_axe');
    expect(galderChapter.objective.seizeTargetTile).toEqual({ x: 1, y: 1 });
  });

  it('loads referenced units, weapons and objective', () => {
    expect(initialChapterData.units).toHaveLength(21);
    expect(initialChapterData.units[0]?.weapon.id).toBe('rapier');
    expect(initialChapterData.units[0]?.inventory).toEqual([
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
    ]);
    expect(initialChapterData.objective.seizeTargetTile).toEqual({ x: 4, y: 4 });
  });

  it('includes an equipped weapon missing from the character starting loadout', () => {
    const chapter = copyChapter();
    const units = chapter.units as Record<string, unknown>[];
    units[0]!.weaponId = 'steel_sword';
    const marth = load(chapter).units.find((entry) => entry.unit.id === 'marth');
    expect(marth?.inventory).toContainEqual({ itemId: 'steel_sword', uses: 35 });
  });

  it('rejects an unknown character starting item', () => {
    const characters = structuredClone(charactersJson);
    characters.characters[0]!.startingWeapons = ['missing_item'];
    expect(() => loadChapterData(chapterJson, mapJson as MapData, itemsJson.items as ItemDefinition[], characters, classesJson))
      .toThrow('invalid starting item');
  });

  it('rejects an unknown weapon reference', () => {
    const chapter = copyChapter();
    const units = chapter.units as Record<string, unknown>[];
    units[0]!.weaponId = 'missing_item';
    expect(() => load(chapter)).toThrow('unknown weapon');
  });

  it('rejects duplicate unit IDs and out-of-map positions', () => {
    const duplicate = copyChapter();
    const duplicateUnits = duplicate.units as Record<string, unknown>[];
    duplicateUnits[1]!.id = 'marth';
    expect(() => load(duplicate)).toThrow('Duplicate unit ID');

    const outOfBounds = copyChapter();
    const units = outOfBounds.units as Record<string, unknown>[];
    units[0]!.position = { x: 99, y: 1 };
    expect(() => load(outOfBounds)).toThrow('outside map');
  });

  it('rejects malformed growth rates', () => {
    const characters = structuredClone(charactersJson);
    const growths = characters.characters[0]!.growths;
    growths.hp = 256;
    expect(() => loadChapterData(chapterJson, mapJson as MapData, itemsJson.items as ItemDefinition[], characters, classesJson))
      .toThrow('growths.hp exceeds 255');
  });

  it('resolves character and class data without duplicating chapter stats', () => {
    const chapter = copyChapter();
    const units = chapter.units as Record<string, unknown>[];
    expect(units[0]).not.toHaveProperty('stats');
    expect(units[0]).not.toHaveProperty('moveType');
    const marth = load(chapter).units.find((entry) => entry.unit.id === 'marth');
    expect(marth?.stats.maxHp).toBe(charactersJson.characters[0]?.baseStats.hp);
    expect(marth?.unit.moveType).toBe('foot');

    units[0]!.characterId = 'missing_character';
    expect(() => load(chapter)).toThrow('unknown character');
  });

  it('validates optional units and recruitable enemy IDs', () => {
    expect(initialChapterData.optionalUnits).toEqual([]);
    const duplicate = JSON.parse(JSON.stringify(talysChapterJson)) as Record<string, unknown>;
    duplicate.optionalUnits = [{ id: 'marth', characterId: 'marth', faction: 'player', position: { x: 0, y: 0 }, weaponId: 'rapier' }];
    expect(() => loadChapterData(duplicate, talysMapJson as MapData, itemsJson.items as ItemDefinition[]))
      .toThrow('Duplicate unit ID');

    const invalidRecruit = JSON.parse(JSON.stringify(galderChapterJson)) as Record<string, unknown>;
    invalidRecruit.recruitments = [{ speakerUnitId: 'marth', targetUnitId: 'marth', maxDistance: 1 }];
    expect(() => loadChapterData(invalidRecruit, galderMapJson as MapData, itemsJson.items as ItemDefinition[]))
      .toThrow('Recruitment must reference');
  });

  it('loads Chapter 2 Galder 30x15 map, 17 enemies, 11 players, village and recruitment', () => {
    const galderChapter = loadChapterData(
      galderChapterJson,
      galderMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(galderChapter.id).toBe('chapter_02');
    expect(galderChapter.mapId).toBe('chapter_02_galder');
    expect(galderChapter.units.length).toBe(28);
    const players = galderChapter.units.filter((u) => u.unit.faction === 'player');
    const enemies = galderChapter.units.filter((u) => u.unit.faction === 'enemy');
    expect(players.length).toBe(11);
    expect(enemies.length).toBe(17);

    // 2 Grust Cavaliers (Social Knights)
    const cavaliers = galderChapter.units.filter((u) => u.unit.id.startsWith('grust_cavalier'));
    expect(cavaliers.length).toBe(2);
    expect(cavaliers[0]?.level).toBe(3);
    expect(cavaliers[0]?.weapon.id).toBe('iron_lance');

    // 2 Thieves
    const thieves = galderChapter.units.filter((u) => u.unit.id.includes('thief'));
    expect(thieves.length).toBe(2);

    // 1 Pirate Lv3
    const pirateLv3 = galderChapter.units.find((u) => u.unit.id === 'galder_pirate_1');
    expect(pirateLv3?.level).toBe(3);
    expect(pirateLv3?.weapon.id).toBe('hand_axe');

    // Boss Gomer
    const gomer = galderChapter.units.find((u) => u.unit.id === 'gomer');
    expect(gomer?.unit.position).toEqual({ x: 1, y: 1 });
    expect(gomer?.isBoss).toBe(true);
    expect(gomer?.weapon.id).toBe('hand_axe');
    expect(gomer?.dropItemId).toBe('steel_sword');

    // Recruitable Castor
    const castor = galderChapter.units.find((u) => u.unit.id === 'castor');
    expect(castor?.unit.position).toEqual({ x: 10, y: 6 });
    expect(galderChapter.recruitments).toEqual([
      { speakerUnitId: 'caeda', targetUnitId: 'castor', maxDistance: 1 }
    ]);

    // Village
    expect(galderChapter.villages?.length).toBe(1);
    expect(galderChapter.villages?.[0]?.reward).toEqual({ type: 'gold', amount: 3000 });

    // Route from Marth (23, 10) to Gate (1, 1) and Village (20, 5)
    expect(hasFootRoute(galderMapJson as MapData, { x: 23, y: 10 }, { x: 1, y: 1 })).toBe(true);
    expect(hasFootRoute(galderMapJson as MapData, { x: 23, y: 10 }, { x: 20, y: 5 })).toBe(true);
  });

  it('validates Chapter 1 villages configuration', () => {
    const talysChapter = loadChapterData(
      talysChapterJson,
      talysMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(talysChapter.villages?.length).toBe(2);
    expect(talysChapter.villages?.[0]?.id).toBe('village_west');
    expect(talysChapter.villages?.[0]?.reward).toEqual({ type: 'item', itemId: 'vulnerary' });
    expect(talysChapter.villages?.[1]?.id).toBe('village_east');
    expect(talysChapter.villages?.[1]?.reward).toEqual({ type: 'gold', amount: 5000 });
  });

  it('loads Chapter 3 Devil Mountain 30x20 map, Julian, Lena, Navarre and 15 enemies (FE3 Book 1)', () => {
    const ch3 = loadChapterData(
      devilMountainChapterJson,
      devilMountainMapJson as MapData,
      itemsJson.items as ItemDefinition[]
    );
    expect(ch3.id).toBe('chapter_03');
    expect(ch3.mapId).toBe('chapter_03_devil_mountain');
    expect(ch3.units.length).toBe(28);
    const players = ch3.units.filter((u) => u.unit.faction === 'player');
    const enemies = ch3.units.filter((u) => u.unit.faction === 'enemy');
    expect(players.length).toBe(13);
    expect(enemies.length).toBe(15);

    // Julian and Lena
    const julian = ch3.units.find((u) => u.unit.id === 'julian');
    expect(julian?.unit.position).toEqual({ x: 6, y: 10 });
    expect(julian?.unit.classId).toBe('thief');

    const lena = ch3.units.find((u) => u.unit.id === 'lena');
    expect(lena?.unit.position).toEqual({ x: 7, y: 10 });
    expect(lena?.unit.classId).toBe('sister');

    // Boss Hyman
    const hyman = ch3.units.find((u) => u.unit.id === 'hyman');
    expect(hyman?.unit.position).toEqual({ x: 1, y: 2 });
    expect(hyman?.isBoss).toBe(true);
    expect(hyman?.dropItemId).toBe('mend_staff');
    expect(ch3.units.find((u) => u.unit.id === 'samsoian_fighter_6')?.dropItemId).toBe('vulnerary');

    // Seize Reward
    expect(ch3.seizeReward).toEqual({ type: 'gold', amount: 15000 });

    // 2 Thieves
    const ch3Thieves = ch3.units.filter((u) => u.unit.faction === 'enemy' && u.unit.id.includes('thief'));
    expect(ch3Thieves.length).toBe(2);

    // 3 Hunters
    const ch3Hunters = ch3.units.filter((u) => u.unit.faction === 'enemy' && u.unit.id.includes('hunter'));
    expect(ch3Hunters.length).toBe(3);

    // 8 Fighters (Bandits)
    const ch3Fighters = ch3.units.filter((u) => u.unit.faction === 'enemy' && (u.unit.id.includes('fighter') || u.unit.id.includes('guard')));
    expect(ch3Fighters.length).toBe(8);

    // Navarre
    const navarre = ch3.units.find((u) => u.unit.id === 'navarre');
    expect(navarre?.unit.position).toEqual({ x: 14, y: 6 });
    expect(navarre?.weapon.id).toBe('killing_edge');
    expect(ch3.recruitments).toEqual([
      { speakerUnitId: 'caeda', targetUnitId: 'navarre', maxDistance: 1 }
    ]);

    // Village
    expect(ch3.villages?.length).toBe(1);
    expect(ch3.villages?.[0]?.reward).toEqual({ type: 'item', itemId: 'devil_axe' });

    // Route connectivity
    expect(hasFootRoute(devilMountainMapJson as MapData, { x: 25, y: 18 }, { x: 1, y: 2 })).toBe(true);
    expect(hasFootRoute(devilMountainMapJson as MapData, { x: 25, y: 18 }, { x: 2, y: 16 })).toBe(true);
    expect(hasFootRoute(devilMountainMapJson as MapData, { x: 25, y: 18 }, { x: 6, y: 10 })).toBe(true);
  });

  it('rejects an invalid dropItemId or unknown dropItem', () => {
    const chapter = copyChapter();
    const units = chapter.units as Record<string, unknown>[];
    units[0]!.dropItemId = 'non_existent_item';
    expect(() => load(chapter)).toThrow(/unknown dropItemId non_existent_item/);
  });

  it('rejects invalid seizeReward configurations', () => {
    const chapter1 = copyChapter();
    chapter1.seizeReward = { type: 'gold', amount: 0 };
    expect(() => load(chapter1)).toThrow(/seizeReward.amount must be a finite number >= 1/);

    const chapter2 = copyChapter();
    chapter2.seizeReward = { type: 'item', itemId: 'phantom_item' };
    expect(() => load(chapter2)).toThrow(/seize reward references unknown item phantom_item/);
  });
});
