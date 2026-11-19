import { GridUnit, MapData, MoveTileResult, Position } from './types';
import { TerrainRegistry } from './terrain';

export interface PathfindingContext {
  readonly map: MapData;
  readonly terrains: TerrainRegistry;
  readonly units: readonly GridUnit[];
  /** Opened door tiles as "x,y" keys (PLAN item 92); closed doors block. */
  readonly openedDoors?: ReadonlySet<string>;
}

function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

const DIRECTIONS: readonly Position[] = [
  { x: 0, y: -1 }, // Lên
  { x: 1, y: 0 },  // Phải
  { x: 0, y: 1 },  // Xuống
  { x: -1, y: 0 }, // Trái
];

export function isWithinBounds(pos: Position, map: MapData): boolean {
  return pos.x >= 0 && pos.x < map.width && pos.y >= 0 && pos.y < map.height;
}

export function getTerrainAt(pos: Position, map: MapData): string | undefined {
  if (!isWithinBounds(pos, map)) {
    return undefined;
  }
  const row = map.grid[pos.y];
  return row ? row[pos.x] : undefined;
}

export function getUnitAt(pos: Position, units: readonly GridUnit[]): GridUnit | undefined {
  return units.find((u) => !u.isDead && u.position.x === pos.x && u.position.y === pos.y);
}

export function calculateMovementRange(
  unit: GridUnit,
  context: PathfindingContext
): Map<string, MoveTileResult> {
  const { map, terrains, units } = context;
  const startPos = unit.position;

  // Dijkstra / BFS queue
  // Lưu trạng thái tốt nhất: key -> { costRemaining, path }
  const bestVisits = new Map<string, { costRemaining: number; path: Position[] }>();

  // Priority queue đơn giản bằng mảng hoặc binary heap
  interface QueueNode {
    pos: Position;
    costRemaining: number;
    path: Position[];
  }

  const queue: QueueNode[] = [
    {
      pos: startPos,
      costRemaining: unit.mov,
      path: [startPos],
    },
  ];

  bestVisits.set(posKey(startPos), {
    costRemaining: unit.mov,
    path: [startPos],
  });

  while (queue.length > 0) {
    // Lấy node có costRemaining lớn nhất
    queue.sort((a, b) => b.costRemaining - a.costRemaining);
    const current = queue.shift();
    if (!current) break;

    const currentBest = bestVisits.get(posKey(current.pos));
    if (currentBest && currentBest.costRemaining > current.costRemaining) {
      continue;
    }

    for (const dir of DIRECTIONS) {
      const nextPos: Position = {
        x: current.pos.x + dir.x,
        y: current.pos.y + dir.y,
      };

      if (!isWithinBounds(nextPos, map)) {
        continue;
      }

      const terrainId = getTerrainAt(nextPos, map);
      if (!terrainId) {
        continue;
      }

      const moveCost = terrainId === 'door' && context.openedDoors?.has(posKey(nextPos))
        ? 1
        : terrains.getMovementCost(terrainId, unit.moveType, unit.classId);
      if (moveCost === null) {
        // Địa hình không thể vượt qua
        continue;
      }

      if (current.costRemaining < moveCost) {
        // Không đủ điểm di chuyển
        continue;
      }

      // Kiểm tra đơn vị chắn đường
      const occupyingUnit = getUnitAt(nextPos, units);
      if (occupyingUnit && occupyingUnit.faction !== unit.faction) {
        // Quân địch chắn đường: không thể đi qua
        continue;
      }

      const newRemaining = current.costRemaining - moveCost;
      const nextKey = posKey(nextPos);
      const existing = bestVisits.get(nextKey);

      if (!existing || newRemaining > existing.costRemaining) {
        const newPath = [...current.path, nextPos];
        bestVisits.set(nextKey, {
          costRemaining: newRemaining,
          path: newPath,
        });
        queue.push({
          pos: nextPos,
          costRemaining: newRemaining,
          path: newPath,
        });
      }
    }
  }

  // Lọc ra các ô có thể dừng lại (ô trống hoặc ô có chính unit này)
  const reachableTiles = new Map<string, MoveTileResult>();

  for (const [key, val] of bestVisits.entries()) {
    const endPos = val.path[val.path.length - 1];
    if (!endPos) continue;

    const occupyingUnit = getUnitAt(endPos, units);
    // Ô có thể dừng lại nếu:
    // 1. Không có đơn vị nào
    // 2. Hoặc chính là vị trí xuất phát của đơn vị
    if (!occupyingUnit || occupyingUnit.id === unit.id) {
      reachableTiles.set(key, {
        position: endPos,
        costRemaining: val.costRemaining,
        path: val.path,
      });
    }
  }

  return reachableTiles;
}
