import chapterJson from '../../../data/chapters/test_chapter_01.json';
import mapJson from '../../../data/maps/test_map_01.json';
import itemsJson from '../../../data/items.json';
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

export function loadChapterData(raw: unknown, map: MapData, items: readonly ItemDefinition[]): ChapterData {
  const data = requireRecord(raw, 'chapter');
  const id = requireString(data.id, 'chapter.id');
  const name = requireString(data.name, 'chapter.name');
  const mapId = requireString(data.mapId, 'chapter.mapId');
  if (map.id !== mapId) throw new Error(`Chapter ${id} references unknown map ${mapId}`);

  const itemById = new Map(items.map((item) => [item.id, item]));
  if (itemById.size !== items.length) throw new Error('Duplicate item ID');

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
    const unit: GridUnit = {
      id: requireString(item.id, `${label}.id`),
      name: requireString(item.name, `${label}.name`),
      faction: requireChoice(item.faction, FACTIONS, `${label}.faction`),
      position: readPosition(item.position, map, `${label}.position`),
      mov: requireInteger(item.mov, `${label}.mov`),
      moveType: requireChoice(item.moveType, MOVE_TYPES, `${label}.moveType`),
      hasActed: false,
      isDead: false,
    };
    return {
      unit,
      stats: readStats(item.stats, `${label}.stats`),
      weapon,
      ...(item.aiRole === undefined ? {} : { aiRole: requireChoice(item.aiRole, AI_ROLES, `${label}.aiRole`) }),
      ...(typeof item.title === 'string' ? { title: item.title } : {}),
      ...(typeof item.avatarUrl === 'string' ? { avatarUrl: item.avatarUrl } : {}),
      ...(isRecord(item.growths) ? { growths: item.growths as Record<string, number> } : {}),
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

export const initialChapterData = loadChapterData(
  chapterJson,
  mapJson as MapData,
  itemsJson.items as ItemDefinition[],
);
