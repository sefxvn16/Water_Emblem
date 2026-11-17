import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ReferenceGrid {
  mapId: string;
  width: number;
  height: number;
  legend: Record<string, string>;
  rows: string[];
}
interface GameMap {
  width: number;
  height: number;
  grid: string[][];
}

const dataDir = join(__dirname, '../../data');
const refDir = join(dataDir, 'reference/fe3');
const readJson = <T>(path: string) => JSON.parse(readFileSync(path, 'utf-8')) as T;
const refFiles = readdirSync(refDir).filter((f) => f.endsWith('.json'));

describe('game maps match FE3 reference grids', () => {
  it('finds reference grids', () => {
    expect(refFiles.length).toBeGreaterThan(0);
  });

  it.each(refFiles)('%s', (file) => {
    const ref = readJson<ReferenceGrid>(join(refDir, file));
    const map = readJson<GameMap>(join(dataDir, 'maps', `${ref.mapId}.json`));
    expect([map.width, map.height]).toEqual([ref.width, ref.height]);
    expect(map.grid.length).toBe(ref.height);
    const diffs: string[] = [];
    for (let y = 0; y < ref.height; y++) {
      for (let x = 0; x < ref.width; x++) {
        const expected = ref.legend[ref.rows[y][x]];
        const actual = map.grid[y]?.[x];
        if (actual !== expected) diffs.push(`(${x},${y}) expected ${expected} got ${actual}`);
      }
    }
    expect(diffs.slice(0, 10), `${diffs.length} differing cells`).toEqual([]);
  });
});
