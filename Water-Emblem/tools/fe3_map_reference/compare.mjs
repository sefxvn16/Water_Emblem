// Compare game map JSON with the FE3 reference grid, cell by cell.
// Usage (from Water-Emblem/): node tools/fe3_map_reference/compare.mjs [mapId ...]
// Without arguments every file in data/reference/fe3/ is checked.
// Exit code 1 when any cell or size differs.
import { readFileSync, readdirSync } from 'node:fs';

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync('data/reference/fe3').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));

let failed = false;
for (const id of ids) {
  const ref = JSON.parse(readFileSync(`data/reference/fe3/${id}.json`, 'utf8'));
  const game = JSON.parse(readFileSync(`data/maps/${id}.json`, 'utf8'));
  const diffs = [];
  if (game.width !== ref.width || game.height !== ref.height) {
    diffs.push(`size game=${game.width}x${game.height} ref=${ref.width}x${ref.height}`);
  }
  ref.rows.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const expected = ref.legend[code];
      const actual = game.grid[y]?.[x];
      if (expected !== actual) diffs.push(`(${x},${y}) ref=${expected} game=${actual}`);
    });
  });
  console.log(`${id}: ${diffs.length === 0 ? 'MATCH' : `${diffs.length} diff(s)`}`);
  for (const d of diffs) console.log(`  ${d}`);
  if (diffs.length) failed = true;
}
process.exit(failed ? 1 : 0);
