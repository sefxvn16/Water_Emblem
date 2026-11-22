#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Atlas directory: can be overridden via FE3_ATLAS_DIR, defaults to sibling repo
const atlasDir =
  process.env.FE3_ATLAS_DIR ||
  path.resolve(repoRoot, '../FE3_map_atlas');

if (!fs.existsSync(atlasDir)) {
  console.error(`Atlas directory not found at: ${atlasDir}`);
  process.exit(1);
}

// 1. Read valid terrains from Water-Emblem/data/terrains.json
const terrainsJsonPath = path.join(repoRoot, 'Water-Emblem/data/terrains.json');
const terrainsData = JSON.parse(fs.readFileSync(terrainsJsonPath, 'utf8'));
const validTerrains = new Set(terrainsData.terrains.map((t) => t.id));

// 2. Read code table dynamically from FE3_map_atlas/README.md
const readmePath = path.join(atlasDir, 'README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf8');

// Parse markdown table: rows starting with '|' and having `code` cells
const codeToDesc = {};
const tableLines = readmeContent
  .split(/\r?\n/)
  .filter((l) => l.trim().startsWith('|') && l.includes('`'));

for (const line of tableLines) {
  const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
  for (let i = 0; i < parts.length; i += 2) {
    const codeMatch = parts[i]?.match(/`([^`]+)`/);
    const desc = parts[i + 1];
    if (codeMatch && desc && !desc.includes('---')) {
      const code = codeMatch[1];
      codeToDesc[code] = desc;
    }
  }
}

// Resolve terrain ID from description according to terrains.json
// FE convention: desert terrain is 'sand' in terrains.json
function resolveTerrain(desc) {
  const clean = desc.toLowerCase().trim();
  const firstWord = clean.split(/[\s/()]+/)[0];
  if (validTerrains.has(firstWord)) return firstWord;
  if (clean.includes('desert') && validTerrains.has('sand')) return 'sand';
  return null;
}

const codeToTerrain = {};
const unmappedCodes = [];

for (const [code, desc] of Object.entries(codeToDesc)) {
  const terrainId = resolveTerrain(desc);
  if (terrainId) {
    codeToTerrain[code] = terrainId;
  } else {
    // Unmapped codes default to 'plains' as per requirement
    codeToTerrain[code] = 'plains';
    unmappedCodes.push({ code, desc });
  }
}

// 44 Chapter definitions mapping atlas file to game map ID
const CHAPTER_MAPPING = [
  { atlas: 'book1/b1c01.md', id: 'chapter_01_talys', book: 1, chapter: 1, title: 'Chapter 1: Marth Embarks' },
  { atlas: 'book1/b1c02.md', id: 'chapter_02_galder', book: 1, chapter: 2, title: 'Chapter 2: The Pirates of Galder' },
  { atlas: 'book1/b1c03.md', id: 'chapter_03_devil_mountain', book: 1, chapter: 3, title: 'Chapter 3: The Devil Mountain' },
  { atlas: 'book1/b1c04.md', id: 'chapter_04_champions_of_aurelis', book: 1, chapter: 4, title: 'Chapter 4: Champions of Aurelis' },
  { atlas: 'book1/b1c05.md', id: 'chapter_05_fire_emblem', book: 1, chapter: 5, title: 'Chapter 5: Fire Emblem' },
  { atlas: 'book1/b1c06.md', id: 'chapter_06_lefcandith_gauntlet', book: 1, chapter: 6, title: 'Chapter 6: Lefcandith Gauntlet' },
  { atlas: 'book1/b1c07.md', id: 'chapter_07_port_warren', book: 1, chapter: 7, title: 'Chapter 7: Port Warren' },
  { atlas: 'book1/b1c08.md', id: 'chapter_08_princess_minerva', book: 1, chapter: 8, title: 'Chapter 8: Princess Minerva' },
  { atlas: 'book1/b1c09.md', id: 'chapter_09_knorda_market', book: 1, chapter: 9, title: 'Chapter 9: Knorda Market' },
  { atlas: 'book1/b1c10.md', id: 'chapter_10_the_ageless_palace', book: 1, chapter: 10, title: 'Chapter 10: The Ageless Palace' },
  { atlas: 'book1/b1c11.md', id: 'chapter_11_land_of_sorrow', book: 1, chapter: 11, title: 'Chapter 11: Land of Sorrow' },
  { atlas: 'book1/b1c12.md', id: 'chapter_12_an_oasis_of_magic', book: 1, chapter: 12, title: 'Chapter 12: An Oasis of Magic' },
  { atlas: 'book1/b1c13.md', id: 'chapter_13_the_battle_for_altea', book: 1, chapter: 13, title: 'Chapter 13: The Battle for Altea' },
  { atlas: 'book1/b1c14.md', id: 'chapter_14_star_and_savior', book: 1, chapter: 14, title: 'Chapter 14: Star and Savior' },
  { atlas: 'book1/b1c15.md', id: 'chapter_15_manakete_princess', book: 1, chapter: 15, title: 'Chapter 15: Manakete Princess' },
  { atlas: 'book1/b1c16.md', id: 'chapter_16_camus_the_sable', book: 1, chapter: 16, title: 'Chapter 16: Camus the Sable' },
  { atlas: 'book1/b1c17.md', id: 'chapter_17_a_knight_filled_sky', book: 1, chapter: 17, title: 'Chapter 17: A Knight-Filled Sky' },
  { atlas: 'book1/b1c18.md', id: 'chapter_18_dark_pontifex', book: 1, chapter: 18, title: 'Chapter 18: Dark Pontifex' },
  { atlas: 'book1/b1c19.md', id: 'chapter_19_the_dragonkin_realm', book: 1, chapter: 19, title: 'Chapter 19: The Dragonkin Realm' },
  { atlas: 'book1/b1c20.md', id: 'chapter_20_chosen_by_fate', book: 1, chapter: 20, title: 'Chapter 20: Chosen by Fate' },
  { atlas: 'book2/b2c01.md', id: 'book2_chapter_01_the_grustian_expedition', book: 2, chapter: 1, title: 'Book 2 Chapter 1: The Grustian Expedition' },
  { atlas: 'book2/b2c02.md', id: 'book2_chapter_02_macedonian_uprising', book: 2, chapter: 2, title: 'Book 2 Chapter 2: Macedonian Uprising' },
  { atlas: 'book2/b2c03.md', id: 'book2_chapter_03_abducted_princess', book: 2, chapter: 3, title: 'Book 2 Chapter 3: Abducted Princess' },
  { atlas: 'book2/b2c04.md', id: 'book2_chapter_04_joy_and_sorrow', book: 2, chapter: 4, title: 'Book 2 Chapter 4: Joy and Sorrow' },
  { atlas: 'book2/b2c05.md', id: 'book2_chapter_05_liberation_of_grust', book: 2, chapter: 5, title: 'Book 2 Chapter 5: Liberation of Grust' },
  { atlas: 'book2/b2c06.md', id: 'book2_chapter_06_the_nest_of_evil', book: 2, chapter: 6, title: 'Book 2 Chapter 6: The Nest of Evil' },
  { atlas: 'book2/b2c07.md', id: 'book2_chapter_07_the_scarlet_sword', book: 2, chapter: 7, title: 'Book 2 Chapter 7: The Scarlet Sword' },
  { atlas: 'book2/b2c08.md', id: 'book2_chapter_08_soulful_bridge', book: 2, chapter: 8, title: 'Book 2 Chapter 8: Soulful Bridge' },
  { atlas: 'book2/b2c09.md', id: 'book2_chapter_09_sanctuary_of_sorcery', book: 2, chapter: 9, title: 'Book 2 Chapter 9: Sanctuary of Sorcery' },
  { atlas: 'book2/b2c10.md', id: 'book2_chapter_10_the_two_mages', book: 2, chapter: 10, title: 'Book 2 Chapter 10: The Two Mages' },
  { atlas: 'book2/b2c11.md', id: 'book2_chapter_11_anris_way', book: 2, chapter: 11, title: "Book 2 Chapter 11: Anri's Way" },
  { atlas: 'book2/b2c12.md', id: 'book2_chapter_12_graveyard_of_fire_dragons', book: 2, chapter: 12, title: 'Book 2 Chapter 12: Graveyard of Fire Dragons' },
  { atlas: 'book2/b2c13.md', id: 'book2_chapter_13_frozen_land', book: 2, chapter: 13, title: 'Book 2 Chapter 13: Frozen Land' },
  { atlas: 'book2/b2c14.md', id: 'book2_chapter_14_a_mystery_revealed', book: 2, chapter: 14, title: 'Book 2 Chapter 14: A Mystery Revealed' },
  { atlas: 'book2/b2c15.md', id: 'book2_chapter_15_return_of_the_prince', book: 2, chapter: 15, title: 'Book 2 Chapter 15: Return of the Prince' },
  { atlas: 'book2/b2c16.md', id: 'book2_chapter_16_regaining_the_capital', book: 2, chapter: 16, title: 'Book 2 Chapter 16: Regaining the Capital' },
  { atlas: 'book2/b2c17.md', id: 'book2_chapter_17_gras_sun_sets', book: 2, chapter: 17, title: "Book 2 Chapter 17: Gra's Sun Sets" },
  { atlas: 'book2/b2c18.md', id: 'book2_chapter_18_battle_of_the_pass', book: 2, chapter: 18, title: 'Book 2 Chapter 18: Battle of the Pass' },
  { atlas: 'book2/b2c19.md', id: 'book2_chapter_19_the_last_decisive_battle', book: 2, chapter: 19, title: 'Book 2 Chapter 19: The Last Decisive Battle' },
  { atlas: 'book2/b2c20.md', id: 'book2_chapter_20_the_dark_emperor', book: 2, chapter: 20, title: 'Book 2 Chapter 20: The Dark Emperor' },
  { atlas: 'book2/b2c21.md', id: 'book2_chapter_21_the_wyverns_dale', book: 2, chapter: 21, title: "Book 2 Chapter 21: The Wyvern's Dale" },
  { atlas: 'book2/b2c22a.md', id: 'book2_endgame_a', book: 2, chapter: 22, title: 'Book 2 Endgame: The Dragon Altar, Part 1' },
  { atlas: 'book2/b2c22b.md', id: 'book2_endgame_b', book: 2, chapter: 22, title: 'Book 2 Endgame: The Dragon Altar, Part 2' },
  { atlas: 'book2/b2c22c.md', id: 'book2_endgame_c', book: 2, chapter: 22, title: 'Book 2 Endgame: The Dragon Altar, Part 3' },
];

const EXISTING_MAP_IDS = new Set([
  'chapter_01_talys',
  'chapter_02_galder',
  'chapter_03_devil_mountain',
  'chapter_04_champions_of_aurelis',
]);

const report = {
  total: CHAPTER_MAPPING.length,
  mapsGenerated: 0,
  referencesGenerated: 0,
  unmappedCodesInUse: [],
  mapsWithUncertain: [],
  mapsWithQuestionMark: [],
  existingMapDiffs: {},
};

for (const entry of CHAPTER_MAPPING) {
  const atlasPath = path.join(atlasDir, entry.atlas);
  const atlasContent = fs.readFileSync(atlasPath, 'utf8');
  const lines = atlasContent.split(/\r?\n/);

  // Parse size: 'size WxH'
  const sizeLine = lines.find((l) => l.startsWith('size '));
  const mSize = sizeLine ? sizeLine.match(/size\s+(\d+)x(\d+)/) : null;
  if (!mSize) {
    throw new Error(`Cannot parse size in ${entry.atlas}`);
  }
  const width = parseInt(mSize[1], 10);
  const height = parseInt(mSize[2], 10);

  // Check uncertain lines
  const uncertainLines = lines.filter((l) => l.startsWith('uncertain:'));
  if (uncertainLines.length > 0) {
    report.mapsWithUncertain.push({
      file: entry.atlas,
      id: entry.id,
      notes: uncertainLines.map((l) => l.replace(/^uncertain:\s*/, '')),
    });
  }

  // Parse grid rows
  let inGrid = false;
  const rows = [];
  let hasQuestionMark = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inGrid = !inGrid;
      continue;
    }
    if (inGrid) {
      const m = line.match(/^\s*\d+\s+(.+)$/);
      if (m) {
        const rowStr = m[1].trimEnd();
        rows.push(rowStr);
        if (rowStr.includes('?')) hasQuestionMark = true;
      }
    }
  }

  if (hasQuestionMark) {
    report.mapsWithQuestionMark.push(entry.id);
  }

  if (rows.length !== height) {
    throw new Error(`Height mismatch in ${entry.atlas}: expected ${height}, got ${rows.length}`);
  }
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].length !== width) {
      throw new Error(`Width mismatch in ${entry.atlas} row ${r}: expected ${width}, got ${rows[r].length}`);
    }
  }

  // Convert rows to game grid using parsed code table
  const grid = [];
  const elevations = [];
  const mapLegend = {};

  for (let y = 0; y < height; y++) {
    const gridRow = [];
    const elevRow = [];
    for (let x = 0; x < width; x++) {
      const code = rows[y][x];
      const terrain = codeToTerrain[code] || 'plains';
      gridRow.push(terrain);
      elevRow.push(0);
      mapLegend[code] = terrain;

      if (!validTerrains.has(codeToDesc[code])) {
        // Track unmapped codes falling back to plains
        if (codeToTerrain[code] === 'plains' && codeToDesc[code] !== 'plains') {
          if (!report.unmappedCodesInUse.some((u) => u.code === code && u.mapId === entry.id)) {
            report.unmappedCodesInUse.push({
              mapId: entry.id,
              code,
              desc: codeToDesc[code] || 'unknown',
              fallback: 'plains',
              at: `(${x},${y})`,
            });
          }
        }
      }
    }
    grid.push(gridRow);
    elevations.push(elevRow);
  }

  // Check against existing map if present
  const mapOutPath = path.join(repoRoot, 'Water-Emblem/data/maps', `${entry.id}.json`);
  const isExisting = EXISTING_MAP_IDS.has(entry.id);

  if (isExisting && fs.existsSync(mapOutPath)) {
    const current = JSON.parse(fs.readFileSync(mapOutPath, 'utf8'));
    const diffs = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (current.grid[y]?.[x] !== grid[y][x]) {
          diffs.push({
            x,
            y,
            code: rows[y][x],
            atlasTerrain: grid[y][x],
            currentTerrain: current.grid[y]?.[x],
          });
        }
      }
    }
    if (diffs.length > 0) {
      report.existingMapDiffs[entry.id] = diffs;
      // Do NOT overwrite existing map when diffs exist (instruction 5)
      console.log(`[SKIP OVERWRITE] ${entry.id} differs in ${diffs.length} cells. Preserving existing map.`);
    } else {
      console.log(`[IDENTICAL] ${entry.id} matches atlas grid exactly.`);
    }
  } else {
    // Generate new map file
    const mapData = {
      id: entry.id,
      name: entry.title,
      width,
      height,
      grid,
      elevations,
    };
    fs.writeFileSync(mapOutPath, JSON.stringify(mapData, null, 2) + '\n', 'utf8');
    report.mapsGenerated++;
  }

  // Generate / update FE3 reference file
  const refOutPath = path.join(repoRoot, 'Water-Emblem/data/reference/fe3', `${entry.id}.json`);
  if (!fs.existsSync(refOutPath) || !isExisting) {
    const refData = {
      mapId: entry.id,
      game: 'Fire Emblem 3: Mystery of the Emblem',
      book: entry.book,
      chapter: entry.chapter,
      width,
      height,
      origin: 'x=0 left, y=0 top',
      sources: {
        atlas: entry.atlas,
        checkedOn: '2026-11-22',
        uncertain: uncertainLines.map((l) => l.replace(/^uncertain:\s*/, '')),
      },
      legend: mapLegend,
      rows,
    };
    fs.writeFileSync(refOutPath, JSON.stringify(refData, null, 2) + '\n', 'utf8');
    report.referencesGenerated++;
  }
}

// Print comprehensive report
console.log('\n================ FE3 ATLAS TO MAPS REPORT ================');
console.log(`Total chapters processed: ${report.total}`);
console.log(`New maps generated: ${report.mapsGenerated}`);
console.log(`New references generated: ${report.referencesGenerated}`);
console.log(`Maps with '?' code: ${report.mapsWithQuestionMark.length === 0 ? 'None' : report.mapsWithQuestionMark.join(', ')}`);
console.log(`Maps with 'uncertain:' line in atlas: ${report.mapsWithUncertain.length}`);
for (const u of report.mapsWithUncertain) {
  console.log(`  - ${u.id} (${u.file}):`);
  for (const n of u.notes) console.log(`      * ${n}`);
}

console.log('\nUnmapped codes that fell back to "plains":');
if (report.unmappedCodesInUse.length === 0) {
  console.log('  None');
} else {
  for (const u of report.unmappedCodesInUse) {
    console.log(`  - Map '${u.mapId}': code '${u.code}' (${u.desc}) at ${u.at} -> fallback '${u.fallback}'`);
  }
}

console.log('\nExisting 4 maps comparison:');
for (const id of EXISTING_MAP_IDS) {
  const diffs = report.existingMapDiffs[id];
  if (!diffs || diffs.length === 0) {
    console.log(`  - ${id}: IDENTICAL to atlas (0 differences)`);
  } else {
    console.log(`  - ${id}: DIFFERS in ${diffs.length} cell(s) [PRESERVED, NOT OVERWRITTEN]:`);
    for (const d of diffs) {
      console.log(`      (${d.x}, ${d.y}): atlas code '${d.code}' -> '${d.atlasTerrain}', existing map: '${d.currentTerrain}'`);
    }
  }
}
console.log('==========================================================\n');
