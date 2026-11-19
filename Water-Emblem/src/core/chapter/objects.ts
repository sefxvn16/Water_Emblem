import type { MapData, Position } from '../grid/types';
import type { TerrainRegistry } from '../grid/terrain';
import type { ExtendedUnitState } from '../data/chapterData';

/**
 * Destructible map objects (PLAN item 101, C12): tiles whose terrain is
 * marked `destructible` (e.g. Wall, maxHp 20) can be attacked; at 0 HP the
 * tile becomes passable rubble. Object HP is tracked per tile key "x,y";
 * an absent key means full HP. Pure helpers; App owns the state.
 */

export function objectKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function isDestructibleTile(map: MapData, terrains: TerrainRegistry, pos: Position): boolean {
  const terrainId = map.grid[pos.y]?.[pos.x];
  if (!terrainId) return false;
  return terrains.get(terrainId)?.destructible === true;
}

export function objectMaxHp(map: MapData, terrains: TerrainRegistry, pos: Position): number {
  const terrainId = map.grid[pos.y]?.[pos.x];
  return (terrainId ? terrains.get(terrainId)?.maxHp : undefined) ?? 0;
}

export function objectHpAt(
  objectStates: Readonly<Record<string, number>>,
  map: MapData,
  terrains: TerrainRegistry,
  pos: Position,
): number {
  const stored = objectStates[objectKey(pos)];
  return stored === undefined ? objectMaxHp(map, terrains, pos) : stored;
}

export function destroyedObjectKeys(objectStates: Readonly<Record<string, number>>): ReadonlySet<string> {
  return new Set(Object.entries(objectStates).filter(([, hp]) => hp <= 0).map(([key]) => key));
}

export function damageObject(
  objectStates: Readonly<Record<string, number>>,
  map: MapData,
  terrains: TerrainRegistry,
  pos: Position,
  damage: number,
): { states: Record<string, number>; remainingHp: number; destroyed: boolean } {
  const remainingHp = Math.max(0, objectHpAt(objectStates, map, terrains, pos) - damage);
  return {
    states: { ...objectStates, [objectKey(pos)]: remainingHp },
    remainingHp,
    destroyed: remainingHp <= 0,
  };
}

/** Pseudo-unit standing in for a destructible object in combat forecasts. */
export function buildObjectDefender(
  map: MapData,
  terrains: TerrainRegistry,
  pos: Position,
  hp: number,
): ExtendedUnitState {
  const terrainId = map.grid[pos.y]?.[pos.x] ?? 'wall';
  const name = terrains.get(terrainId)?.name ?? 'Object';
  return {
    unit: {
      id: `object:${objectKey(pos)}`,
      name,
      faction: 'enemy',
      position: { ...pos },
      mov: 0,
      moveType: 'armor',
    },
    stats: { hp, maxHp: hp, str: 0, mag: 0, skill: 0, spd: 0, lck: 0, def: 0, res: 0 },
    level: 1,
    exp: 0,
    inventory: [],
    weapon: undefined,
  };
}
