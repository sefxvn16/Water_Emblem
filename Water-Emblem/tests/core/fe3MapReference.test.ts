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
    // The reference itself must be well-formed, or a broken file could pass silently.
    expect(ref.rows.length).toBe(ref.height);
    for (const row of ref.rows) {
      expect(row.length).toBe(ref.width);
      for (const code of row) expect(ref.legend[code], `legend has no entry for '${code}'`).toBeDefined();
    }
    const diffs: string[] = [];
    for (let y = 0; y < ref.height; y++) {
      for (let x = 0; x < ref.width; x++) {
        const expected = ref.legend[ref.rows[y]?.[x] ?? ''];
        const actual = map.grid[y]?.[x];
        // PLAN item 92 adds interactive chest/door tiles the FE3 reference
        // does not have; those cells are deliberate additions, not drift.
        if (actual === 'chest' || actual === 'door') continue;
        if (actual !== expected) diffs.push(`(${x},${y}) expected ${expected} got ${actual}`);
      }
    }
    expect(diffs.slice(0, 10), `${diffs.length} differing cells`).toEqual([]);
  });

  it('every converted chapter map matches its independent FE3 reference grid', () => {
    expect(refFiles.length).toBe(44);
    const terrainsJson = readJson<{ terrains: { id: string }[] }>(join(dataDir, 'terrains.json'));
    const validTerrains = new Set(terrainsJson.terrains.map((t) => t.id));

    for (const file of refFiles) {
      const ref = readJson<ReferenceGrid>(join(refDir, file));
      const map = readJson<GameMap>(join(dataDir, 'maps', `${ref.mapId}.json`));
      expect([map.width, map.height]).toEqual([ref.width, ref.height]);
      expect(map.grid.length).toBe(ref.height);
      expect(ref.rows.length).toBe(ref.height);

      for (let y = 0; y < ref.height; y++) {
        const mapRow = map.grid[y];
        const refRow = ref.rows[y];
        expect(mapRow, `Map ${ref.mapId} is missing row ${y}`).toBeDefined();
        expect(refRow, `Reference ${ref.mapId} is missing row ${y}`).toBeDefined();
        expect(mapRow!.length).toBe(ref.width);
        expect(refRow!.length).toBe(ref.width);
        for (let x = 0; x < ref.width; x++) {
          const terrain = mapRow![x];
          expect(
            terrain !== undefined && validTerrains.has(terrain),
            `Map ${ref.mapId} cell (${x},${y}) has invalid terrain '${terrain}'`
          ).toBe(true);

          const code = refRow![x];
          expect(code, `Reference ${ref.mapId} cell (${x},${y}) has no atlas code`).toBeDefined();
          const expected = ref.legend[code!];
          if (terrain === 'chest' || terrain === 'door') continue;
          expect(terrain, `Map ${ref.mapId} cell (${x},${y}) code '${code}'`).toBe(expected);
        }
      }
    }
  });
});

