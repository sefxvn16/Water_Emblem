import { MoveType, ObstacleType, Position, TerrainDefinition } from './types';
import type { MapData } from './types';
import type { ExtendedUnitState } from '../data/chapterData';
import { getClassDefinition } from '../class/classRules';
import terrainData from '../../../data/terrains.json' with { type: 'json' };

export class TerrainRegistry {
  private readonly terrains: Map<string, TerrainDefinition> = new Map();

  constructor(customTerrains?: readonly TerrainDefinition[]) {
    const source = customTerrains ?? (terrainData.terrains as readonly TerrainDefinition[]);
    for (const t of source) {
      this.terrains.set(t.id, t);
    }
  }

  get(id: string): TerrainDefinition | undefined {
    return this.terrains.get(id);
  }

  getMovementCost(terrainId: string, moveType: MoveType, classId?: string): number | null {
    const def = this.terrains.get(terrainId);
    if (!def) {
      return null;
    }
    if (moveType === 'flier' || !classId) return def.movementCosts[moveType] ?? null;

    const source = getClassDefinition(classId)?.sourceClass;
    if (!source?.startsWith('FE11 ')) return def.movementCosts[moveType] ?? null;
    const sourceClass = source.slice(5).replace(/ \(.*$/, '');
    if (def.sourceClassCosts && Object.hasOwn(def.sourceClassCosts, sourceClass)) {
      return def.sourceClassCosts[sourceClass] ?? null;
    }
    return def.movementCosts[moveType] ?? null;
  }

  getAvoidBonus(terrainId: string, moveType: MoveType = 'foot'): number {
    if (moveType === 'flier') return 0;
    return this.terrains.get(terrainId)?.avoidBonus ?? 0;
  }

  getDefenseBonus(terrainId: string, moveType: MoveType = 'foot'): number {
    if (moveType === 'flier') return 0;
    return this.terrains.get(terrainId)?.defenseBonus ?? 0;
  }

  getHealPercent(terrainId: string): number {
    return this.terrains.get(terrainId)?.healPercent ?? 0;
  }

  getObstacleType(terrainId: string): ObstacleType {
    return this.terrains.get(terrainId)?.obstacleType ?? 'none';
  }

  isPassable(terrainId: string, moveType: MoveType, classId?: string): boolean {
    return this.getMovementCost(terrainId, moveType, classId) !== null;
  }

  isStructure(terrainId: string): boolean {
    return this.terrains.get(terrainId)?.obstacleType === 'structure';
  }

  getAll(): readonly TerrainDefinition[] {
    return Array.from(this.terrains.values());
  }
}

export function healUnitsOnTerrain(
  entries: readonly ExtendedUnitState[],
  faction: 'player' | 'enemy',
  map: MapData,
  terrains: TerrainRegistry,
): ExtendedUnitState[] {
  return entries.map((entry) => {
    if (entry.unit.faction !== faction || entry.unit.isDead || entry.stats.hp <= 0) return entry;
    const terrainId = map.grid[entry.unit.position.y]?.[entry.unit.position.x];
    const percent = terrainId ? terrains.getHealPercent(terrainId) : 0;
    if (percent <= 0 || entry.stats.hp >= entry.stats.maxHp) return entry;
    const recovered = Math.ceil(entry.stats.maxHp * percent / 100);
    return { ...entry, stats: { ...entry.stats, hp: Math.min(entry.stats.maxHp, entry.stats.hp + recovered) } };
  });
}

export const defaultTerrainRegistry = new TerrainRegistry();

/** Elevation of a tile (PLAN item 104); maps without elevation data are flat. */
export function getElevation(map: MapData, pos: Position): number {
  return map.elevations?.[pos.y]?.[pos.x] ?? 0;
}

export interface MapObstacleSummary {
  readonly impassableTiles: Position[];
  readonly difficultTiles: Position[];
  readonly waterTiles: Position[];
  readonly flyOnlyTiles: Position[];
  readonly structures: { position: Position; terrainId: string }[];
}

export function analyzeMapObstacles(
  map: MapData,
  terrains: TerrainRegistry = defaultTerrainRegistry,
): MapObstacleSummary {
  const impassableTiles: Position[] = [];
  const difficultTiles: Position[] = [];
  const waterTiles: Position[] = [];
  const flyOnlyTiles: Position[] = [];
  const structures: { position: Position; terrainId: string }[] = [];

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const terrainId = map.grid[y]?.[x] ?? 'plains';
      const obsType = terrains.getObstacleType(terrainId);
      const position = { x, y };
      if (obsType === 'impassable') {
        impassableTiles.push(position);
      } else if (obsType === 'difficult') {
        difficultTiles.push(position);
      } else if (obsType === 'water') {
        waterTiles.push(position);
      } else if (obsType === 'fly_only') {
        flyOnlyTiles.push(position);
      } else if (obsType === 'structure') {
        structures.push({ position, terrainId });
      }
    }
  }

  return { impassableTiles, difficultTiles, waterTiles, flyOnlyTiles, structures };
}
