import type { ChapterData, ChapterReinforcement, ExtendedUnitState } from '../data/chapterData';
import type { MapData, Position } from '../grid/types';
import type { TerrainRegistry } from '../grid/terrain';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };

/**
 * Reinforcements (PLAN item 94, B04): announced in advance, they arrive at
 * the end of the enemy phase and do not act on the turn they appear.
 */

/** Groups arriving at the end of the enemy phase of `turn` that have not spawned yet. */
export function dueReinforcements(
  chapter: ChapterData,
  turn: number,
  spawnedIds: readonly string[],
): ChapterReinforcement[] {
  return (chapter.reinforcements ?? []).filter(
    (group) => group.turn === turn && !spawnedIds.includes(group.id),
  );
}

/** Groups to warn about at the start of the player phase of `turn` (they arrive this turn). */
export function announcedReinforcements(
  chapter: ChapterData,
  turn: number,
  spawnedIds: readonly string[],
): ChapterReinforcement[] {
  return dueReinforcements(chapter, turn, spawnedIds);
}

function findSpawnTile(
  entry: ExtendedUnitState,
  units: readonly ExtendedUnitState[],
  map: MapData,
  terrains: TerrainRegistry,
): Position | undefined {
  const occupied = new Set(
    units.filter((u) => !u.unit.isDead).map((u) => `${u.unit.position.x},${u.unit.position.y}`),
  );
  const start = entry.unit.position;
  const visited = new Set<string>([`${start.x},${start.y}`]);
  let frontier: Position[] = [start];
  for (let radius = 0; radius <= balanceConfig.reinforcementSearchRadius; radius++) {
    const next: Position[] = [];
    for (const pos of frontier) {
      const terrainId = map.grid[pos.y]?.[pos.x];
      if (terrainId !== undefined
        && !occupied.has(`${pos.x},${pos.y}`)
        && terrains.getMovementCost(terrainId, entry.unit.moveType, entry.unit.classId) !== null) {
        return pos;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const candidate = { x: pos.x + dx, y: pos.y + dy };
        const key = `${candidate.x},${candidate.y}`;
        if (candidate.x < 0 || candidate.y < 0 || candidate.x >= map.width || candidate.y >= map.height) continue;
        if (visited.has(key)) continue;
        visited.add(key);
        next.push(candidate);
      }
    }
    frontier = next;
  }
  return undefined;
}

export interface SpawnResult {
  readonly units: ExtendedUnitState[];
  readonly spawned: ExtendedUnitState[];
  readonly skippedIds: string[];
}

/**
 * Add a reinforcement group to the field. Spawned units carry the
 * reinforcement tone flag and have already acted, so they first move on
 * the next enemy phase. A unit whose spawn area is fully blocked is skipped.
 */
export function spawnReinforcements(
  units: readonly ExtendedUnitState[],
  group: ChapterReinforcement,
  map: MapData,
  terrains: TerrainRegistry,
): SpawnResult {
  const next = [...units];
  const spawned: ExtendedUnitState[] = [];
  const skippedIds: string[] = [];
  for (const template of group.units) {
    const tile = findSpawnTile(template, next, map, terrains);
    if (!tile) {
      skippedIds.push(template.unit.id);
      continue;
    }
    const entry: ExtendedUnitState = {
      ...structuredClone(template),
      unit: { ...template.unit, position: tile, hasActed: true, isReinforcement: true },
    };
    next.push(entry);
    spawned.push(entry);
  }
  return { units: next, spawned, skippedIds };
}
