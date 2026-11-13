import { MoveType, TerrainDefinition } from './types';
import terrainData from '../../../data/terrains.json';

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

  getMovementCost(terrainId: string, moveType: MoveType): number | null {
    const def = this.terrains.get(terrainId);
    if (!def) {
      return null;
    }
    return def.movementCosts[moveType] ?? null;
  }

  getAvoidBonus(terrainId: string): number {
    return this.terrains.get(terrainId)?.avoidBonus ?? 0;
  }

  getDefenseBonus(terrainId: string): number {
    return this.terrains.get(terrainId)?.defenseBonus ?? 0;
  }

  getHealPercent(terrainId: string): number {
    return this.terrains.get(terrainId)?.healPercent ?? 0;
  }
}

export const defaultTerrainRegistry = new TerrainRegistry();
