import { getManhattanDistance } from '../combat/calculator';
import type { ChapterData, ChapterReward, ChapterVillage, ExtendedUnitState } from '../data/chapterData';
import { evaluateChapterOutcome } from './types';

export type VillageState = 'intact' | 'visited' | 'destroyed';

export interface DialogueLine {
  readonly speaker: string;
  readonly avatarUrl: string;
  readonly text: string;
}

export type DialogueKind = 'village' | 'recruit' | 'boss_start' | 'boss_death';

export type GameEvent =
  | { readonly type: 'gold_gained'; readonly unitId: string; readonly amount: number; readonly source: 'village' | 'seize' }
  | {
      readonly type: 'item_gained';
      readonly unitId: string;
      readonly unitName: string;
      readonly itemId: string;
      readonly itemName: string;
      readonly source: 'village' | 'seize' | 'loot';
      readonly fromUnitName?: string;
    }
  | { readonly type: 'village_visited'; readonly unitId: string; readonly unitName: string; readonly villageId: string; readonly villageName: string }
  | { readonly type: 'village_destroyed'; readonly unitId: string; readonly villageId: string; readonly villageName: string }
  | { readonly type: 'unit_recruited'; readonly unitId: string; readonly speakerId: string }
  | { readonly type: 'chapter_seized'; readonly unitId: string }
  | { readonly type: 'dialogue'; readonly kind: DialogueKind; readonly lines: readonly DialogueLine[] };

/** The slice of game state that chapter events can change. */
export interface ChapterState {
  readonly units: readonly ExtendedUnitState[];
  readonly gold: number;
  readonly villageStates: Readonly<Record<string, VillageState>>;
}

export interface EventResult {
  readonly state: ChapterState;
  readonly events: readonly GameEvent[];
}

export interface ItemInfo {
  readonly id: string;
  readonly name: string;
  readonly maxUses?: number;
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

function withItem(entry: ExtendedUnitState, item: ItemInfo): ExtendedUnitState {
  return { ...entry, inventory: [...entry.inventory, { itemId: item.id, uses: item.maxUses ?? 1 }] };
}

function mapUnit(units: readonly ExtendedUnitState[], unitId: string, change: (entry: ExtendedUnitState) => ExtendedUnitState): ExtendedUnitState[] {
  return units.map((entry) => (entry.unit.id === unitId ? change(entry) : entry));
}

function applyReward(
  state: ChapterState,
  unitId: string,
  reward: ChapterReward,
  source: 'village' | 'seize',
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
  return {
    state: { ...state, units: mapUnit(state.units, unitId, (entry) => withItem(entry, item)) },
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
  const lines = dialogueLines(villageLines) ?? [{
    speaker: 'Villager',
    avatarUrl: '/avatars/village_man.png',
    text: 'Thank you Prince Marth for protecting our village!',
  }];
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
  events.push({
    type: 'item_gained',
    unitId: killerId,
    unitName: killer.unit.name,
    itemId: item.id,
    itemName: item.name,
    source: 'loot',
    fromUnitName: defeated.unit.name,
  });
  return { state: { ...state, units: mapUnit(state.units, killerId, (entry) => withItem(entry, item)) }, events };
}
