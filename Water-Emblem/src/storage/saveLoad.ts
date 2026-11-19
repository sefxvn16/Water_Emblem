import Dexie, { type Table } from 'dexie';
import talysMapJson from '../../data/maps/chapter_01_talys.json';
import galderMapJson from '../../data/maps/chapter_02_galder.json';
import devilMountainMapJson from '../../data/maps/chapter_03_devil_mountain.json';
import testMapJson from '../../data/maps/test_map_01.json';
import itemsJson from '../../data/items.json';
import type { ChapterOutcome } from '../core/chapter/types';
import { DIFFICULTIES, type Difficulty } from '../core/chapter/difficulty';
import { SKILLS } from '../core/combat/skills';
import type { ItemDefinition } from '../core/combat/types';
import { chapters, type ExtendedUnitState, type InventoryEntry } from '../core/data/chapterData';
import type { GamePhase } from '../core/turn/turnManager';
import { getClassDefinition, getDismountedClassId, isGroundDismountedForm } from '../core/class/classRules';

const mapsById: Record<string, { width: number; height: number }> = {
  chapter_01_talys: talysMapJson,
  chapter_02_galder: galderMapJson,
  chapter_03_devil_mountain: devilMountainMapJson,
  test_map_01: testMapJson,
};

export interface GameSnapshot {
  chapterId: string;
  turnState: { turnNumber: number; activePhase: GamePhase };
  extendedUnits: ExtendedUnitState[];
  reserveUnits?: ExtendedUnitState[];
  /** Convoy contents (PLAN item 88); absent in older saves = empty. */
  convoy?: InventoryEntry[];
  rngSeed: number;
  chapterOutcome: ChapterOutcome;
  showStoryIntro: boolean;
  combatLog: string[];
  gold: number;
  villageStates: Record<string, 'intact' | 'visited' | 'destroyed'>;
  /** Opened chests (PLAN item 92); absent in older saves = all closed. */
  chestStates?: Record<string, 'opened'>;
  /** Opened doors (PLAN item 92); absent in older saves = all closed. */
  doorStates?: Record<string, 'opened'>;
  /** Reinforcement groups already spawned (PLAN item 94); absent = none yet. */
  spawnedReinforcements?: string[];
  /** Playthrough difficulty (PLAN item 115); absent = normal. */
  difficulty?: Difficulty;
}

export interface SaveGameData extends GameSnapshot {
  version: string;
  timestamp: number;
}

interface SaveRecord extends SaveGameData {
  slot: string;
}

const SAVE_VERSION = '6.0.0';
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
    'minRange', 'maxRange', 'maxUses', 'isMagic', 'requiredRank',
    'healBase', 'healMagDivisor', 'healAmount',
  ];
  return fields.every((field) => value[field] === expected[field])
    && Array.isArray(value.effectiveAgainst)
    && value.effectiveAgainst.length === expected.effectiveAgainst.length
    && value.effectiveAgainst.every((type, index) => type === expected.effectiveAgainst[index]);
}

const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));

function isStats(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const keys = ['hp', 'maxHp', 'str', 'mag', 'skill', 'spd', 'lck', 'def', 'res'];
  return keys.every((key) => isNonnegativeInteger(value[key]))
    && typeof value.maxHp === 'number' && value.maxHp > 0
    && typeof value.hp === 'number' && value.hp <= value.maxHp
    && typeof value.maxHp === 'number' && value.maxHp <= 60
    && ['str', 'mag', 'skill', 'spd', 'lck', 'def', 'res'].every((key) => (value[key] as number) <= 30)
    && (value.bld === undefined || isNonnegativeInteger(value.bld));
}

function isSavedUnit(value: unknown): value is ExtendedUnitState {
  // weapon may be absent: an unarmed unit (last weapon broke — PLAN item 84).
  if (!isRecord(value) || !isRecord(value.unit) || (value.weapon !== undefined && !isRecord(value.weapon))) return false;
  const unit = value.unit;
  const weaponId = isRecord(value.weapon) ? value.weapon.id : undefined;
  if (!isRecord(unit.position)) return false;
  return typeof unit.id === 'string'
    && unit.id.length > 0
    && typeof unit.name === 'string'
    && (unit.faction === 'player' || unit.faction === 'enemy' || unit.faction === 'ally')
    && isNonnegativeInteger(unit.position.x)
    && isNonnegativeInteger(unit.position.y)
    && isNonnegativeInteger(unit.mov)
    && typeof unit.classId === 'string'
    && (unit.mountedClassId === undefined || typeof unit.mountedClassId === 'string')
    && ['foot', 'armor', 'cavalry', 'flier', 'mage', 'bandit'].includes(unit.moveType as string)
    && (unit.supportPoints === undefined || (isRecord(unit.supportPoints)
      && Object.values(unit.supportPoints).every((points) => isNonnegativeInteger(points) && points <= 35)))
    && typeof unit.isDead === 'boolean'
    && (unit.hasEscaped === undefined || typeof unit.hasEscaped === 'boolean')
    && typeof unit.hasActed === 'boolean'
    && isStats(value.stats)
    && Number.isInteger(value.level) && (value.level as number) >= 1 && (value.level as number) <= 20
    && isNonnegativeInteger(value.exp) && (value.exp as number) < 100
    && (weaponId === undefined || typeof weaponId === 'string')
    && Array.isArray(value.inventory)
    && value.inventory.every((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.itemId !== 'string') return false;
      const item = itemById.get(entry.itemId);
      return item !== undefined && Number.isInteger(entry.uses)
        && (entry.uses as number) >= 1 && (entry.uses as number) <= item.maxUses;
    })
    && (weaponId === undefined || value.inventory.some((entry: { itemId: string }) => entry.itemId === weaponId))
    && (value.aiRole === undefined || ['stationary', 'pursue', 'pillage', 'patrol', 'retreat', 'thief', 'flee'].includes(value.aiRole as string))
    && (value.personalSkill === undefined || (typeof value.personalSkill === 'string' && value.personalSkill in SKILLS))
    && (value.imitateBackup === undefined || (isRecord(value.imitateBackup) && isStats(value.imitateBackup.stats)));
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
  if (!isNonnegativeInteger(value.gold) || !isRecord(value.villageStates)) return false;
  const villageIds = new Set((chapter.villages ?? []).map(({ id }) => id));
  if (Object.entries(value.villageStates).some(([id, state]) =>
    !villageIds.has(id) || !['intact', 'visited', 'destroyed'].includes(state as string))) return false;
  const chestStates = value.chestStates === undefined ? {} : value.chestStates;
  if (!isRecord(chestStates)) return false;
  const chestIds = new Set((chapter.chests ?? []).map(({ id }) => id));
  if (Object.entries(chestStates).some(([id, state]) =>
    !chestIds.has(id) || state !== 'opened')) return false;
  const doorStates = value.doorStates === undefined ? {} : value.doorStates;
  if (!isRecord(doorStates)) return false;
  const doorIds = new Set((chapter.doors ?? []).map(({ id }) => id));
  if (Object.entries(doorStates).some(([id, state]) =>
    !doorIds.has(id) || state !== 'opened')) return false;
  const spawnedReinforcements = value.spawnedReinforcements === undefined ? [] : value.spawnedReinforcements;
  if (!Array.isArray(spawnedReinforcements)) return false;
  const reinforcementGroupIds = new Set((chapter.reinforcements ?? []).map(({ id }) => id));
  if (spawnedReinforcements.some((id: unknown) => typeof id !== 'string' || !reinforcementGroupIds.has(id))) return false;
  // PLAN item 143: the C12 destructible-object mechanic was removed by
  // owner order; an `objectStates` field left in an older save is ignored.
  // PLAN item 149: traps were removed by owner order; a `triggeredTraps`
  // field left in an older save is ignored.
  if (value.difficulty !== undefined && !DIFFICULTIES.includes(value.difficulty as Difficulty)) return false;
  const reinforcementUnits = (chapter.reinforcements ?? []).flatMap((group) => group.units);
  const reserveUnits = value.reserveUnits === undefined ? [] : value.reserveUnits;
  if (!Array.isArray(reserveUnits) || !reserveUnits.every(isSavedUnit)) return false;
  const convoy = value.convoy === undefined ? [] : value.convoy;
  if (!Array.isArray(convoy) || convoy.length > 128 || !convoy.every((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.itemId !== 'string') return false;
    const item = itemById.get(entry.itemId);
    return item !== undefined && Number.isInteger(entry.uses)
      && (entry.uses as number) >= 1 && (entry.uses as number) <= item.maxUses;
  })) return false;
  if (value.extendedUnits.length + reserveUnits.length < chapter.units.length
    || value.extendedUnits.length + reserveUnits.length > chapter.units.length + chapter.optionalUnits.length + reinforcementUnits.length
    || !value.extendedUnits.every(isSavedUnit)) return false;

  const savedUnits = [...value.extendedUnits, ...reserveUnits] as ExtendedUnitState[];
  const reserveIds = new Set((reserveUnits as ExtendedUnitState[]).map(({ unit }) => unit.id));
  const expected = new Map([...chapter.units, ...chapter.optionalUnits, ...reinforcementUnits].map((item) => [item.unit.id, item]));
  const mandatoryIds = new Set(chapter.units.map((item) => item.unit.id));
  const ids = new Set<string>();
  const positions = new Set<string>();
  for (const { unit, stats, weapon, isBoss } of savedUnits) {
    const original = expected.get(unit.id);
    const catalogWeapon = weapon ? itemById.get(weapon.id) : undefined;
    if (ids.has(unit.id) || !original || (weapon !== undefined && (!catalogWeapon || !matchesWeapon(weapon, catalogWeapon)))) return false;
    if (isBoss !== original.isBoss) return false;
    const currentClass = getClassDefinition(unit.classId);
    const originalClass = getClassDefinition(original.unit.classId);
    const mountedClass = getClassDefinition(unit.mountedClassId);
    if (!currentClass || !originalClass) return false;
    const progressClassId = mountedClass?.id ?? currentClass.id;
    if (progressClassId !== originalClass.id && !originalClass.promotions.includes(progressClassId)) return false;
    // PLAN item 134 (R7): the dismount rule is shared with core class rules.
    if (mountedClass) {
      if (mountedClass.mountKind !== 'ground'
        || currentClass.id !== getDismountedClassId(mountedClass.id)) return false;
    } else if (isGroundDismountedForm(currentClass.id)) return false;
    if (unit.moveType !== currentClass.moveType) return false;
    const expectedMov = currentClass.id === originalClass.id && !mountedClass
      ? original.unit.mov
      : currentClass.baseMov;
    if (unit.mov !== expectedMov) return false;
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
    && value.extendedUnits.some((entry: ExtendedUnitState) => entry.unit.id === chapter.lordUnitId);
}

export function isSaveGameData(value: unknown): value is SaveGameData {
  return isRecord(value)
    && value.version === SAVE_VERSION
    && isNonnegativeInteger(value.timestamp)
    && isGameSnapshot(value);
}

export function migrateSaveGameData(value: unknown): SaveGameData | null {
  if (isSaveGameData(value)) return value;
  if (!isRecord(value) || !['2.0.0', '3.0.0', '4.0.0', '5.0.0'].includes(value.version as string) || !isNonnegativeInteger(value.timestamp)
    || !Array.isArray(value.extendedUnits)) return null;
  const chapter = chapters[value.chapterId as string];
  if (!chapter) return null;
  const catalog = new Map([...chapter.units, ...chapter.optionalUnits].map((entry) => [entry.unit.id, entry]));
  const migrated = structuredClone(value);
  migrated.gold ??= 0;
  migrated.villageStates ??= {};
  migrated.chestStates ??= {};
  migrated.doorStates ??= {};
  // PLAN item 155: the Door Key became the Master Key; rewrite old saves.
  const rewriteKey = (list: unknown): void => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      if (isRecord(entry) && entry.itemId === 'door_key') entry.itemId = 'master_key';
    }
  };
  for (const raw of [...(migrated.extendedUnits as unknown[]),
    ...(Array.isArray(migrated.reserveUnits) ? migrated.reserveUnits as unknown[] : [])]) {
    if (isRecord(raw)) rewriteKey(raw.inventory);
  }
  rewriteKey(migrated.convoy);
  migrated.spawnedReinforcements ??= [];
  migrated.difficulty ??= 'normal';
  const savedIds = new Set([...migrated.extendedUnits as unknown[],
    ...(Array.isArray(migrated.reserveUnits) ? migrated.reserveUnits as unknown[] : [])]
    .filter(isRecord).map((entry) => isRecord(entry.unit) ? entry.unit.id : undefined));
  // New chapter layouts add enemies; an older save must not revive them mid-battle.
  for (const original of chapter.units) {
    if (savedIds.has(original.unit.id)) continue;
    if (original.unit.faction !== 'enemy') return null;
    const absent = structuredClone(original);
    absent.stats.hp = 0;
    absent.unit.isDead = true;
    (migrated.extendedUnits as unknown[]).push(absent);
  }
  const units = [...(migrated.extendedUnits as unknown[]),
    ...(Array.isArray(migrated.reserveUnits) ? migrated.reserveUnits as unknown[] : [])];
  for (const raw of units) {
    if (!isRecord(raw) || !isRecord(raw.unit) || !isRecord(raw.stats)) return null;
    const original = catalog.get(raw.unit.id as string);
    if (!original) return null;
    if (!isRecord(raw.weapon) || typeof raw.weapon.id !== 'string') return null;
    const catalogWeapon = itemById.get(raw.weapon.id);
    if (!catalogWeapon) return null;
    if (value.version === '2.0.0') {
      raw.weapon = structuredClone(catalogWeapon);
      if (raw.stats.skill === undefined && isNonnegativeInteger(raw.stats.dex)) raw.stats.skill = raw.stats.dex;
      delete raw.stats.dex;
      if (isRecord(raw.growths)) {
        if (raw.growths.skill === undefined && isNonnegativeInteger(raw.growths.dex)) raw.growths.skill = raw.growths.dex;
        delete raw.growths.dex;
      }
      raw.unit.classId = original.unit.classId;
      raw.unit.supportPoints = original.unit.supportPoints;
      raw.isBoss = original.isBoss;
      raw.unit.mov = original.unit.mov;
      raw.unit.moveType = original.unit.moveType;
      raw.level = original.level;
      raw.exp = 0;
    }
    if (raw.inventory === undefined) {
      raw.inventory = structuredClone(original.inventory);
      if (!(raw.inventory as { itemId: string }[]).some((entry) => entry.itemId === catalogWeapon.id)) {
        (raw.inventory as { itemId: string; uses: number }[]).push({ itemId: catalogWeapon.id, uses: catalogWeapon.maxUses });
      }
    }
  }
  migrated.version = SAVE_VERSION;
  return isSaveGameData(migrated) ? migrated : null;
}

export const DEFAULT_SAVE_SLOTS = ['slot1', 'slot2', 'slot3'] as const;
export type SaveSlotId = typeof DEFAULT_SAVE_SLOTS[number] | string;

// A fresh game for a chapter, built from chapter data instead of the app's
// current state. New Game at an empty slot must save this — not whatever the
// previous game had become — because loadChapter only queues React state
// updates, so a save taken right after it would still hold the old game
// (PLAN item 75, H1). Mirrors loadChapter in App.tsx: turn 1, player phase,
// chapter units, no gold, no visited villages, story intro shown.
export function buildNewGameSnapshot(chapterId: string, rngSeed: number): GameSnapshot | null {
  const chapter = chapters[chapterId];
  if (!chapter) return null;
  return {
    chapterId,
    turnState: { turnNumber: 1, activePhase: 'player_phase' },
    extendedUnits: structuredClone(chapter.units),
    reserveUnits: [],
    convoy: [],
    rngSeed,
    chapterOutcome: 'ongoing',
    showStoryIntro: true,
    combatLog: [`📜 Started ${chapter.name}`],
    gold: 0,
    villageStates: {},
    chestStates: {},
    doorStates: {},
    spawnedReinforcements: [],
  };
}

export async function saveGameState(snapshot: GameSnapshot, slot: SaveSlotId = SAVE_SLOT): Promise<boolean> {
  if (!isGameSnapshot(snapshot)) return false;
  try {
    const record: SaveRecord = {
      ...snapshot,
      slot,
      version: SAVE_VERSION,
      timestamp: Date.now(),
    };
    await database.saves.put(record);
    // Nếu lưu vào slot1, cũng cập nhật main để giữ tương thích ngược
    if (slot === 'slot1') {
      await database.saves.put({ ...record, slot: SAVE_SLOT });
    } else if (slot === SAVE_SLOT) {
      await database.saves.put({ ...record, slot: 'slot1' });
    }
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export async function loadGameState(slot: SaveSlotId = SAVE_SLOT): Promise<SaveGameData | null> {
  try {
    let record: unknown = await database.saves.get(slot);
    // Giữ đồng bộ hai chiều giữa slot1 và main cho khả năng tương thích ngược
    if (slot === 'slot1') {
      const mainRecord = await database.saves.get(SAVE_SLOT);
      if (mainRecord && (!record || (mainRecord.timestamp ?? 0) >= ((record as any)?.timestamp ?? 0))) {
        record = mainRecord;
      }
    } else if (slot === SAVE_SLOT) {
      const slot1Record = await database.saves.get('slot1');
      if (slot1Record && (!record || (slot1Record.timestamp ?? 0) >= ((record as any)?.timestamp ?? 0))) {
        record = slot1Record;
      }
    }
    const migrated = migrateSaveGameData(record);
    if (migrated && isRecord(record) && record.version !== SAVE_VERSION) {
      await database.saves.put({ ...migrated, slot });
    }
    return migrated;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

export async function hasSavedGame(slot: SaveSlotId = SAVE_SLOT): Promise<boolean> {
  try {
    const data = await loadGameState(slot);
    return data !== null;
  } catch {
    return false;
  }
}

export interface SlotSummary {
  slotId: string;
  name: string;
  data: SaveGameData | null;
}

export async function listAllSaveSlots(): Promise<SlotSummary[]> {
  const summaries: SlotSummary[] = [];
  const slotLabels: Record<string, string> = {
    slot1: 'File 1',
    slot2: 'File 2',
    slot3: 'File 3',
  };

  for (const slot of DEFAULT_SAVE_SLOTS) {
    const data = await loadGameState(slot);
    summaries.push({
      slotId: slot,
      name: slotLabels[slot] ?? slot,
      data,
    });
  }
  return summaries;
}

export async function deleteSaveSlot(slot: SaveSlotId): Promise<boolean> {
  try {
    await database.saves.delete(slot);
    if (slot === 'slot1') {
      await database.saves.delete(SAVE_SLOT);
    }
    return true;
  } catch (error) {
    console.error(`Failed to delete save slot ${slot}:`, error);
    return false;
  }
}

export async function copySaveSlot(fromSlot: SaveSlotId, toSlot: SaveSlotId): Promise<boolean> {
  try {
    const data = await loadGameState(fromSlot);
    if (!data) return false;
    return await saveGameState(data, toSlot);
  } catch (error) {
    console.error(`Failed to copy save slot from ${fromSlot} to ${toSlot}:`, error);
    return false;
  }
}
