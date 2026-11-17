import type { GridUnit, MapData, Position } from './types';

export interface TileOverlay {
  readonly reachable: boolean;
  readonly danger: boolean;
  readonly attackTarget: boolean;
  readonly selected: boolean;
}

export interface BoardTile {
  readonly x: number;
  readonly y: number;
  readonly key: string;
  readonly terrainId: string;
  readonly elevation: number;
  readonly unitId: string | null;
  readonly overlay: TileOverlay;
}

export interface BoardView {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly (readonly BoardTile[])[];
}

export interface BoardViewInput {
  readonly map: MapData;
  readonly units: readonly GridUnit[];
  readonly reachableKeys: ReadonlySet<string>;
  readonly dangerZoneKeys: ReadonlySet<string>;
  readonly attackTargetKeys: ReadonlySet<string>;
  readonly selected: Position | null;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Builds the renderer-neutral board model shared by the 2D and 3D views. Tiles are indexed [y][x]. */
export function buildBoardView(input: BoardViewInput): BoardView {
  const { map, units, reachableKeys, dangerZoneKeys, attackTargetKeys, selected } = input;
  const unitAt = new Map<string, string>();
  for (const unit of units) {
    if (!unit.isDead) unitAt.set(tileKey(unit.position.x, unit.position.y), unit.id);
  }
  const tiles = map.grid.map((row, y) =>
    row.map((terrainId, x): BoardTile => {
      const key = tileKey(x, y);
      return {
        x,
        y,
        key,
        terrainId,
        elevation: map.elevations?.[y]?.[x] ?? 0,
        unitId: unitAt.get(key) ?? null,
        overlay: {
          reachable: reachableKeys.has(key),
          danger: dangerZoneKeys.has(key),
          attackTarget: attackTargetKeys.has(key),
          selected: selected !== null && selected.x === x && selected.y === y,
        },
      };
    }));
  return { width: map.width, height: map.height, tiles };
}
