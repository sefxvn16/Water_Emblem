import testChapterJson from '../../../data/chapters/test_chapter_01.json';
import testMapJson from '../../../data/maps/test_map_01.json';
import talysChapterJson from '../../../data/chapters/chapter_01_talys.json';
import talysMapJson from '../../../data/maps/chapter_01_talys.json';
import galderChapterJson from '../../../data/chapters/chapter_02_galder.json';
import galderMapJson from '../../../data/maps/chapter_02_galder.json';
import devilMountainChapterJson from '../../../data/chapters/chapter_03_devil_mountain.json';
import devilMountainMapJson from '../../../data/maps/chapter_03_devil_mountain.json';
import itemsJson from '../../../data/items.json';
import charactersJson from '../../../data/characters.json';
import classesJson from '../../../data/classes.json';
import type { AIRole } from '../ai/decision';
import type { ChapterObjective } from '../chapter/types';
import type { ItemDefinition, UnitCombatStats } from '../combat/types';
import type { GridUnit, MapData, MoveType, Position, UnitFaction, WeaponRank } from '../grid/types';
import { initialSupportPoints } from '../combat/support';

export interface InventoryEntry {
  itemId: string;
  uses: number;
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

export type ChapterVillageReward = ChapterReward;

export interface ChapterVillage {
  id: string;
  name: string;
  position: { x: number; y: number };
  reward: ChapterVillageReward;
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

/** Enemy reinforcements arriving at the end of the enemy phase of `turn` (PLAN item 94). */
export interface ChapterReinforcement {
  id: string;
  turn: number;
  units: ExtendedUnitState[];
}

/** Hidden trap tile (PLAN item 105, V08): triggers once when a unit ends
    its movement on the tile, dealing `damage` (never lethal below 1 HP). */
export interface ChapterTrap {
  id: string;
  position: { x: number; y: number };
  damage: number;
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
  readonly reinforcements?: readonly ChapterReinforcement[];
  readonly traps?: readonly ChapterTrap[];
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
const AI_ROLES: readonly AIRole[] = ['stationary', 'pursue', 'pillage'];
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
  const objectiveType = requireChoice(objectiveRaw.type, ['defeat_boss', 'rout', 'seize'], 'chapter.objective.type');
  const objective: ChapterObjective = {
    type: objectiveType,
    ...(typeof objectiveRaw.description === 'string' ? { description: objectiveRaw.description } : {}),
    ...(typeof objectiveRaw.descriptionVi === 'string' ? { descriptionVi: objectiveRaw.descriptionVi } : {}),
    ...(objectiveType === 'defeat_boss'
      ? { bossUnitId: requireString(objectiveRaw.bossUnitId, 'chapter.objective.bossUnitId') }
      : {}),
    ...(objectiveType === 'seize'
      ? { seizeTargetTile: readPosition(objectiveRaw.seizeTargetTile, map, 'chapter.objective.seizeTargetTile') }
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
      level: requireInteger(character.level, `character ${characterId}.level`, 1),
      exp: 0,
      ...(character.isBoss === undefined ? {} : { isBoss: character.isBoss === true }),
      ...(item.aiRole === undefined ? {} : { aiRole: requireChoice(item.aiRole, AI_ROLES, `${label}.aiRole`) }),
      ...(dropItemId === undefined ? {} : { dropItemId }),
      title: requireString(character.title, `character ${characterId}.title`),
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
  if (deploymentSlots.length > 0 && deploymentSlots.length !== carryoverUnitIds.length) {
    throw new Error('Deployment slot count must match carryover unit count');
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
    const rewardType = requireChoice(rewardRaw.type, ['gold', 'item'], `chapter.villages[${index}].reward.type`);
    const reward: ChapterVillageReward = {
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
    return { id: villageId, name: villageName, position, reward };
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

  const trapRows = data.traps ?? [];
  if (!Array.isArray(trapRows)) throw new Error('chapter.traps must be an array');
  const traps: ChapterTrap[] = trapRows.map((value: unknown, index: number) => {
    const item = requireRecord(value, `chapter.traps[${index}]`);
    return {
      id: requireString(item.id, `chapter.traps[${index}].id`),
      position: readPosition(item.position, map, `chapter.traps[${index}].position`),
      damage: requireInteger(item.damage, `chapter.traps[${index}].damage`, 1),
    };
  });
  const trapIds = traps.map((t) => t.id);
  if (new Set(trapIds).size !== trapIds.length) throw new Error('Duplicate trap ID');

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

  return { id, name, mapId, lordUnitId, objective, units, optionalUnits, recruitments, carryoverUnitIds, deploymentSlots, villages, chests, doors, reinforcements, traps, seizeReward };
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

export const chapters: Record<string, ChapterData> = {
  chapter_01: chapter01Data,
  chapter_02: chapter02Data,
  chapter_03: chapter03Data,
  test_chapter_01: testChapter01Data,
};

export const initialChapterData = chapter01Data;
