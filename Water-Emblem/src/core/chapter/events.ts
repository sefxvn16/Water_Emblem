import { getManhattanDistance } from '../combat/calculator';
import type { ChapterChest, ChapterData, ChapterDoor, ChapterReward, ChapterVillage, ExtendedUnitState } from '../data/chapterData';
import { addItemToInventory } from '../data/inventory';
import { getClassDefinition } from '../class/classRules';
import { evaluateChapterOutcome } from './types';
import defaultDialoguesJson from '../../../data/dialogues/default_dialogues.json' with { type: 'json' };
import itemsJson from '../../../data/items.json' with { type: 'json' };

export type VillageState = 'intact' | 'visited' | 'destroyed';
export type ChestState = 'opened';
export type DoorState = 'opened';

export interface DialogueLine {
  readonly speaker: string;
  readonly avatarUrl: string;
  readonly text: string;
}

export type DialogueKind = 'village' | 'recruit' | 'boss_start' | 'boss_death';

export type GameEvent =
  | { readonly type: 'gold_gained'; readonly unitId: string; readonly amount: number; readonly source: 'village' | 'seize' | 'chest' }
  | {
      readonly type: 'item_gained';
      readonly unitId: string;
      readonly unitName: string;
      readonly itemId: string;
      readonly itemName: string;
      readonly source: 'village' | 'seize' | 'loot' | 'chest' | 'desert';
      readonly fromUnitName?: string;
    }
  | {
      // The receiving store (4 weapons / 4 items, PLAN item 86) is full:
      // the item was not added; the UI asks what to discard (or, once
      // PLAN item 88 lands, to send to the convoy).
      readonly type: 'item_overflow';
      readonly unitId: string;
      readonly unitName: string;
      readonly itemId: string;
      readonly itemName: string;
      readonly source: 'village' | 'seize' | 'loot' | 'chest' | 'desert';
      readonly fromUnitName?: string;
    }
  | { readonly type: 'village_visited'; readonly unitId: string; readonly unitName: string; readonly villageId: string; readonly villageName: string }
  | { readonly type: 'village_destroyed'; readonly unitId: string; readonly villageId: string; readonly villageName: string }
  | { readonly type: 'chest_opened'; readonly unitId: string; readonly unitName: string; readonly chestId: string }
  | { readonly type: 'door_opened'; readonly unitId: string; readonly unitName: string; readonly doorId: string }
  | { readonly type: 'drawbridge_lowered'; readonly unitId: string; readonly unitName: string; readonly bridgeId: string }
  | { readonly type: 'unit_recruited'; readonly unitId: string; readonly speakerId: string }
  | { readonly type: 'chapter_seized'; readonly unitId: string }
  | { readonly type: 'dialogue'; readonly kind: DialogueKind; readonly lines: readonly DialogueLine[] };

/** The slice of game state that chapter events can change. */
export interface ChapterState {
  readonly units: readonly ExtendedUnitState[];
  readonly gold: number;
  readonly villageStates: Readonly<Record<string, VillageState>>;
  /** Opened chests (PLAN item 92); absent = every chest still closed. */
  readonly chestStates?: Readonly<Record<string, ChestState>>;
  /** Opened doors (PLAN item 92); absent = every door still closed. */
  readonly doorStates?: Readonly<Record<string, DoorState>>;
  /** Lowered drawbridges; absent = every drawbridge raised. */
  readonly drawbridgeStates?: Readonly<Record<string, 'raised' | 'lowered'>>;
  /** Collected hidden treasures; absent = none collected. */
  readonly collectedTreasures?: Readonly<Record<string, boolean>>;
}

export interface EventResult {
  readonly state: ChapterState;
  readonly events: readonly GameEvent[];
}

export interface ItemInfo {
  readonly id: string;
  readonly name: string;
  readonly maxUses?: number;
  /** Item type for inventory slot counting (PLAN item 86). */
  readonly type?: string;
}

/** Chapter dialogue JSON; entries are looked up by key and checked when read. */
export type DialogueTable = object;

const unchanged = (state: ChapterState): EventResult => ({ state, events: [] });

function lookup(dialogues: DialogueTable, key: string): unknown {
  return (dialogues as Record<string, unknown>)[key];
}

function isDialogueLine(value: unknown): value is DialogueLine {
  return typeof value === 'object' && value !== null
    && typeof (value as Record<string, unknown>).speaker === 'string'
    && typeof (value as Record<string, unknown>).text === 'string';
}

function dialogueLines(value: unknown): DialogueLine[] | undefined {
  if (!Array.isArray(value) || !value.every(isDialogueLine)) return undefined;
  return value.map(({ speaker, text, avatarUrl }) => ({ speaker, text, avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : '' }));
}

/** Default village lines when a chapter defines none (data/dialogues/default_dialogues.json, PLAN item 134). */
const DEFAULT_VILLAGE_LINES: DialogueLine[] = dialogueLines(defaultDialoguesJson.defaultVillage) ?? [];

/** Item roles declared in data/items.json (PLAN item 134): master key, lord's chest key. */
const itemRoleById = new Map<string, string>(
  (itemsJson.items as readonly { id: string; itemRole?: string }[])
    .filter((item) => item.itemRole !== undefined)
    .map((item) => [item.id, item.itemRole!] as const),
);

function holdsItemRole(entry: ExtendedUnitState, role: string): boolean {
  return entry.inventory.some((item) => itemRoleById.get(item.itemId) === role && item.uses > 0);
}

/** Boss lines come from `boss_<unitId>` with `startCombat` and `death` text. */
export function getBossLines(dialogues: DialogueTable, unitId: string): { startCombat?: string; death?: string } | undefined {
  const entry = lookup(dialogues, `boss_${unitId}`);
  if (typeof entry !== 'object' || entry === null) return undefined;
  const { startCombat, death } = entry as Record<string, unknown>;
  return {
    ...(typeof startCombat === 'string' ? { startCombat } : {}),
    ...(typeof death === 'string' ? { death } : {}),
  };
}

export function bossStartEvent(dialogues: DialogueTable, unitId: string, unitName: string): GameEvent | undefined {
  const text = getBossLines(dialogues, unitId)?.startCombat;
  return text ? { type: 'dialogue', kind: 'boss_start', lines: [{ speaker: unitName, avatarUrl: '', text }] } : undefined;
}

function tryWithItem(
  entry: ExtendedUnitState,
  item: ItemInfo,
  items: readonly ItemInfo[],
): { entry: ExtendedUnitState; added: boolean } {
  const typeById = new Map(items.map((candidate) => [candidate.id, { type: candidate.type ?? 'consumable' }]));
  const added = addItemToInventory(entry, item.id, item.maxUses ?? 1, typeById);
  return added ? { entry: added, added: true } : { entry, added: false };
}

function mapUnit(units: readonly ExtendedUnitState[], unitId: string, change: (entry: ExtendedUnitState) => ExtendedUnitState): ExtendedUnitState[] {
  return units.map((entry) => (entry.unit.id === unitId ? change(entry) : entry));
}

function applyReward(
  state: ChapterState,
  unitId: string,
  reward: ChapterReward,
  source: 'village' | 'seize' | 'chest',
  items: readonly ItemInfo[],
): EventResult | undefined {
  if (reward.type === 'gold') {
    const amount = reward.amount ?? 0;
    return {
      state: { ...state, gold: state.gold + amount },
      events: [{ type: 'gold_gained', unitId, amount, source }],
    };
  }
  const item = items.find(({ id }) => id === reward.itemId);
  const owner = state.units.find(({ unit }) => unit.id === unitId);
  if (!item || !owner) return undefined;
  const { entry: withReward, added } = tryWithItem(owner, item, items);
  if (!added) {
    return {
      state,
      events: [{ type: 'item_overflow', unitId, unitName: owner.unit.name, itemId: item.id, itemName: item.name, source }],
    };
  }
  return {
    state: { ...state, units: mapUnit(state.units, unitId, () => withReward) },
    events: [{ type: 'item_gained', unitId, unitName: owner.unit.name, itemId: item.id, itemName: item.name, source }],
  };
}

export function visitVillage(
  state: ChapterState,
  unitId: string,
  village: ChapterVillage,
  items: readonly ItemInfo[],
  dialogues: DialogueTable,
): EventResult {
  const visitor = state.units.find(({ unit }) => unit.id === unitId);
  if (!visitor || (state.villageStates[village.id] ?? 'intact') !== 'intact') return unchanged(state);
  const reward = applyReward(state, unitId, village.reward, 'village', items);
  if (!reward) return unchanged(state);
  const villageTable = lookup(dialogues, 'villages');
  const villageLines = typeof villageTable === 'object' && villageTable !== null ? lookup(villageTable, village.id) : undefined;
  const lines = dialogueLines(villageLines) ?? DEFAULT_VILLAGE_LINES;
  return {
    state: { ...reward.state, villageStates: { ...state.villageStates, [village.id]: 'visited' } },
    events: [
      ...reward.events,
      { type: 'village_visited', unitId, unitName: visitor.unit.name, villageId: village.id, villageName: village.name },
      { type: 'dialogue', kind: 'village', lines },
    ],
  };
}

/** An enemy with the pillage role destroys the intact village it stands on. */
export function pillageVillage(state: ChapterState, unitId: string, chapter: ChapterData): EventResult {
  const raider = state.units.find(({ unit }) => unit.id === unitId);
  if (!raider || raider.aiRole !== 'pillage') return unchanged(state);
  const village = chapter.villages?.find(({ position }) => position.x === raider.unit.position.x && position.y === raider.unit.position.y);
  if (!village || (state.villageStates[village.id] ?? 'intact') !== 'intact') return unchanged(state);
  return {
    state: { ...state, villageStates: { ...state.villageStates, [village.id]: 'destroyed' } },
    events: [{ type: 'village_destroyed', unitId, villageId: village.id, villageName: village.name }],
  };
}

/** Only the lord can seize, and only when the chapter objective is met. */
export function seize(
  state: ChapterState,
  unitId: string,
  chapter: ChapterData,
  items: readonly ItemInfo[],
): EventResult {
  if (unitId !== chapter.lordUnitId) return unchanged(state);
  const outcome = evaluateChapterOutcome(state.units.map(({ unit }) => unit), chapter.objective, true, chapter.lordUnitId);
  if (outcome !== 'victory') return unchanged(state);
  const reward = chapter.seizeReward ? applyReward(state, unitId, chapter.seizeReward, 'seize', items) : undefined;
  return {
    state: reward?.state ?? state,
    events: [...(reward?.events ?? []), { type: 'chapter_seized', unitId }],
  };
}

/** Talk: the speaker recruits an enemy named by a chapter recruitment rule. */
export function recruit(
  state: ChapterState,
  speakerId: string,
  targetId: string,
  chapter: ChapterData,
  dialogues: DialogueTable,
): EventResult {
  const speaker = state.units.find(({ unit }) => unit.id === speakerId);
  const target = state.units.find(({ unit }) => unit.id === targetId);
  const rule = chapter.recruitments.find((entry) => entry.speakerUnitId === speakerId && entry.targetUnitId === targetId);
  if (!speaker || !target || !rule || target.unit.faction !== 'enemy' || target.unit.isDead
    || getManhattanDistance(speaker.unit.position, target.unit.position) > rule.maxDistance) {
    return unchanged(state);
  }
  const units = state.units.map((entry) => {
    if (entry.unit.id !== targetId) return entry;
    const converted: ExtendedUnitState = { ...entry, unit: { ...entry.unit, faction: 'player' } };
    delete converted.aiRole;
    return converted;
  });
  const lines = dialogueLines(lookup(dialogues, `recruit_${targetId}`)) ?? [];
  return {
    state: { ...state, units },
    events: [
      { type: 'unit_recruited', unitId: targetId, speakerId },
      ...(lines.length > 0 ? [{ type: 'dialogue' as const, kind: 'recruit' as const, lines }] : []),
    ],
  };
}

/** A unit fell: boss last words and loot to a living player killer. */
export function resolveDefeat(
  state: ChapterState,
  defeatedId: string,
  killerId: string,
  items: readonly ItemInfo[],
  dialogues: DialogueTable,
): EventResult {
  const defeated = state.units.find(({ unit }) => unit.id === defeatedId);
  if (!defeated) return unchanged(state);
  const events: GameEvent[] = [];
  const deathText = getBossLines(dialogues, defeatedId)?.death;
  if (deathText) {
    events.push({ type: 'dialogue', kind: 'boss_death', lines: [{ speaker: defeated.unit.name, avatarUrl: '', text: deathText }] });
  }
  const killer = state.units.find(({ unit }) => unit.id === killerId);
  if (!defeated.dropItemId || !killer || killer.unit.faction !== 'player' || killer.unit.isDead) {
    return { state, events };
  }
  const dropId = defeated.dropItemId;
  const item: ItemInfo = items.find(({ id }) => id === dropId) ?? { id: dropId, name: dropId };
  const { entry: withDrop, added } = tryWithItem(killer, item, items);
  if (!added) {
    events.push({
      type: 'item_overflow',
      unitId: killerId,
      unitName: killer.unit.name,
      itemId: item.id,
      itemName: item.name,
      source: 'loot',
      fromUnitName: defeated.unit.name,
    });
    return { state, events };
  }
  events.push({
    type: 'item_gained',
    unitId: killerId,
    unitName: killer.unit.name,
    itemId: item.id,
    itemName: item.name,
    source: 'loot',
    fromUnitName: defeated.unit.name,
  });
  return { state: { ...state, units: mapUnit(state.units, killerId, () => withDrop) }, events };
}

/** Thief-line classes (data flag `canOpenLocks`) open locks innately (PLAN item 92). */
export function opensLocksInately(entry: ExtendedUnitState): boolean {
  return getClassDefinition(entry.unit.classId)?.canOpenLocks === true;
}

/** FE3: the lord opens chests only while carrying the Fire Emblem (itemRole 'lordChestKey').
 * PLAN item 155: a Master Key (itemRole 'masterKey', one use per lock) opens chests too. */
export function canOpenChest(entry: ExtendedUnitState, chapter: ChapterData): boolean {
  if (opensLocksInately(entry)) return true;
  if (entry.unit.id === chapter.lordUnitId && holdsItemRole(entry, 'lordChestKey')) return true;
  return holdsItemRole(entry, 'chestKey') || holdsItemRole(entry, 'masterKey');
}

/** Thief-line classes or a Master Key (itemRole 'masterKey', one use per lock) open doors. */
export function canOpenDoor(entry: ExtendedUnitState): boolean {
  return opensLocksInately(entry) || holdsItemRole(entry, 'doorKey') || holdsItemRole(entry, 'masterKey');
}

/** Thief-line classes, Bridge Key, or Master Key can lower drawbridges. */
export function canLowerDrawbridge(entry: ExtendedUnitState): boolean {
  return opensLocksInately(entry) || holdsItemRole(entry, 'bridgeKey') || holdsItemRole(entry, 'masterKey');
}

function spendKeyRoleUse(units: readonly ExtendedUnitState[], unitId: string, role: string): ExtendedUnitState[] {
  return mapUnit(units, unitId, (entry) => ({
    ...entry,
    inventory: entry.inventory.flatMap((item) => {
      const r = itemRoleById.get(item.itemId);
      if (r !== role && r !== 'masterKey') return [item];
      return item.uses > 1 ? [{ ...item, uses: item.uses - 1 }] : [];
    }),
  }));
}

/** Spend one Master Key use (PLAN item 155); innate lockpickers spend nothing. */
function spendMasterKeyUse(units: readonly ExtendedUnitState[], unitId: string): ExtendedUnitState[] {
  return mapUnit(units, unitId, (entry) => ({
    ...entry,
    inventory: entry.inventory.flatMap((item) => {
      if (itemRoleById.get(item.itemId) !== 'masterKey') return [item];
      return item.uses > 1 ? [{ ...item, uses: item.uses - 1 }] : [];
    }),
  }));
}

/** Open the chest the unit stands on; the reward follows village rules. */
export function openChest(
  state: ChapterState,
  unitId: string,
  chest: ChapterChest,
  chapter: ChapterData,
  items: readonly ItemInfo[],
): EventResult {
  const opener = state.units.find(({ unit }) => unit.id === unitId);
  if (!opener || (state.chestStates?.[chest.id] ?? 'closed') !== 'closed') return unchanged(state);
  if (opener.unit.position.x !== chest.position.x || opener.unit.position.y !== chest.position.y) {
    return unchanged(state);
  }
  if (!canOpenChest(opener, chapter)) return unchanged(state);
  const reward = applyReward(state, unitId, chest.reward, 'chest', items);
  if (!reward) return unchanged(state);
  // PLAN item 155: opening with a Master Key spends one use (thief-line
  // classes and the lord with the Fire Emblem open for free).
  const usesKey = !opensLocksInately(opener)
    && !(opener.unit.id === chapter.lordUnitId && holdsItemRole(opener, 'lordChestKey'));
  const units = usesKey ? spendMasterKeyUse(reward.state.units, unitId) : reward.state.units;
  return {
    state: { ...reward.state, units, chestStates: { ...state.chestStates, [chest.id]: 'opened' } },
    events: [
      ...reward.events,
      { type: 'chest_opened', unitId, unitName: opener.unit.name, chestId: chest.id },
    ],
  };
}

/** Open a door from an adjacent tile; a non-thief spends one Master Key use. */
export function openDoor(
  state: ChapterState,
  unitId: string,
  door: ChapterDoor,
): EventResult {
  const opener = state.units.find(({ unit }) => unit.id === unitId);
  if (!opener || (state.doorStates?.[door.id] ?? 'closed') !== 'closed') return unchanged(state);
  if (getManhattanDistance(opener.unit.position, door.position) !== 1) return unchanged(state);
  if (!canOpenDoor(opener)) return unchanged(state);
  const units = opensLocksInately(opener) ? state.units : spendMasterKeyUse(state.units, unitId);
  return {
    state: { ...state, units, doorStates: { ...state.doorStates, [door.id]: 'opened' } },
    events: [{ type: 'door_opened', unitId, unitName: opener.unit.name, doorId: door.id }],
  };
}

/** Lower a drawbridge from an adjacent tile. */
export function lowerDrawbridge(
  state: ChapterState,
  unitId: string,
  bridge: { readonly id: string; readonly position: { readonly x: number; readonly y: number } },
): EventResult {
  const opener = state.units.find(({ unit }) => unit.id === unitId);
  if (!opener || (state.drawbridgeStates?.[bridge.id] ?? 'raised') !== 'raised') return unchanged(state);
  if (getManhattanDistance(opener.unit.position, bridge.position) !== 1) return unchanged(state);
  if (!canLowerDrawbridge(opener)) return unchanged(state);
  const units = opensLocksInately(opener) ? state.units : spendKeyRoleUse(state.units, unitId, 'bridgeKey');
  return {
    state: { ...state, units, drawbridgeStates: { ...state.drawbridgeStates, [bridge.id]: 'lowered' } },
    events: [{ type: 'drawbridge_lowered', unitId, unitName: opener.unit.name, bridgeId: bridge.id }],
  };
}

/** Search for hidden treasure when ending movement on a desert / sand tile. */
export function findDesertTreasure(
  state: ChapterState,
  unitId: string,
  hiddenTreasures: readonly { readonly id: string; readonly position: { readonly x: number; readonly y: number }; readonly itemId: string }[],
  items: readonly ItemInfo[],
  rng: { roll1RN: (chance: number) => boolean },
): EventResult {
  const finder = state.units.find(({ unit }) => unit.id === unitId);
  if (!finder || finder.unit.isDead) return unchanged(state);
  const treasure = hiddenTreasures.find(
    (t) => !state.collectedTreasures?.[t.id]
      && t.position.x === finder.unit.position.x
      && t.position.y === finder.unit.position.y,
  );
  if (!treasure) return unchanged(state);

  const isThief = opensLocksInately(finder);
  const chance = isThief ? 100 : Math.min(100, Math.max(10, finder.stats.lck * 4));
  if (!rng.roll1RN(chance)) return unchanged(state);

  const itemDef = items.find((i) => i.id === treasure.itemId) ?? { id: treasure.itemId, name: treasure.itemId };
  const added = tryWithItem(finder, itemDef, items);
  const units = mapUnit(state.units, unitId, () => added.entry);
  const nextTreasures = { ...state.collectedTreasures, [treasure.id]: true };

  const event: GameEvent = added.added
    ? {
        type: 'item_gained',
        unitId,
        unitName: finder.unit.name,
        itemId: itemDef.id,
        itemName: itemDef.name,
        source: 'desert',
      }
    : {
        type: 'item_overflow',
        unitId,
        unitName: finder.unit.name,
        itemId: itemDef.id,
        itemName: itemDef.name,
        source: 'desert',
      };

  return {
    state: {
      ...state,
      units,
      collectedTreasures: nextTreasures,
    },
    events: [event],
  };
}
