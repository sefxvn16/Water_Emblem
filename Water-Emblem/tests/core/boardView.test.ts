import { describe, it, expect } from 'vitest';
import { buildBoardView, tileKey } from '../../src/core/grid/boardView';
import type { GridUnit, MapData } from '../../src/core/grid/types';

const map: MapData = {
  id: 'm',
  name: 'm',
  width: 3,
  height: 2,
  grid: [
    ['plains', 'forest', 'river'],
    ['road', 'wall', 'plains'],
  ],
};

const unit = (id: string, x: number, y: number, isDead = false): GridUnit => ({
  id, name: id, faction: 'player', position: { x, y }, mov: 5, moveType: 'foot', isDead,
});

const empty = new Set<string>();

describe('buildBoardView', () => {
  it('has the map dimensions and is indexed [y][x]', () => {
    const board = buildBoardView({ map, units: [], reachableKeys: empty, dangerZoneKeys: empty, attackTargetKeys: empty, selected: null });
    expect(board.width).toBe(3);
    expect(board.height).toBe(2);
    expect(board.tiles).toHaveLength(2);
    expect(board.tiles[0]).toHaveLength(3);
    expect(board.tiles[1]![2]).toMatchObject({ x: 2, y: 1, key: '2,1', terrainId: 'plains' });
    expect(tileKey(2, 1)).toBe('2,1');
  });

  it('places living units only', () => {
    const board = buildBoardView({
      map,
      units: [unit('a', 1, 0), unit('b', 2, 1, true)],
      reachableKeys: empty, dangerZoneKeys: empty, attackTargetKeys: empty, selected: null,
    });
    expect(board.tiles[0]![1]!.unitId).toBe('a');
    expect(board.tiles[1]![2]!.unitId).toBeNull();
  });

  it('sets overlays from the key sets and the selected position', () => {
    const board = buildBoardView({
      map,
      units: [],
      reachableKeys: new Set(['0,0']),
      dangerZoneKeys: new Set(['1,0', '0,0']),
      attackTargetKeys: new Set(['2,1']),
      selected: { x: 1, y: 1 },
    });
    expect(board.tiles[0]![0]!.overlay).toEqual({ reachable: true, danger: true, attackTarget: false, selected: false });
    expect(board.tiles[0]![1]!.overlay).toEqual({ reachable: false, danger: true, attackTarget: false, selected: false });
    expect(board.tiles[1]![2]!.overlay).toEqual({ reachable: false, danger: false, attackTarget: true, selected: false });
    expect(board.tiles[1]![1]!.overlay).toEqual({ reachable: false, danger: false, attackTarget: false, selected: true });
  });

  it('defaults elevation to 0 and reads map elevations when present', () => {
    const flat = buildBoardView({ map, units: [], reachableKeys: empty, dangerZoneKeys: empty, attackTargetKeys: empty, selected: null });
    expect(flat.tiles[0]![1]!.elevation).toBe(0);
    const raised: MapData = { ...map, elevations: [[0, 2, 0], [0, 0, 3]] };
    const board = buildBoardView({ map: raised, units: [], reachableKeys: empty, dangerZoneKeys: empty, attackTargetKeys: empty, selected: null });
    expect(board.tiles[0]![1]!.elevation).toBe(2);
    expect(board.tiles[1]![2]!.elevation).toBe(3);
  });
});
