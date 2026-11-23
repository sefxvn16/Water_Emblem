import type { MapData } from '../grid/types';
import type { DialogueLine } from '../chapter/events';
import type { ItemDefinition } from '../combat/types';
import type { ClassDefinition } from '../class/classRules';
import type { TerrainDefinition } from '../grid/types';

export interface ChapterDialogueData {
  chapterId: string;
  opening: DialogueLine[];
  villages?: Record<string, DialogueLine[]>;
  ending: DialogueLine[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a nonempty string`);
  return value;
}

function requireInteger(value: unknown, label: string, min?: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || (min !== undefined && value < min)) {
    throw new Error(`${label} must be an integer${min !== undefined ? ` >= ${min}` : ''}`);
  }
  return value;
}

export function validateMapData(raw: unknown, label = 'map'): MapData {
  const rec = requireRecord(raw, label);
  const id = requireString(rec.id, `${label}.id`);
  const name = requireString(rec.name, `${label}.name`);
  const width = requireInteger(rec.width, `${label}.width`, 1);
  const height = requireInteger(rec.height, `${label}.height`, 1);

  if (!Array.isArray(rec.grid) || rec.grid.length !== height) {
    throw new Error(`${label}.grid must be an array of length ${height}`);
  }

  const grid: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row = rec.grid[y];
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`${label}.grid[${y}] must be an array of length ${width}`);
    }
    const cleanRow: string[] = [];
    for (let x = 0; x < width; x++) {
      const cell = row[x];
      if (typeof cell !== 'string' || cell.trim() === '') {
        throw new Error(`${label}.grid[${y}][${x}] must be a valid terrain string`);
      }
      cleanRow.push(cell);
    }
    grid.push(cleanRow);
  }

  let elevations: number[][] | undefined;
  if (rec.elevations !== undefined) {
    if (!Array.isArray(rec.elevations) || rec.elevations.length !== height) {
      throw new Error(`${label}.elevations must be an array of length ${height}`);
    }
    elevations = [];
    for (let y = 0; y < height; y++) {
      const row = rec.elevations[y];
      if (!Array.isArray(row) || row.length !== width) {
        throw new Error(`${label}.elevations[${y}] must be an array of length ${width}`);
      }
      elevations.push(row.map((val, x) => requireInteger(val, `${label}.elevations[${y}][${x}]`)));
    }
  }

  return {
    id,
    name,
    width,
    height,
    grid,
    ...(elevations ? { elevations } : {}),
  };
}

export function validateDialogueLine(raw: unknown, label = 'dialogue'): DialogueLine {
  const rec = requireRecord(raw, label);
  const speaker = requireString(rec.speaker, `${label}.speaker`);
  const text = typeof rec.text === 'string' ? rec.text : '';
  const avatarUrl = typeof rec.avatarUrl === 'string' ? rec.avatarUrl : '';
  return {
    speaker,
    avatarUrl,
    text,
  };
}

export function validateChapterDialogue(raw: unknown, chapterId: string): ChapterDialogueData {
  const label = `dialogue.${chapterId}`;
  const rec = requireRecord(raw, label);
  const id = typeof rec.chapterId === 'string' ? rec.chapterId : chapterId;

  if (!Array.isArray(rec.opening)) {
    throw new Error(`${label}.opening must be an array`);
  }
  const opening = rec.opening.map((line, i) => validateDialogueLine(line, `${label}.opening[${i}]`));

  if (!Array.isArray(rec.ending)) {
    throw new Error(`${label}.ending must be an array`);
  }
  const ending = rec.ending.map((line, i) => validateDialogueLine(line, `${label}.ending[${i}]`));

  let villages: Record<string, DialogueLine[]> | undefined;
  if (rec.villages !== undefined) {
    const vRec = requireRecord(rec.villages, `${label}.villages`);
    villages = {};
    for (const [vKey, vVal] of Object.entries(vRec)) {
      if (!Array.isArray(vVal)) {
        throw new Error(`${label}.villages.${vKey} must be an array of lines`);
      }
      villages[vKey] = vVal.map((line, i) => validateDialogueLine(line, `${label}.villages.${vKey}[${i}]`));
    }
  }

  return {
    chapterId: id,
    opening,
    ending,
    ...(villages ? { villages } : {}),
  };
}

export function validateDefaultDialogues(raw: unknown): { defaultVillage: DialogueLine[] } {
  const rec = requireRecord(raw, 'default_dialogues');
  if (!Array.isArray(rec.defaultVillage)) {
    throw new Error('default_dialogues.defaultVillage must be an array');
  }
  return {
    defaultVillage: rec.defaultVillage.map((line, i) => validateDialogueLine(line, `defaultVillage[${i}]`)),
  };
}

export function validateItemCatalog(raw: unknown): readonly ItemDefinition[] {
  const rec = requireRecord(raw, 'items catalog');
  if (!Array.isArray(rec.items)) throw new Error('items.json must contain items array');
  for (let i = 0; i < rec.items.length; i++) {
    const itemRec = requireRecord(rec.items[i], `items[${i}]`);
    requireString(itemRec.id, `items[${i}].id`);
    requireString(itemRec.name, `items[${i}].name`);
    if (typeof itemRec.type !== 'string') throw new Error(`items[${i}].type must be a string`);
  }
  return rec.items as readonly ItemDefinition[];
}

export function validateClassCatalog(raw: unknown): readonly ClassDefinition[] {
  const rec = requireRecord(raw, 'classes catalog');
  if (!Array.isArray(rec.classes)) throw new Error('classes.json must contain classes array');
  for (let i = 0; i < rec.classes.length; i++) {
    const clsRec = requireRecord(rec.classes[i], `classes[${i}]`);
    requireString(clsRec.id, `classes[${i}].id`);
    requireString(clsRec.name, `classes[${i}].name`);
    requireString(clsRec.moveType, `classes[${i}].moveType`);
    requireInteger(clsRec.baseMov, `classes[${i}].baseMov`, 1);
  }
  return rec.classes as readonly ClassDefinition[];
}

export function validateTerrainData(raw: unknown): readonly TerrainDefinition[] {
  const rec = requireRecord(raw, 'terrains catalog');
  if (!Array.isArray(rec.terrains)) throw new Error('terrains.json must contain terrains array');
  for (let i = 0; i < rec.terrains.length; i++) {
    const tRec = requireRecord(rec.terrains[i], `terrains[${i}]`);
    requireString(tRec.id, `terrains[${i}].id`);
    requireString(tRec.name, `terrains[${i}].name`);
    requireRecord(tRec.movementCosts, `terrains[${i}].movementCosts`);
  }
  return rec.terrains as readonly TerrainDefinition[];
}
