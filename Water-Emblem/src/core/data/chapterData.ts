import testChapterJson from '../../../data/chapters/test_chapter_01.json';
import testMapJson from '../../../data/maps/test_map_01.json';
import talysChapterJson from '../../../data/chapters/chapter_01_talys.json';
import talysMapJson from '../../../data/maps/chapter_01_talys.json';
import itemsJson from '../../../data/items.json';
import charactersJson from '../../../data/characters.json';
import classesJson from '../../../data/classes.json';
import type { AIRole } from '../ai/decision';
import type { ChapterObjective } from '../chapter/types';
import type { ItemDefinition, UnitCombatStats } from '../combat/types';
import type { GridUnit, MapData, MoveType, UnitFaction } from '../grid/types';

export interface ExtendedUnitState {
  unit: GridUnit;
  stats: UnitCombatStats;
  weapon: ItemDefinition;
  aiRole?: AIRole;
  title?: string;
  avatarUrl?: string;
  growths?: Record<string, number>;
}

export interface IntroLine {
  readonly speaker: string;
  readonly text: string;
}

export interface ChapterData {
  readonly id: string;
  readonly name: string;
  readonly mapId: string;
  readonly objective: ChapterObjective;
  readonly introLines: readonly IntroLine[];
  readonly units: ExtendedUnitState[];
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): RecordValue {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a nonempty string`);
  return value;
}

function requireNumber(value: unknown, label: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new Error(`${label} must be a finite number >= ${min}`);
  }
  return value;
}

function requireInteger(value: unknown, label: string, min = 0): number {
  const result = requireNumber(value, label, min);
  if (!Number.isInteger(result)) throw new Error(`${label} must be an integer`);
  return result;
}

const MOVE_TYPES: readonly MoveType[] = ['foot', 'armor', 'cavalry', 'flier', 'mage', 'bandit'];
const FACTIONS: readonly UnitFaction[] = ['player', 'enemy', 'ally'];
const AI_ROLES: readonly AIRole[] = ['stationary', 'pursue'];

function requireChoice<T extends string>(value: unknown, choices: readonly T[], label: string): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) {
    throw new Error(`${label} has an unsupported value`);
  }
  return value as T;
}

function readPosition(value: unknown, map: MapData, label: string): { x: number; y: number } {
  const position = requireRecord(value, label);
  const x = requireInteger(position.x, `${label}.x`);
  const y = requireInteger(position.y, `${label}.y`);
  if (x >= map.width || y >= map.height) throw new Error(`${label} is outside map`);
  return { x, y };
}

function readStats(value: unknown, label: string): UnitCombatStats {
  const data = requireRecord(value, label);
  const stats: UnitCombatStats = {
    hp: requireInteger(data.hp, `${label}.hp`),
    maxHp: requireInteger(data.maxHp, `${label}.maxHp`, 1),
    str: requireInteger(data.str, `${label}.str`),
    mag: requireInteger(data.mag, `${label}.mag`),
    dex: requireInteger(data.dex, `${label}.dex`),
    spd: requireInteger(data.spd, `${label}.spd`),
    lck: requireInteger(data.lck, `${label}.lck`),
    def: requireInteger(data.def, `${label}.def`),
    res: requireInteger(data.res, `${label}.res`),
  };
  if (stats.hp > stats.maxHp) throw new Error(`${label}.hp exceeds maxHp`);
  if (data.bld !== undefined) stats.bld = requireInteger(data.bld, `${label}.bld`);
  return stats;
}

function readGrowths(value: unknown, label: string): Record<string, number> {
  const data = requireRecord(value, label);
  const growths: Record<string, number> = {};
  for (const key of ['hp', 'str', 'mag', 'dex', 'spd', 'lck', 'def', 'res']) {
    const rate = requireInteger(data[key], `${label}.${key}`);
    if (rate > 100) throw new Error(`${label}.${key} exceeds 100`);
    growths[key] = rate;
  }
  return growths;
}

export function loadChapterData(
  raw: unknown,
  map: MapData,
  items: readonly ItemDefinition[],
  characterCatalog: unknown = charactersJson,
  classCatalog: unknown = classesJson,
): ChapterData {
  const data = requireRecord(raw, 'chapter');
  const id = requireString(data.id, 'chapter.id');
  const name = requireString(data.name, 'chapter.name');
  const mapId = requireString(data.mapId, 'chapter.mapId');
  if (map.id !== mapId) throw new Error(`Chapter ${id} references unknown map ${mapId}`);

  const itemById = new Map(items.map((item) => [item.id, item]));
  if (itemById.size !== items.length) throw new Error('Duplicate item ID');
  const characterRows = requireRecord(characterCatalog, 'characters').characters;
  const classRows = requireRecord(classCatalog, 'classes').classes;
  if (!Array.isArray(characterRows) || !Array.isArray(classRows)) throw new Error('Catalog entries must be arrays');
  const characterById = new Map<string, RecordValue>();
  const classById = new Map<string, RecordValue>();
  for (const value of characterRows) {
    const character = requireRecord(value, 'character');
    const characterId = requireString(character.id, 'character.id');
    if (characterById.has(characterId)) throw new Error(`Duplicate character ID ${characterId}`);
    characterById.set(characterId, character);
  }
  for (const value of classRows) {
    const classData = requireRecord(value, 'class');
    const classId = requireString(classData.id, 'class.id');
    if (classById.has(classId)) throw new Error(`Duplicate class ID ${classId}`);
    classById.set(classId, classData);
  }

  const objectiveRaw = requireRecord(data.objective, 'chapter.objective');
  const objectiveType = requireChoice(objectiveRaw.type, ['defeat_boss', 'rout', 'seize'], 'chapter.objective.type');
  const objective: ChapterObjective = {
    type: objectiveType,
    descriptionVi: requireString(objectiveRaw.descriptionVi, 'chapter.objective.descriptionVi'),
    ...(objectiveType === 'defeat_boss'
      ? { bossUnitId: requireString(objectiveRaw.bossUnitId, 'chapter.objective.bossUnitId') }
      : {}),
    ...(objectiveType === 'seize'
      ? { seizeTargetTile: readPosition(objectiveRaw.seizeTargetTile, map, 'chapter.objective.seizeTargetTile') }
      : {}),
  };

  if (!Array.isArray(data.introLines)) throw new Error('chapter.introLines must be an array');
  const introLines: IntroLine[] = data.introLines.map((line: unknown, index: number) => {
    const item = requireRecord(line, `chapter.introLines[${index}]`);
    return {
      speaker: requireString(item.speaker, `chapter.introLines[${index}].speaker`),
      text: requireString(item.text, `chapter.introLines[${index}].text`),
    };
  });

  if (!Array.isArray(data.units) || data.units.length === 0) throw new Error('chapter.units must be a nonempty array');
  const units: ExtendedUnitState[] = data.units.map((value: unknown, index: number) => {
    const label = `chapter.units[${index}]`;
    const item = requireRecord(value, label);
    const weaponId = requireString(item.weaponId, `${label}.weaponId`);
    const weapon = itemById.get(weaponId);
    if (!weapon) throw new Error(`${label} references unknown weapon ${weaponId}`);
    const characterId = requireString(item.characterId, `${label}.characterId`);
    const character = characterById.get(characterId);
    if (!character) throw new Error(`${label} references unknown character ${characterId}`);
    const classId = requireString(character.classId, `character ${characterId}.classId`);
    const classData = classById.get(classId);
    if (!classData) throw new Error(`Character ${characterId} references unknown class ${classId}`);
    const baseStats = requireRecord(character.baseStats, `character ${characterId}.baseStats`);
    const hp = requireInteger(baseStats.hp, `character ${characterId}.baseStats.hp`, 1);
    const unit: GridUnit = {
      id: requireString(item.id, `${label}.id`),
      name: item.name === undefined
        ? requireString(character.name, `character ${characterId}.name`)
        : requireString(item.name, `${label}.name`),
      faction: requireChoice(item.faction, FACTIONS, `${label}.faction`),
      position: readPosition(item.position, map, `${label}.position`),
      mov: item.mov === undefined
        ? requireInteger(classData.baseMov, `class ${classId}.baseMov`)
        : requireInteger(item.mov, `${label}.mov`),
      moveType: requireChoice(classData.moveType, MOVE_TYPES, `class ${classId}.moveType`),
      hasActed: false,
      isDead: false,
    };
    return {
      unit,
      stats: readStats({ ...baseStats, maxHp: hp }, `character ${characterId}.baseStats`),
      weapon,
      ...(item.aiRole === undefined ? {} : { aiRole: requireChoice(item.aiRole, AI_ROLES, `${label}.aiRole`) }),
      title: requireString(character.title, `character ${characterId}.title`),
      avatarUrl: requireString(character.avatarUrl, `character ${characterId}.avatarUrl`),
      growths: readGrowths(character.growths, `character ${characterId}.growths`),
    };
  });

  const ids = units.map(({ unit }) => unit.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate unit ID');
  const positions = units.map(({ unit }) => `${unit.position.x},${unit.position.y}`);
  if (new Set(positions).size !== positions.length) throw new Error('Multiple units occupy one tile');
  if (!ids.includes('marth')) throw new Error('Chapter is missing Marth');
  if (objective.type === 'defeat_boss' && !ids.includes(objective.bossUnitId ?? '')) {
    throw new Error('Chapter boss ID does not reference a unit');
  }

  return { id, name, mapId, objective, introLines, units };
}

export const chapter01Data = loadChapterData(
  talysChapterJson,
  talysMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

export const testChapter01Data = loadChapterData(
  testChapterJson,
  testMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

export const chapters: Record<string, ChapterData> = {
  chapter_01: chapter01Data,
  test_chapter_01: testChapter01Data,
};

export const initialChapterData = chapter01Data;
