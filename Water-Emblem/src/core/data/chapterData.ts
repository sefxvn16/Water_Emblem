import testChapterJson from '../../../data/chapters/test_chapter_01.json' with { type: 'json' };
import testMapJson from '../../../data/maps/test_map_01.json' with { type: 'json' };
import talysChapterJson from '../../../data/chapters/chapter_01_talys.json' with { type: 'json' };
import talysMapJson from '../../../data/maps/chapter_01_talys.json' with { type: 'json' };
import galderChapterJson from '../../../data/chapters/chapter_02_galder.json' with { type: 'json' };
import galderMapJson from '../../../data/maps/chapter_02_galder.json' with { type: 'json' };
import devilMountainChapterJson from '../../../data/chapters/chapter_03_devil_mountain.json' with { type: 'json' };
import devilMountainMapJson from '../../../data/maps/chapter_03_devil_mountain.json' with { type: 'json' };
import itemsJson from '../../../data/items.json' with { type: 'json' };
import charactersJson from '../../../data/characters.json' with { type: 'json' };
import classesJson from '../../../data/classes.json' with { type: 'json' };
import { CHAPTER_SOURCES } from './chapterRegistry';
import type { AIRole } from '../ai/decision';
import type { ChapterObjective } from '../chapter/types';
import type { ItemDefinition, UnitCombatStats } from '../combat/types';
import type { GridUnit, MapData, MoveType, Position, UnitFaction, WeaponRank } from '../grid/types';
import { initialSupportPoints } from '../combat/support';
import { SKILLS } from '../combat/skills';

export interface InventoryEntry {
  itemId: string;
  uses: number;
}

/** One stage of a multi-phase boss (PLAN items 111, 150: weapon / AI only). */
export interface BossPhase {
  /** Trigger when HP% falls to or below this value (1-99). */
  hpPercent: number;
  /** Weapon to equip when the phase starts. */
  weaponId?: string;
  /** AI role to switch to when the phase starts. */
  aiRole?: AIRole;
}

export interface UnitOpeningMove {
  targetPosition: Position;
  nextAiRole?: AIRole;
  turn?: number;
}

export interface ExtendedUnitState {
  unit: GridUnit;
  stats: UnitCombatStats;
  /** Equipped weapon definition; undefined when the unit is unarmed
      (e.g. its last weapon broke — PLAN item 84). */
  weapon?: ItemDefinition;
  inventory: InventoryEntry[];
  level: number;
  exp: number;
  isBoss?: boolean;
  aiRole?: AIRole;
  /** Waypoints for the patrol AI role (PLAN item 110). */
  patrolPoints?: Position[];
  /** Multi-phase boss stages (PLAN item 111); applied as HP falls. */
  bossPhases?: BossPhase[];
  /** Scripted opening move on specified turn (B01 Gazzak / Gate move). */
  openingMove?: UnitOpeningMove;
  /** Personal skill id from the character (PLAN item 112, N01). */
  personalSkill?: string;
  /** Stats/weapon saved while imitating another unit (PLAN item 124). */
  imitateBackup?: { stats: UnitCombatStats; weaponId?: string };
  /** Highest boss phase already applied (PLAN item 111). */
  bossPhase?: number;
  dropItemId?: string;
  title?: string;
  avatarUrl?: string;
  growths?: Record<string, number>;
}

export interface ChapterReward {
  type: 'gold' | 'item';
  amount?: number;
  itemId?: string;
}

/** Thăm làng nhận một nhân vật vào đội (PLAN mục 206, nguồn: kịch bản FE3 trong kho build files).
    `unitId` phải trỏ một unit khai trong `optionalUnits` của chương, nên dữ liệu nhân vật vẫn được
    `loadChapterData` kiểm đầy đủ và unit đó không đứng trên bản đồ cho tới khi được nhận. */
export interface ChapterUnitReward {
  readonly type: 'unit';
  readonly unitId: string;
}

export type ChapterVillageReward = ChapterReward | ChapterUnitReward;

export interface ChapterVillage {
  id: string;
  name: string;
  position: { x: number; y: number };
  reward: ChapterVillageReward;
  /** Nhóm loại trừ lẫn nhau (PLAN mục 206): thăm một làng trong nhóm thì các làng còn lại đóng.
      FE3 dùng cho cặp Arran / Samson ở Book 1 chương 13 (atlas ghi `mutually exclusive`). */
  exclusiveGroup?: string;
}

export interface ChapterChest {
  id: string;
  position: { x: number; y: number };
  reward: ChapterReward;
}

export interface ChapterDoor {
  id: string;
  position: { x: number; y: number };
}

/** Tiệm trong chương (PLAN mục 206): atlas FE3 ghi từng tiệm bán những món nào.
    Giá vẫn lấy `price` trong `data/items.json` (số FE11), không lấy giá FE3 của atlas. */
export interface ChapterShop {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly goods: readonly string[];
}

/** Enemy reinforcements arriving at the end of the enemy phase of `turn` (PLAN item 94). */
export interface ChapterReinforcement {
  id: string;
  turn: number;
  units: ExtendedUnitState[];
}

export interface ChapterData {
  readonly id: string;
  readonly name: string;
  readonly mapId: string;
  readonly lordUnitId: string;
  readonly objective: ChapterObjective;
  readonly units: ExtendedUnitState[];
  readonly optionalUnits: ExtendedUnitState[];
  readonly recruitments: readonly { speakerUnitId: string; targetUnitId: string; maxDistance: number }[];
  readonly carryoverUnitIds: readonly string[];
  readonly deploymentSlots: readonly Position[];
  readonly villages?: readonly ChapterVillage[];
  readonly chests?: readonly ChapterChest[];
  readonly doors?: readonly ChapterDoor[];
  readonly shops?: readonly ChapterShop[];
  readonly reinforcements?: readonly ChapterReinforcement[];
  readonly seizeReward?: ChapterReward;
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

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be a boolean`);
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
const AI_ROLES: readonly AIRole[] = ['stationary', 'pursue', 'pillage', 'patrol', 'retreat', 'thief', 'flee'];
const WEAPON_RANKS: readonly WeaponRank[] = ['E', 'D', 'C', 'B', 'A'];
const WEAPON_TYPES = ['sword', 'lance', 'axe', 'bow', 'tome', 'staff'] as const;

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
    skill: requireInteger(data.skill, `${label}.skill`),
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
  for (const key of ['hp', 'str', 'mag', 'skill', 'spd', 'lck', 'def', 'res']) {
    const rate = requireInteger(data[key], `${label}.${key}`);
    if (rate > 255) throw new Error(`${label}.${key} exceeds 255`);
    growths[key] = rate;
  }
  return growths;
}

function readWeaponRanks(value: unknown, label: string): Record<string, WeaponRank> | undefined {
  if (value === undefined) return undefined;
  const data = requireRecord(value, label);
  const ranks: Record<string, WeaponRank> = {};
  for (const [type, rank] of Object.entries(data)) {
    if (!WEAPON_TYPES.some((candidate) => candidate === type)) throw new Error(`${label}.${type} is not a weapon type`);
    ranks[type] = requireChoice(rank, WEAPON_RANKS, `${label}.${type}`);
  }
  return ranks;
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
  const lordUnitId = requireString(data.lordUnitId, 'chapter.lordUnitId');
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
  const objectiveType = requireChoice(objectiveRaw.type, ['defeat_boss', 'rout', 'seize', 'protect', 'escape'], 'chapter.objective.type');
  const objective: ChapterObjective = {
    type: objectiveType,
    ...(typeof objectiveRaw.description === 'string' ? { description: objectiveRaw.description } : {}),
    ...(typeof objectiveRaw.descriptionVi === 'string' ? { descriptionVi: objectiveRaw.descriptionVi } : {}),
    ...(objectiveType === 'defeat_boss'
      ? { bossUnitId: requireString(objectiveRaw.bossUnitId, 'chapter.objective.bossUnitId') }
      : {}),
    ...(objectiveType === 'seize'
      ? {
          seizeTargetTile: readPosition(objectiveRaw.seizeTargetTile, map, 'chapter.objective.seizeTargetTile'),
          // PLAN item 210: FE3 asks for both a defeat and a seize in exactly one
          // chapter; the unit ids live in the chapter JSON, never in code.
          ...(objectiveRaw.requiresDefeatOf !== undefined
            ? {
                requiresDefeatOf: (() => {
                  if (!Array.isArray(objectiveRaw.requiresDefeatOf) || objectiveRaw.requiresDefeatOf.length === 0) {
                    throw new Error('chapter.objective.requiresDefeatOf must be a nonempty array');
                  }
                  return objectiveRaw.requiresDefeatOf.map((unitId: unknown, index: number) =>
                    requireString(unitId, `chapter.objective.requiresDefeatOf[${index}]`));
                })(),
              }
            : {}),
        }
      : {}),
    ...(objectiveType === 'protect'
      ? {
          protectUnitId: requireString(objectiveRaw.protectUnitId, 'chapter.objective.protectUnitId'),
          surviveTurns: requireInteger(objectiveRaw.surviveTurns, 'chapter.objective.surviveTurns', 1),
        }
      : {}),
    ...(objectiveType === 'escape'
      ? {
          escapeTiles: (() => {
            if (!Array.isArray(objectiveRaw.escapeTiles) || objectiveRaw.escapeTiles.length === 0) {
              throw new Error('chapter.objective.escapeTiles must be a nonempty array');
            }
            return objectiveRaw.escapeTiles.map((tile: unknown, tileIndex: number) =>
              readPosition(tile, map, `chapter.objective.escapeTiles[${tileIndex}]`));
          })(),
        }
      : {}),
  };

  if (!Array.isArray(data.units) || data.units.length === 0) throw new Error('chapter.units must be a nonempty array');
  const parseUnit = (value: unknown, label: string): ExtendedUnitState => {
    const item = requireRecord(value, label);
    const weaponId = requireString(item.weaponId, `${label}.weaponId`);
    const weapon = itemById.get(weaponId);
    if (!weapon) throw new Error(`${label} references unknown weapon ${weaponId}`);
    const characterId = requireString(item.characterId, `${label}.characterId`);
    const character = characterById.get(characterId);
    if (!character) throw new Error(`${label} references unknown character ${characterId}`);
    if (!Array.isArray(character.startingWeapons)) {
      throw new Error(`Character ${characterId}.startingWeapons must be an array`);
    }
    const inventory: InventoryEntry[] = character.startingWeapons.map((rawId: unknown, index: number) => {
      const itemId = requireString(rawId, `character ${characterId}.startingWeapons[${index}]`);
      const startingItem = itemById.get(itemId);
      if (!startingItem || !Number.isInteger(startingItem.maxUses) || startingItem.maxUses < 1) {
        throw new Error(`Character ${characterId} references invalid starting item ${itemId}`);
      }
      return { itemId, uses: startingItem.maxUses };
    });
    if (!inventory.some((entry) => entry.itemId === weaponId)) {
      inventory.push({ itemId: weaponId, uses: weapon.maxUses });
    }
    const classId = requireString(character.classId, `character ${characterId}.classId`);
    const classData = classById.get(classId);
    if (!classData) throw new Error(`Character ${characterId} references unknown class ${classId}`);
    if (character.isBoss !== undefined && typeof character.isBoss !== 'boolean') {
      throw new Error(`Character ${characterId}.isBoss must be a boolean`);
    }
    const baseStats = requireRecord(character.baseStats, `character ${characterId}.baseStats`);
    const hp = requireInteger(baseStats.hp, `character ${characterId}.baseStats.hp`, 1);
    const weaponRanks = readWeaponRanks(character.weaponRanks, `character ${characterId}.weaponRanks`);
    const rankOrder = ['E', 'D', 'C', 'B', 'A'];
    if (weapon.requiredRank && rankOrder.indexOf(weaponRanks?.[weapon.type] ?? 'E') < rankOrder.indexOf(weapon.requiredRank)) {
      throw new Error(`Character ${characterId} cannot equip ${weaponId} at weapon rank ${weapon.requiredRank}`);
    }
    const dropItemIdRaw = item.dropItemId ?? character.dropItemId;
    const dropItemId = dropItemIdRaw === undefined ? undefined : requireString(dropItemIdRaw, `${label}.dropItemId`);
    if (dropItemId && !itemById.has(dropItemId)) {
      throw new Error(`${label} references unknown dropItemId ${dropItemId}`);
    }
    const unit: GridUnit = {
      id: requireString(item.id, `${label}.id`),
      name: item.name === undefined
        ? requireString(character.name, `character ${characterId}.name`)
        : requireString(item.name, `${label}.name`),
      faction: requireChoice(item.faction, FACTIONS, `${label}.faction`),
      classId,
      position: readPosition(item.position, map, `${label}.position`),
      mov: item.mov === undefined
        ? requireInteger(classData.baseMov, `class ${classId}.baseMov`)
        : requireInteger(item.mov, `${label}.mov`),
      moveType: requireChoice(classData.moveType, MOVE_TYPES, `class ${classId}.moveType`),
      weaponRanks,
      supportPoints: initialSupportPoints(requireString(item.id, `${label}.id`)),
      hasActed: false,
      isDead: false,
      ...(item.isReinforcement === undefined
        ? {}
        : { isReinforcement: requireBoolean(item.isReinforcement, `${label}.isReinforcement`) }),
    };
    return {
      unit,
      stats: readStats({ ...baseStats, maxHp: hp }, `character ${characterId}.baseStats`),
      weapon,
      inventory,
      level: item.level !== undefined
        ? requireInteger(item.level, `${label}.level`, 1)
        : requireInteger(character.level, `character ${characterId}.level`, 1),
      exp: 0,
      ...(character.isBoss === undefined ? {} : { isBoss: character.isBoss === true }),
      ...(item.aiRole === undefined ? {} : { aiRole: requireChoice(item.aiRole, AI_ROLES, `${label}.aiRole`) }),
      ...(item.openingMove === undefined ? {} : {
        openingMove: (() => {
          const move = requireRecord(item.openingMove, `${label}.openingMove`);
          return {
            targetPosition: readPosition(move.targetPosition, map, `${label}.openingMove.targetPosition`),
            ...(move.nextAiRole === undefined ? {} : { nextAiRole: requireChoice(move.nextAiRole, AI_ROLES, `${label}.openingMove.nextAiRole`) }),
            turn: move.turn === undefined ? 1 : requireInteger(move.turn, `${label}.openingMove.turn`, 1),
          };
        })(),
      }),
      ...(item.patrolPoints === undefined ? {} : {
        patrolPoints: (() => {
          if (!Array.isArray(item.patrolPoints) || item.patrolPoints.length === 0) {
            throw new Error(`${label}.patrolPoints must be a nonempty array`);
          }
          return item.patrolPoints.map((point: unknown, pointIndex: number) =>
            readPosition(point, map, `${label}.patrolPoints[${pointIndex}]`));
        })(),
      }),
      ...(item.bossPhases === undefined ? {} : {
        bossPhases: (() => {
          if (!Array.isArray(item.bossPhases) || item.bossPhases.length === 0) {
            throw new Error(`${label}.bossPhases must be a nonempty array`);
          }
          return item.bossPhases.map((phaseValue: unknown, phaseIndex: number): BossPhase => {
            const phase = requireRecord(phaseValue, `${label}.bossPhases[${phaseIndex}]`);
            return {
              hpPercent: requireInteger(phase.hpPercent, `${label}.bossPhases[${phaseIndex}].hpPercent`, 1),
              ...(phase.weaponId === undefined ? {} : {
                weaponId: (() => {
                  const weaponId = requireString(phase.weaponId, `${label}.bossPhases[${phaseIndex}].weaponId`);
                  if (!itemById.has(weaponId)) throw new Error(`Boss phase references unknown item ${weaponId}`);
                  return weaponId;
                })(),
              }),
              ...(phase.aiRole === undefined ? {} : { aiRole: requireChoice(phase.aiRole, AI_ROLES, `${label}.bossPhases[${phaseIndex}].aiRole`) }),
            };
          });
        })(),
      }),
      ...(dropItemId === undefined ? {} : { dropItemId }),
      title: requireString(character.title, `character ${characterId}.title`),
      ...(character.personalSkill === undefined ? {} : {
        personalSkill: (() => {
          const skillId = requireString(character.personalSkill, `character ${characterId}.personalSkill`);
          if (!(skillId in SKILLS)) throw new Error(`Character ${characterId} references unknown skill ${skillId}`);
          return skillId;
        })(),
      }),
      avatarUrl: requireString(character.avatarUrl, `character ${characterId}.avatarUrl`),
      growths: readGrowths(character.growths, `character ${characterId}.growths`),
    };
  };
  const units: ExtendedUnitState[] = data.units.map((value: unknown, index: number) => parseUnit(value, `chapter.units[${index}]`));
  const optionalRows = data.optionalUnits ?? [];
  if (!Array.isArray(optionalRows)) throw new Error('chapter.optionalUnits must be an array');
  const optionalUnits: ExtendedUnitState[] = optionalRows.map((value: unknown, index: number) => parseUnit(value, `chapter.optionalUnits[${index}]`));
  const recruitmentRows = data.recruitments ?? [];
  if (!Array.isArray(recruitmentRows)) throw new Error('chapter.recruitments must be an array');
  const recruitments = recruitmentRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.recruitments[${index}]`);
    return {
      speakerUnitId: requireString(item.speakerUnitId, `chapter.recruitments[${index}].speakerUnitId`),
      targetUnitId: requireString(item.targetUnitId, `chapter.recruitments[${index}].targetUnitId`),
      maxDistance: requireInteger(item.maxDistance, `chapter.recruitments[${index}].maxDistance`, 1),
    };
  });
  const carryoverRows = data.carryoverUnitIds ?? [];
  if (!Array.isArray(carryoverRows)) throw new Error('chapter.carryoverUnitIds must be an array');
  const carryoverUnitIds = carryoverRows.map((value: unknown, index: number) =>
    requireString(value, `chapter.carryoverUnitIds[${index}]`));
  const deploymentSlotRows = data.deploymentSlots ?? [];
  if (!Array.isArray(deploymentSlotRows)) throw new Error('chapter.deploymentSlots must be an array');
  const deploymentSlots = deploymentSlotRows.map((value: unknown, index: number) =>
    readPosition(value, map, `chapter.deploymentSlots[${index}]`));
  // Atlas FE3 có chương khai ô triển khai cho cả quân không tên (ví dụ Book 1 chương 5: `P unit x11`),
  // nên số ô có thể nhiều hơn số nhân vật mang sang. Chỉ chặn khi thiếu ô cho một unit (PLAN mục 203).
  if (deploymentSlots.length > 0 && deploymentSlots.length < carryoverUnitIds.length) {
    throw new Error('Deployment slots must cover every carryover unit');
  }
  if (new Set(deploymentSlots.map(({ x, y }) => `${x},${y}`)).size !== deploymentSlots.length) {
    throw new Error('Duplicate deployment slot');
  }

  const ids = [...units, ...optionalUnits].map(({ unit }) => unit.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate unit ID');
  const positions = units.map(({ unit }) => `${unit.position.x},${unit.position.y}`);
  if (new Set(positions).size !== positions.length) throw new Error('Multiple units occupy one tile');
  if (!units.some(({ unit }) => unit.id === lordUnitId && unit.faction === 'player')) {
    throw new Error('Chapter lordUnitId does not reference a player unit');
  }
  if (objective.type === 'defeat_boss' && !ids.includes(objective.bossUnitId ?? '')) {
    throw new Error('Chapter boss ID does not reference a unit');
  }
  if (new Set(recruitments.map(({ targetUnitId }) => targetUnitId)).size !== recruitments.length
    || recruitments.some(({ speakerUnitId, targetUnitId }) =>
      !units.some(({ unit }) => unit.id === speakerUnitId && unit.faction === 'player')
      || !units.some(({ unit }) => unit.id === targetUnitId && unit.faction === 'enemy'))) {
    throw new Error('Recruitment must reference one player speaker and one enemy target');
  }
  if (new Set(carryoverUnitIds).size !== carryoverUnitIds.length
    || carryoverUnitIds.some((unitId) => ![...units, ...optionalUnits].some(({ unit }) => unit.id === unitId && unit.faction === 'player'))) {
    throw new Error('Carryover unit ID must reference one player unit');
  }

  const villageRows = data.villages ?? [];
  if (!Array.isArray(villageRows)) throw new Error('chapter.villages must be an array');
  const villages: ChapterVillage[] = villageRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.villages[${index}]`);
    const villageId = requireString(item.id, `chapter.villages[${index}].id`);
    const villageName = requireString(item.name, `chapter.villages[${index}].name`);
    const position = readPosition(item.position, map, `chapter.villages[${index}].position`);
    const tile = map.grid[position.y]?.[position.x];
    if (tile !== 'village') {
      throw new Error(`Village ${villageId} at (${position.x},${position.y}) must be on a village tile, found ${tile}`);
    }
    const rewardRaw = requireRecord(item.reward, `chapter.villages[${index}].reward`);
    const rewardType = requireChoice(rewardRaw.type, ['gold', 'item', 'unit'], `chapter.villages[${index}].reward.type`);
    const reward: ChapterVillageReward = rewardType === 'unit'
      ? {
          type: 'unit',
          unitId: (() => {
            const rewardUnitId = requireString(rewardRaw.unitId, `chapter.villages[${index}].reward.unitId`);
            if (!optionalUnits.some(({ unit }) => unit.id === rewardUnitId && unit.faction === 'player')) {
              throw new Error(`Village ${villageId} reward references ${rewardUnitId}, which must be a player unit in chapter.optionalUnits`);
            }
            return rewardUnitId;
          })(),
        }
      : {
          type: rewardType,
          ...(rewardType === 'gold'
            ? { amount: requireInteger(rewardRaw.amount, `chapter.villages[${index}].reward.amount`, 1) }
            : {
                itemId: (() => {
                  const itemId = requireString(rewardRaw.itemId, `chapter.villages[${index}].reward.itemId`);
                  if (!itemById.has(itemId)) {
                    throw new Error(`Village ${villageId} reward references unknown item ${itemId}`);
                  }
                  return itemId;
                })(),
              }),
        };
    const exclusiveGroup = item.exclusiveGroup === undefined
      ? undefined
      : requireString(item.exclusiveGroup, `chapter.villages[${index}].exclusiveGroup`);
    return { id: villageId, name: villageName, position, reward, ...(exclusiveGroup ? { exclusiveGroup } : {}) };
  });

  const villageIds = villages.map((v) => v.id);
  if (new Set(villageIds).size !== villageIds.length) throw new Error('Duplicate village ID');
  const villagePositions = villages.map((v) => `${v.position.x},${v.position.y}`);
  if (new Set(villagePositions).size !== villagePositions.length) throw new Error('Multiple villages occupy one tile');

  const chestRows = data.chests ?? [];
  if (!Array.isArray(chestRows)) throw new Error('chapter.chests must be an array');
  const chests: ChapterChest[] = chestRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.chests[${index}]`);
    const chestId = requireString(item.id, `chapter.chests[${index}].id`);
    const position = readPosition(item.position, map, `chapter.chests[${index}].position`);
    const tile = map.grid[position.y]?.[position.x];
    if (tile !== 'chest') {
      throw new Error(`Chest ${chestId} at (${position.x},${position.y}) must be on a chest tile, found ${tile}`);
    }
    const rewardRaw = requireRecord(item.reward, `chapter.chests[${index}].reward`);
    const rewardType = requireChoice(rewardRaw.type, ['gold', 'item'], `chapter.chests[${index}].reward.type`);
    const reward: ChapterReward = {
      type: rewardType,
      ...(rewardType === 'gold'
        ? { amount: requireInteger(rewardRaw.amount, `chapter.chests[${index}].reward.amount`, 1) }
        : {
            itemId: (() => {
              const itemId = requireString(rewardRaw.itemId, `chapter.chests[${index}].reward.itemId`);
              if (!itemById.has(itemId)) {
                throw new Error(`Chest ${chestId} reward references unknown item ${itemId}`);
              }
              return itemId;
            })(),
          }),
    };
    return { id: chestId, position, reward };
  });

  const chestIds = chests.map((c) => c.id);
  if (new Set(chestIds).size !== chestIds.length) throw new Error('Duplicate chest ID');
  const chestPositions = chests.map((c) => `${c.position.x},${c.position.y}`);
  if (new Set(chestPositions).size !== chestPositions.length) throw new Error('Multiple chests occupy one tile');

  const doorRows = data.doors ?? [];
  if (!Array.isArray(doorRows)) throw new Error('chapter.doors must be an array');
  const doors: ChapterDoor[] = doorRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.doors[${index}]`);
    const doorId = requireString(item.id, `chapter.doors[${index}].id`);
    const position = readPosition(item.position, map, `chapter.doors[${index}].position`);
    const tile = map.grid[position.y]?.[position.x];
    if (tile !== 'door') {
      throw new Error(`Door ${doorId} at (${position.x},${position.y}) must be on a door tile, found ${tile}`);
    }
    return { id: doorId, position };
  });

  const doorIds = doors.map((d) => d.id);
  if (new Set(doorIds).size !== doorIds.length) throw new Error('Duplicate door ID');
  const doorPositions = doors.map((d) => `${d.position.x},${d.position.y}`);
  if (new Set(doorPositions).size !== doorPositions.length) throw new Error('Multiple doors occupy one tile');

  const shopRows = data.shops ?? [];
  if (!Array.isArray(shopRows)) throw new Error('chapter.shops must be an array');
  const shops: ChapterShop[] = shopRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.shops[${index}]`);
    const shopId = requireString(item.id, `chapter.shops[${index}].id`);
    const position = readPosition(item.position, map, `chapter.shops[${index}].position`);
    const tile = map.grid[position.y]?.[position.x];
    if (tile !== 'shop') {
      throw new Error(`Shop ${shopId} at (${position.x},${position.y}) must be on a shop tile, found ${tile}`);
    }
    if (!Array.isArray(item.goods) || item.goods.length === 0) {
      throw new Error(`chapter.shops[${index}].goods must be a nonempty array`);
    }
    const goods = item.goods.map((raw: unknown, goodsIndex: number) => {
      const itemId = requireString(raw, `chapter.shops[${index}].goods[${goodsIndex}]`);
      const definition = itemById.get(itemId);
      if (!definition) throw new Error(`Shop ${shopId} sells unknown item ${itemId}`);
      if (definition.price === undefined || definition.buyable === false) {
        throw new Error(`Shop ${shopId} sells ${itemId}, which is not buyable`);
      }
      return itemId;
    });
    if (new Set(goods).size !== goods.length) throw new Error(`Shop ${shopId} lists one item twice`);
    return { id: shopId, position, goods };
  });
  const shopIds = shops.map((s) => s.id);
  if (new Set(shopIds).size !== shopIds.length) throw new Error('Duplicate shop ID');
  const shopPositions = shops.map((s) => `${s.position.x},${s.position.y}`);
  if (new Set(shopPositions).size !== shopPositions.length) throw new Error('Multiple shops occupy one tile');

  const reinforcementRows = data.reinforcements ?? [];
  if (!Array.isArray(reinforcementRows)) throw new Error('chapter.reinforcements must be an array');
  const knownUnitIds = new Set([...units, ...optionalUnits].map((entry) => entry.unit.id));
  const reinforcements: ChapterReinforcement[] = reinforcementRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.reinforcements[${index}]`);
    const reinforcementId = requireString(item.id, `chapter.reinforcements[${index}].id`);
    const turn = requireInteger(item.turn, `chapter.reinforcements[${index}].turn`, 1);
    if (!Array.isArray(item.units) || item.units.length === 0) {
      throw new Error(`chapter.reinforcements[${index}].units must be a nonempty array`);
    }
    const reinforcementUnits = item.units.map((unitValue: unknown, unitIndex: number) =>
      parseUnit(unitValue, `chapter.reinforcements[${index}].units[${unitIndex}]`));
    for (const entry of reinforcementUnits) {
      if (knownUnitIds.has(entry.unit.id)) throw new Error(`Duplicate unit ID ${entry.unit.id}`);
      knownUnitIds.add(entry.unit.id);
    }
    return { id: reinforcementId, turn, units: reinforcementUnits };
  });
  const reinforcementIds = reinforcements.map((r) => r.id);
  if (new Set(reinforcementIds).size !== reinforcementIds.length) throw new Error('Duplicate reinforcement ID');

  let seizeReward: ChapterReward | undefined;
  if (data.seizeReward !== undefined) {
    const rewardRaw = requireRecord(data.seizeReward, 'chapter.seizeReward');
    const rewardType = requireChoice(rewardRaw.type, ['gold', 'item'], 'chapter.seizeReward.type');
    seizeReward = {
      type: rewardType,
      ...(rewardType === 'gold'
        ? { amount: requireInteger(rewardRaw.amount, 'chapter.seizeReward.amount', 1) }
        : {
            itemId: (() => {
              const itemId = requireString(rewardRaw.itemId, 'chapter.seizeReward.itemId');
              if (!itemById.has(itemId)) {
                throw new Error(`Chapter seize reward references unknown item ${itemId}`);
              }
              return itemId;
            })(),
          }),
    };
  }

  return { id, name, mapId, lordUnitId, objective, units, optionalUnits, recruitments, carryoverUnitIds, deploymentSlots, villages, chests, doors, shops, reinforcements, seizeReward };
}

export const chapter01Data = loadChapterData(
  talysChapterJson,
  talysMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

export const chapter02Data = loadChapterData(
  galderChapterJson,
  galderMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

export const chapter03Data = loadChapterData(
  devilMountainChapterJson,
  devilMountainMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

export const testChapter01Data = loadChapterData(
  testChapterJson,
  testMapJson as MapData,
  itemsJson.items as ItemDefinition[],
);

/** 44 chương chiến dịch từ `chapterRegistry.ts` (PLAN mục 204). Ba chương đầu giữ đúng object đã
    dựng ở trên để các test và `initialChapterData` dùng chung một tham chiếu. */
export const chapters: Record<string, ChapterData> = {
  ...Object.fromEntries(CHAPTER_SOURCES.map((source) => [
    source.id,
    loadChapterData(source.chapter, source.map, itemsJson.items as ItemDefinition[]),
  ])),
  chapter_01: chapter01Data,
  chapter_02: chapter02Data,
  chapter_03: chapter03Data,
  test_chapter_01: testChapter01Data,
};

export const initialChapterData = chapter01Data;
