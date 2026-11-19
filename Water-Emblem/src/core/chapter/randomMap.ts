import type { MapData, Position } from '../grid/types';
import { SeededRNG } from '../combat/rng';
import type { ChapterData, ExtendedUnitState } from '../data/chapterData';

/**
 * Random skirmish maps (PLAN item 119, Q12): a separate mode that
 * generates a battlefield from a seed — same seed, same map. Terrain
 * mix [Giả định]: plains with forest/mountain clusters, a river crossed
 * by one bridge, a fort and a gate; deployment rows stay clear.
 */

export const SKIRMISH_WIDTH = 12;
export const SKIRMISH_HEIGHT = 10;

export function generateRandomMap(seed: number): MapData {
  const rng = new SeededRNG(seed);
  const grid: string[][] = [];
  const elevations: number[][] = [];
  for (let y = 0; y < SKIRMISH_HEIGHT; y++) {
    const row: string[] = [];
    const elevRow: number[] = [];
    for (let x = 0; x < SKIRMISH_WIDTH; x++) {
      const roll = rng.next();
      let terrain = 'plains';
      let elevation = 0;
      if (roll < 0.14) terrain = 'forest';
      else if (roll < 0.2) { terrain = 'mountain'; elevation = 1; }
      else if (roll < 0.23) { terrain = 'peak'; elevation = 2; }
      row.push(terrain);
      elevRow.push(elevation);
    }
    grid.push(row);
    elevations.push(elevRow);
  }

  // River across the middle with a single bridge.
  const riverY = Math.floor(SKIRMISH_HEIGHT / 2);
  const bridgeX = 1 + Math.floor(rng.next() * (SKIRMISH_WIDTH - 2));
  for (let x = 0; x < SKIRMISH_WIDTH; x++) {
    grid[riverY]![x] = x === bridgeX ? 'bridge' : 'river';
    elevations[riverY]![x] = x === bridgeX ? 0 : -1;
  }

  // A fort and a gate on the enemy half.
  const fortX = Math.floor(rng.next() * SKIRMISH_WIDTH);
  const gateX = Math.floor(rng.next() * SKIRMISH_WIDTH);
  grid[1]![fortX] = 'fort';
  grid[0]![gateX] = 'gate';
  elevations[0]![gateX] = 1;

  // Deployment rows (bottom two) stay clear plains.
  for (let y = SKIRMISH_HEIGHT - 2; y < SKIRMISH_HEIGHT; y++) {
    for (let x = 0; x < SKIRMISH_WIDTH; x++) {
      grid[y]![x] = 'plains';
      elevations[y]![x] = 0;
    }
  }

  return {
    id: `skirmish_map_${seed}`,
    name: `Skirmish (seed ${seed})`,
    width: SKIRMISH_WIDTH,
    height: SKIRMISH_HEIGHT,
    grid,
    elevations,
  };
}

function passableTiles(map: MapData, yMin: number, yMax: number): Position[] {
  const tiles: Position[] = [];
  for (let y = yMin; y <= yMax; y++) {
    for (let x = 0; x < map.width; x++) {
      const terrain = map.grid[y]?.[x];
      if (terrain === 'plains' || terrain === 'forest' || terrain === 'fort' || terrain === 'gate') {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

/**
 * Builds a skirmish chapter: the template chapter's units repositioned —
 * players on the bottom rows, enemies on the top half — rout objective.
 */
export function generateSkirmishChapter(seed: number, template: ChapterData): { chapter: ChapterData; map: MapData } {
  const map = generateRandomMap(seed);
  const rng = new SeededRNG(seed ^ 0x9e3779b9);
  const playerTiles = passableTiles(map, SKIRMISH_HEIGHT - 2, SKIRMISH_HEIGHT - 1);
  const enemyTiles = passableTiles(map, 0, Math.floor(SKIRMISH_HEIGHT / 2) - 1);

  const place = (units: ExtendedUnitState[], tiles: Position[]): ExtendedUnitState[] => {
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return units.map((entry, index) => {
      const tile = shuffled[index % shuffled.length] ?? { x: 0, y: 0 };
      return {
        ...structuredClone(entry),
        unit: { ...entry.unit, position: { ...tile }, isDead: false, hasActed: false, hasEscaped: false },
      };
    });
  };

  const players = template.units.filter((u) => u.unit.faction === 'player');
  const enemies = template.units.filter((u) => u.unit.faction === 'enemy');
  const units = [...place(players, playerTiles), ...place(enemies, enemyTiles)];

  const chapter: ChapterData = {
    ...template,
    id: 'skirmish',
    name: `Random Skirmish (seed ${seed})`,
    mapId: map.id,
    objective: { type: 'rout', description: 'Rout the enemy' },
    units,
    optionalUnits: [],
    reinforcements: [],
    traps: [],
  };
  return { chapter, map };
}
