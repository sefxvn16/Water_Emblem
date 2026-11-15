import { describe, it, expect } from 'vitest';
import { TerrainRegistry, healUnitsOnTerrain, analyzeMapObstacles } from '../../src/core/grid/terrain';
import { GridUnit, MapData, MoveType } from '../../src/core/grid/types';
import { chapter01Data } from '../../src/core/data/chapterData';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';
import mapCh1Json from '../../data/maps/chapter_01_talys.json';
import mapCh2Json from '../../data/maps/chapter_02_galder.json';
import mapCh3Json from '../../data/maps/chapter_03_devil_mountain.json';

describe('TerrainRegistry', () => {
  const registry = new TerrainRegistry();

  it('lấy đúng chi phí di chuyển cho bộ binh (foot)', () => {
    expect(registry.getMovementCost('plains', 'foot')).toBe(1);
    expect(registry.getMovementCost('forest', 'foot')).toBe(2);
    expect(registry.getMovementCost('mountain', 'foot')).toBe(4);
    expect(registry.getMovementCost('river', 'foot')).toBeNull();
    expect(registry.getMovementCost('peak', 'foot')).toBeNull();
  });

  it('kỵ binh (cavalry) tốn 3 điểm khi vào rừng và không thể leo núi', () => {
    expect(registry.getMovementCost('plains', 'cavalry')).toBe(1);
    expect(registry.getMovementCost('forest', 'cavalry')).toBe(3);
    expect(registry.getMovementCost('mountain', 'cavalry')).toBeNull();
  });

  it('phi binh (flier) bay qua mọi địa hình tự nhiên với cost = 1', () => {
    const flier: MoveType = 'flier';
    expect(registry.getMovementCost('plains', flier)).toBe(1);
    expect(registry.getMovementCost('forest', flier)).toBe(1);
    expect(registry.getMovementCost('mountain', flier)).toBe(1);
    expect(registry.getMovementCost('peak', flier)).toBe(1);
    expect(registry.getMovementCost('river', flier)).toBe(1);
    expect(registry.getMovementCost('sea', flier)).toBe(1);
    // Tường thành không thể đi xuyên qua
    expect(registry.getMovementCost('wall', flier)).toBeNull();
  });

  it('trả về đúng bonus né tránh và phòng thủ của địa hình', () => {
    expect(registry.getAvoidBonus('forest')).toBe(10);
    expect(registry.getDefenseBonus('forest')).toBe(0);
    expect(registry.getAvoidBonus('fort')).toBe(15);
    expect(registry.getDefenseBonus('fort')).toBe(1);
    expect(registry.getHealPercent('fort')).toBe(20);
    expect(registry.getAvoidBonus('gate')).toBe(20);
    expect(registry.getDefenseBonus('gate')).toBe(2);
    expect(registry.getHealPercent('gate')).toBe(20);
    expect(registry.getMovementCost('gate', 'foot')).toBe(2);
    expect(registry.getAvoidBonus('sea', 'bandit')).toBe(20);
    expect(registry.getAvoidBonus('peak', 'flier')).toBe(0);
    expect(registry.getAvoidBonus('forest', 'flier')).toBe(0);
    expect(registry.getDefenseBonus('gate', 'flier')).toBe(0);
  });

  it('hồi 20% HP cho đúng phe ở đầu phase, kể cả phi binh', () => {
    const map: MapData = { id: 'heal-test', name: 'Heal', width: 2, height: 1, grid: [['fort', 'gate']] };
    const template = chapter01Data.units[0]!;
    const player = { ...template, unit: { ...template.unit, faction: 'player' as const, position: { x: 0, y: 0 }, moveType: 'flier' as const }, stats: { ...template.stats, hp: 10, maxHp: 19 } };
    const enemy = { ...template, unit: { ...template.unit, faction: 'enemy' as const, position: { x: 1, y: 0 } }, stats: { ...template.stats, hp: 10, maxHp: 20 } };
    const afterPlayer = healUnitsOnTerrain([player, enemy], 'player', map, registry);
    expect(afterPlayer[0]!.stats.hp).toBe(14);
    expect(afterPlayer[1]!.stats.hp).toBe(10);
    const afterEnemy = healUnitsOnTerrain(afterPlayer, 'enemy', map, registry);
    expect(afterEnemy[0]!.stats.hp).toBe(14);
    expect(afterEnemy[1]!.stats.hp).toBe(14);
    expect(player.stats.hp).toBe(10);
  });

  it('chi phí FE11 theo class khác nhau trên Forest, Mountain và River', () => {
    expect(registry.getMovementCost('forest', 'foot', 'archer')).toBe(3);
    expect(registry.getMovementCost('forest', 'foot', 'sniper')).toBe(2);
    expect(registry.getMovementCost('mountain', 'cavalry', 'cataphract')).toBe(6);
    expect(registry.getMovementCost('mountain', 'cavalry', 'cavalier')).toBeNull();
    expect(registry.getMovementCost('mountain', 'foot', 'hero')).toBe(3);
    expect(registry.getMovementCost('mountain', 'bandit', 'pirate')).toBe(4);
    expect(registry.getMovementCost('river', 'foot', 'lord')).toBe(5);
    expect(registry.getMovementCost('river', 'foot', 'sniper')).toBe(4);
    expect(registry.getMovementCost('sea', 'foot', 'berserker')).toBe(2);

    const map: MapData = { id: 'forest-test', name: 'Forest', width: 2, height: 1, grid: [['plains', 'forest']] };
    const archer: GridUnit = { id: 'archer', name: 'Archer', faction: 'player', classId: 'archer', position: { x: 0, y: 0 }, mov: 2, moveType: 'foot' };
    const sniper: GridUnit = { ...archer, id: 'sniper', classId: 'sniper' };
    expect(calculateMovementRange(archer, { map, terrains: registry, units: [archer] }).has('1,0')).toBe(false);
    expect(calculateMovementRange(sniper, { map, terrains: registry, units: [sniper] }).has('1,0')).toBe(true);
  });

  it('phân loại đúng loại vật thể (có chặn, không chặn, cản trở, công trình)', () => {
    // Không chặn
    expect(registry.getObstacleType('plains')).toBe('none');
    expect(registry.getObstacleType('road')).toBe('none');
    expect(registry.getObstacleType('bridge')).toBe('none');
    expect(registry.isPassable('road', 'foot')).toBe(true);
    expect(registry.isPassable('road', 'cavalry')).toBe(true);

    // Cản trở / tốn bước
    expect(registry.getObstacleType('forest')).toBe('difficult');
    expect(registry.getObstacleType('mountain')).toBe('difficult');
    expect(registry.getObstacleType('sand')).toBe('difficult');
    expect(registry.getMovementCost('sand', 'mage')).toBe(1);
    expect(registry.getMovementCost('sand', 'foot')).toBe(2);
    expect(registry.getMovementCost('sand', 'cavalry')).toBe(3);

    // Chặn hoàn toàn hoặc chỉ bay qua
    expect(registry.getObstacleType('peak')).toBe('fly_only');
    expect(registry.getObstacleType('cliff')).toBe('fly_only');
    expect(registry.isPassable('cliff', 'foot')).toBe(false);
    expect(registry.isPassable('cliff', 'flier')).toBe(true);
    expect(registry.getObstacleType('wall')).toBe('impassable');
    expect(registry.isPassable('wall', 'flier')).toBe(false);

    // Sông / Biển
    expect(registry.getObstacleType('river')).toBe('water');
    expect(registry.getObstacleType('sea')).toBe('water');

    // Công trình kiến trúc
    expect(registry.getObstacleType('gate')).toBe('structure');
    expect(registry.getObstacleType('castle')).toBe('structure');
    expect(registry.getObstacleType('fort')).toBe('structure');
    expect(registry.getObstacleType('village')).toBe('structure');
    expect(registry.getObstacleType('house')).toBe('structure');
    expect(registry.getObstacleType('shop')).toBe('structure');
    expect(registry.isStructure('gate')).toBe(true);
    expect(registry.isStructure('castle')).toBe(true);
    expect(registry.isStructure('fort')).toBe(true);
    expect(registry.isStructure('village')).toBe(true);
    expect(registry.isStructure('plains')).toBe(false);
  });

  it('xác định chính xác vị trí công trình và vật thể trên bản đồ Chương 1, 2, 3', () => {
    // Chapter 1: 30x13
    const map1 = mapCh1Json as MapData;
    expect(map1.width).toBe(30);
    expect(map1.height).toBe(13);
    const obs1 = analyzeMapObstacles(map1, registry);
    expect(obs1.structures).toEqual(expect.arrayContaining([
      { position: { x: 4, y: 4 }, terrainId: 'gate' },
      { position: { x: 3, y: 8 }, terrainId: 'village' },
      { position: { x: 25, y: 2 }, terrainId: 'village' },
      { position: { x: 3, y: 2 }, terrainId: 'fort' },
      { position: { x: 23, y: 9 }, terrainId: 'fort' },
      { position: { x: 3, y: 10 }, terrainId: 'fort' },
    ]));
    expect(obs1.waterTiles.length).toBeGreaterThan(0);
    expect(obs1.difficultTiles.length).toBeGreaterThan(0);

    // Chapter 2: 30x15
    const map2 = mapCh2Json as MapData;
    expect(map2.width).toBe(30);
    expect(map2.height).toBe(15);
    const obs2 = analyzeMapObstacles(map2, registry);
    expect(obs2.structures).toEqual(expect.arrayContaining([
      { position: { x: 1, y: 1 }, terrainId: 'gate' },
      { position: { x: 20, y: 5 }, terrainId: 'village' },
      { position: { x: 2, y: 1 }, terrainId: 'fort' },
      { position: { x: 10, y: 6 }, terrainId: 'fort' },
      { position: { x: 24, y: 7 }, terrainId: 'fort' },
    ]));

    // Chapter 3: 30x20
    const map3 = mapCh3Json as MapData;
    expect(map3.width).toBe(30);
    expect(map3.height).toBe(20);
    const obs3 = analyzeMapObstacles(map3, registry);
    expect(obs3.structures).toEqual(expect.arrayContaining([
      { position: { x: 1, y: 2 }, terrainId: 'gate' },
      { position: { x: 2, y: 16 }, terrainId: 'village' },
      { position: { x: 2, y: 2 }, terrainId: 'fort' },
      { position: { x: 1, y: 3 }, terrainId: 'fort' },
      { position: { x: 15, y: 5 }, terrainId: 'fort' },
      { position: { x: 19, y: 11 }, terrainId: 'fort' },
    ]));
    expect(obs3.difficultTiles.length).toBeGreaterThan(0);
    expect(obs3.flyOnlyTiles.length).toBeGreaterThan(0);
  });
});
