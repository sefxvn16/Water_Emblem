import Dexie, { type Table } from 'dexie';
import talysMapJson from '../../data/maps/chapter_01_talys.json';
import galderMapJson from '../../data/maps/chapter_02_galder.json';
import testMapJson from '../../data/maps/test_map_01.json';
import itemsJson from '../../data/items.json';
import type { ChapterOutcome } from '../core/chapter/types';
import type { ItemDefinition } from '../core/combat/types';
import { chapters, type ExtendedUnitState } from '../core/data/chapterData';
import type { GamePhase } from '../core/turn/turnManager';

const mapsById: Record<string, { width: number; height: number }> = {
  chapter_01_talys: talysMapJson,
  chapter_02_galder: galderMapJson,
  test_map_01: testMapJson,
};

export interface GameSnapshot {
  chapterId: string;
  turnState: { turnNumber: number; activePhase: GamePhase };
  extendedUnits: ExtendedUnitState[];
  reserveUnits?: ExtendedUnitState[];
  rngSeed: number;
  chapterOutcome: ChapterOutcome;
  showStoryIntro: boolean;
  combatLog: string[];
}

export interface SaveGameData extends GameSnapshot {
  version: string;
  timestamp: number;
}

interface SaveRecord extends SaveGameData {
  slot: string;
}

const SAVE_VERSION = '2.0.0';
const SAVE_SLOT = 'main';

class WaterEmblemDatabase extends Dexie {
  saves!: Table<SaveRecord, string>;

  constructor() {
    super('water_emblem');
    this.version(1).stores({ saves: 'slot' });
  }
}

const database = new WaterEmblemDatabase();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function matchesWeapon(value: ItemDefinition, expected: ItemDefinition): boolean {
  const fields: readonly (keyof ItemDefinition)[] = [
    'id', 'name', 'nameVi', 'type', 'might', 'hit', 'weight', 'crit',
    'minRange', 'maxRange', 'maxUses', 'isMagic',
  ];
  return fields.every((field) => value[field] === expected[field])
    && Array.isArray(value.effectiveAgainst)
    && value.effectiveAgainst.length === expected.effectiveAgainst.length
    && value.effectiveAgainst.every((type, index) => type === expected.effectiveAgainst[index]);
}

const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));

function isStats(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = ['hp', 'maxHp', 'str', 'mag', 'dex', 'spd', 'lck', 'def', 'res'];
  return keys.every((key) => isNonnegativeInteger(value[key]))
    && typeof value.maxHp === 'number' && value.maxHp > 0
    && typeof value.hp === 'number' && value.hp <= value.maxHp
    && (value.bld === undefined || isNonnegativeInteger(value.bld));
}

function isSavedUnit(value: unknown): value is ExtendedUnitState {
  if (!isRecord(value) || !isRecord(value.unit) || !isRecord(value.weapon)) return false;
  const unit = value.unit;
  if (!isRecord(unit.position)) return false;
  return typeof unit.id === 'string'
    && unit.id.length > 0
    && typeof unit.name === 'string'
    && (unit.faction === 'player' || unit.faction === 'enemy' || unit.faction === 'ally')
    && isNonnegativeInteger(unit.position.x)
    && isNonnegativeInteger(unit.position.y)
    && isNonnegativeInteger(unit.mov)
    && ['foot', 'armor', 'cavalry', 'flier', 'mage', 'bandit'].includes(unit.moveType as string)
    && typeof unit.isDead === 'boolean'
    && typeof unit.hasActed === 'boolean'
    && isStats(value.stats)
    && typeof value.weapon.id === 'string'
    && (value.aiRole === undefined || value.aiRole === 'stationary' || value.aiRole === 'pursue');
}

export function isGameSnapshot(value: unknown): value is GameSnapshot {
  if (!isRecord(value) || !isRecord(value.turnState) || !Array.isArray(value.extendedUnits)) return false;
  const chapter = chapters[value.chapterId as string];
  if (!chapter) return false;
  const map = mapsById[chapter.mapId];
  if (!map) return false;
  if (!Number.isInteger(value.turnState.turnNumber) || (value.turnState.turnNumber as number) < 1) return false;
  if (value.turnState.activePhase !== 'player_phase' && value.turnState.activePhase !== 'enemy_phase') return false;
  if (typeof value.rngSeed !== 'number' || !Number.isInteger(value.rngSeed)
    || value.rngSeed < -0x80000000 || value.rngSeed > 0xffffffff) return false;
  if (value.chapterOutcome !== 'ongoing' && value.chapterOutcome !== 'victory' && value.chapterOutcome !== 'defeat') return false;
  if (typeof value.showStoryIntro !== 'boolean') return false;
  if (!Array.isArray(value.combatLog) || !value.combatLog.every((entry) => typeof entry === 'string')) return false;
  const reserveUnits = value.reserveUnits === undefined ? [] : value.reserveUnits;
  if (!Array.isArray(reserveUnits) || !reserveUnits.every(isSavedUnit)) return false;
  if (value.extendedUnits.length + reserveUnits.length < chapter.units.length
    || value.extendedUnits.length + reserveUnits.length > chapter.units.length + chapter.optionalUnits.length
    || !value.extendedUnits.every(isSavedUnit)) return false;

  const savedUnits = [...value.extendedUnits, ...reserveUnits] as ExtendedUnitState[];
  const reserveIds = new Set((reserveUnits as ExtendedUnitState[]).map(({ unit }) => unit.id));
  const expected = new Map([...chapter.units, ...chapter.optionalUnits].map((item) => [item.unit.id, item]));
  const mandatoryIds = new Set(chapter.units.map((item) => item.unit.id));
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const { unit, stats, weapon } of savedUnits) {
    const original = expected.get(unit.id);
    const catalogWeapon = itemById.get(weapon.id);
    if (ids.has(unit.id) || !original || !catalogWeapon || !matchesWeapon(weapon, catalogWeapon)) return false;
    if (unit.moveType !== original.unit.moveType || unit.mov !== original.unit.mov) return false;
    if (unit.faction !== original.unit.faction
      && !(original.unit.faction === 'enemy' && unit.faction === 'player'
        && chapter.recruitments.some(({ targetUnitId }) => targetUnitId === unit.id))) return false;
    ids.add(unit.id);
    if (unit.position.x >= map.width || unit.position.y >= map.height) return false;
    if (unit.isDead !== (stats.hp === 0)) return false;
    if (reserveIds.has(unit.id) && unit.faction !== 'player') return false;
    if (!unit.isDead && !reserveIds.has(unit.id)) {
      const position = `${unit.position.x},${unit.position.y}`;
      if (positions.has(position)) return false;
      positions.add(position);
    }
  }
  return [...mandatoryIds].every((id) => ids.has(id))
    && value.extendedUnits.some((entry: ExtendedUnitState) => entry.unit.id === 'marth');
}

export function isSaveGameData(value: unknown): value is SaveGameData {
  return isRecord(value)
    && value.version === SAVE_VERSION
    && isNonnegativeInteger(value.timestamp)
    && isGameSnapshot(value);
}

export async function saveGameState(snapshot: GameSnapshot): Promise<boolean> {
  if (!isGameSnapshot(snapshot)) return false;
  try {
    const record: SaveRecord = {
      ...snapshot,
      slot: SAVE_SLOT,
      version: SAVE_VERSION,
      timestamp: Date.now(),
    };
    await database.saves.put(record);
    return true;
  } catch (error) {
    console.error('Không thể lưu game:', error);
    return false;
  }
}

export async function loadGameState(): Promise<SaveGameData | null> {
  try {
    const record: unknown = await database.saves.get(SAVE_SLOT);
    if (!isSaveGameData(record)) return null;
    return record;
  } catch (error) {
    console.error('Không thể tải game:', error);
    return null;
  }
}

export async function hasSavedGame(): Promise<boolean> {
  try {
    return isSaveGameData(await database.saves.get(SAVE_SLOT));
  } catch {
    return false;
  }
}
