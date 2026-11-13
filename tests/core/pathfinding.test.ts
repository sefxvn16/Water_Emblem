import { describe, it, expect } from 'vitest';
import { TerrainRegistry } from '../../src/core/grid/terrain';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';
import { GridUnit, MapData } from '../../src/core/grid/types';

describe('Movement Range & Pathfinding (Dijkstra/BFS)', () => {
  const terrains = new TerrainRegistry();

  const mockMap: MapData = {
    id: 'test_map',
    name: 'Test Map',
    width: 5,
    height: 5,
    grid: [
      ['plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'forest', 'forest', 'plains', 'plains'],
      ['river',  'river',  'bridge', 'river',  'river'],
      ['plains', 'plains', 'plains', 'plains', 'plains'],
      ['plains', 'plains', 'plains', 'plains', 'plains'],
    ],
  };

  it('tính toán vùng di chuyển chính xác trên đồng bằng', () => {
    const unit: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 2,
      moveType: 'foot',
    };

    const range = calculateMovementRange(unit, {
      map: mockMap,
      terrains,
      units: [unit],
    });

    // Từ (0,0) với mov=2:
    // (0,0) cost remaining = 2
    // (1,0) cost remaining = 1
    // (0,1) cost remaining = 1
    // (2,0) cost remaining = 0
    // (1,1) là forest, cost=2, từ (0,1) hoặc (1,0) còn 1 -> không vào được forest!
    expect(range.has('0,0')).toBe(true);
    expect(range.has('1,0')).toBe(true);
    expect(range.has('0,1')).toBe(true);
    expect(range.has('2,0')).toBe(true);
    expect(range.has('1,1')).toBe(false); // Rừng cost=2 không đủ điểm
  });

  it('đơn vị phải đi qua cầu khi gặp sông cản đường', () => {
    const unit: GridUnit = {
      id: 'abel',
      name: 'Abel',
      faction: 'player',
      position: { x: 2, y: 1 },
      mov: 3,
      moveType: 'cavalry',
    };

    const range = calculateMovementRange(unit, {
      map: mockMap,
      terrains,
      units: [unit],
    });

    // (2,1) là rừng đối với kỵ binh? mockMap[1][2] là forest.
    // Thử bắt đầu từ (2,1):
    // Cầu nằm ở (2,2)
    // Phía bên kia cầu là (2,3)
    // Sông ở (0,2), (1,2), (3,2), (4,2) kỵ binh không thể đi qua
    expect(range.has('2,2')).toBe(true); // Cầu
    expect(range.has('1,2')).toBe(false); // Sông
    expect(range.has('3,2')).toBe(false); // Sông
  });

  it('quân địch cản đường không thể đi xuyên qua', () => {
    const unit: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'foot',
    };

    const enemy: GridUnit = {
      id: 'bandit_1',
      name: 'Bandit',
      faction: 'enemy',
      position: { x: 1, y: 0 }, // Địch chặn ở (1,0)
      mov: 3,
      moveType: 'bandit',
    };

    const range = calculateMovementRange(unit, {
      map: mockMap,
      terrains,
      units: [unit, enemy],
    });

    // (1,0) có địch -> không thể dừng lại và không thể đi qua
    expect(range.has('1,0')).toBe(false);
  });

  it('đồng đội cùng phe có thể đi xuyên qua nhưng không được dừng đè lên nhau', () => {
    const marth: GridUnit = {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 3,
      moveType: 'foot',
    };

    const jagen: GridUnit = {
      id: 'jagen',
      name: 'Jagen',
      faction: 'player',
      position: { x: 1, y: 0 }, // Đồng đội ở (1,0)
      mov: 7,
      moveType: 'cavalry',
    };

    const range = calculateMovementRange(marth, {
      map: mockMap,
      terrains,
      units: [marth, jagen],
    });

    // Không thể dừng lại trên ô của Jagen (1,0)
    expect(range.has('1,0')).toBe(false);
    // Nhưng có thể đi xuyên qua Jagen để tới (2,0)
    expect(range.has('2,0')).toBe(true);
    // Và đường đi tới (2,0) chứa (1,0)
    const resultTo20 = range.get('2,0');
    expect(resultTo20?.path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
  });
});
