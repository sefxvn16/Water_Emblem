import { useState } from 'react';
import talysMapRaw from '../../../data/maps/chapter_01_talys.json' with { type: 'json' };
import testMapRaw from '../../../data/maps/test_map_01.json' with { type: 'json' };
import ch01Dialogues from '../../../data/dialogues/chapter_01_dialogues.json' with { type: 'json' };
import ch02Dialogues from '../../../data/dialogues/chapter_02_dialogues.json' with { type: 'json' };
import ch03Dialogues from '../../../data/dialogues/chapter_03_dialogues.json' with { type: 'json' };
import worldMapData from '../../../data/world_map.json' with { type: 'json' };
import type { MapData, Position } from '../../core/grid/types';
import type { ExtendedUnitState, InventoryEntry } from '../../core/data/chapterData';
import { chapters, chapter01Data } from '../../core/data/chapterData';
import { CHAPTER_SOURCES, nextCampaignChapterId } from '../../core/data/chapterRegistry';
import type { ChapterState, ChestState, DialogueLine, DoorState, VillageState } from '../../core/chapter/events';
import { carryUnitsToChapter, placeDeployedUnits } from '../../core/chapter/transition';
import { applyDifficulty, type Difficulty } from '../../core/chapter/difficulty';
import { announcedReinforcements } from '../../core/chapter/reinforcements';
import { saveGameState, loadGameState, type SaveGameData } from '../../storage/saveLoad';
import { defaultRNG } from '../../core/combat/rng';
import type { TurnManager, TurnState } from '../../core/turn/turnManager';
import type { CombatPopupData } from '../combatPopupData';
import type { CombatForecast } from '../../core/combat/types';
import { validateMapData, validateChapterDialogue, type ChapterDialogueData } from '../../core/data/validateData';

export type { ChapterDialogueData };

const chapterMaps: Record<string, MapData> = {
  ...Object.fromEntries(CHAPTER_SOURCES.map((source) => [source.id, source.map])),
  test_chapter_01: validateMapData(testMapRaw, 'test_map_01'),
};

const chapterDialogues: Record<string, ChapterDialogueData> = {
  chapter_01: validateChapterDialogue(ch01Dialogues, 'chapter_01'),
  chapter_02: validateChapterDialogue(ch02Dialogues, 'chapter_02'),
  chapter_03: validateChapterDialogue(ch03Dialogues, 'chapter_03'),
};

function narrationKey(chapterId: string): string {
  const book2 = /^book2_chapter_(\d+)$/.exec(chapterId);
  if (book2) return `b2_ch${book2[1]}`;
  const endgame = /^book2_endgame_([abc])$/.exec(chapterId);
  if (endgame) return `b2_ch${22 + 'abc'.indexOf(endgame[1] ?? 'a')}`;
  const book1 = /^chapter_(\d+)$/.exec(chapterId);
  return book1 ? `b1_ch${book1[1]}` : chapterId;
}

function fallbackDialogues(chapterId: string, chapterName: string): ChapterDialogueData {
  const narrations = (worldMapData as { chapterNarrations?: Record<string, string[]> }).chapterNarrations ?? {};
  const lines = narrations[narrationKey(chapterId)] ?? [];
  const toLine = (text: string): DialogueLine => ({ speaker: chapterName, text, avatarUrl: '/avatars/marth.png' });
  return {
    chapterId,
    opening: lines.length ? lines.map(toLine) : [toLine(chapterName)],
    ending: [toLine(`${chapterName} — chapter clear.`)],
  };
}

export interface UseChapterStateParams {
  readonly turnManagerRef: { current: TurnManager | null };
  readonly getTurnState: () => TurnState;
  readonly syncState: () => void;
  readonly showNotice: (msg: string) => void;
  readonly setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  readonly setPopupQueue: React.Dispatch<React.SetStateAction<CombatPopupData[]>>;
  readonly resetSelection: () => void;
  readonly isProcessingAI: boolean;
  readonly pendingMovePos: Position | null;
  readonly combatForecast: CombatForecast | null;
  readonly activeMovingUnit?: { unitId: string } | null;
}

export function useChapterState({
  turnManagerRef,
  getTurnState,
  syncState,
  showNotice,
  setCombatLog,
  setPopupQueue,
  resetSelection,
  isProcessingAI,
  pendingMovePos,
  combatForecast,
  activeMovingUnit,
}: UseChapterStateParams) {
  const [currentChapterId, setCurrentChapterId] = useState<string>('chapter_01');
  const currentChapter = chapters[currentChapterId] ?? chapter01Data;
  const mapData = chapterMaps[currentChapterId] ?? validateMapData(talysMapRaw, 'chapter_01_talys');
  const currentDialogues = chapterDialogues[currentChapterId]
    ?? fallbackDialogues(currentChapterId, currentChapter.name);
  const nextChapterId = nextCampaignChapterId(currentChapterId);
  const chapterObjective = currentChapter.objective;
  const lordName = currentChapter.units.find(({ unit }) => unit.id === currentChapter.lordUnitId)?.unit.name ?? 'The lord';

  const [extendedUnits, setExtendedUnits] = useState<ExtendedUnitState[]>(() => structuredClone(currentChapter.units));
  const [reserveUnits, setReserveUnits] = useState<ExtendedUnitState[]>([]);
  const [convoy, setConvoy] = useState<InventoryEntry[]>([]);
  const [gold, setGold] = useState<number>(0);

  const [villageStates, setVillageStates] = useState<Record<string, VillageState>>({});
  const [chestStates, setChestStates] = useState<Record<string, ChestState>>({});
  const [doorStates, setDoorStates] = useState<Record<string, DoorState>>({});
  const [spawnedReinforcements, setSpawnedReinforcements] = useState<string[]>([]);
  const [activeVillageDialogue, setActiveVillageDialogue] = useState<{
    villageName: string;
    lines: readonly DialogueLine[];
    rewardText: string;
  } | null>(null);

  const [activeScreen, setActiveScreen] = useState<'none' | 'title' | 'book_select' | 'save_slots' | 'world_map'>('title');
  const [saveSlotsMode, setSaveSlotsMode] = useState<'load' | 'save'>('load');

  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [showStoryIntro, setShowStoryIntro] = useState<boolean>(true);
  const [showPreparation, setShowPreparation] = useState<boolean>(false);
  const [chapterOutcome, setChapterOutcome] = useState<'ongoing' | 'victory' | 'defeat'>('ongoing');

  const chapterState = (units: readonly ExtendedUnitState[] = extendedUnits): ChapterState => ({
    units, gold, villageStates, chestStates, doorStates,
  });

  const commitChapterState = (next: ChapterState) => {
    setExtendedUnits([...next.units]);
    setGold(next.gold);
    setVillageStates({ ...next.villageStates });
    setChestStates({ ...next.chestStates });
    setDoorStates({ ...next.doorStates });
    turnManagerRef.current?.replaceUnits(next.units.map(({ unit }) => unit));
  };

  const loadChapter = (chapterId: string, carryoverUnits?: readonly ExtendedUnitState[]): boolean => {
    setPopupQueue([]);
    const targetChapter = chapters[chapterId];
    if (!targetChapter) {
      showNotice(`Chapter ${chapterId} has no data yet`);
      return false;
    }
    setCurrentChapterId(chapterId);
    const participatingIds = new Set(extendedUnits
      .filter(({ unit }) => unit.faction === 'player' && !unit.isDead)
      .map(({ unit }) => unit.id));
    const newUnits = applyDifficulty(carryoverUnits
      ? carryUnitsToChapter(carryoverUnits, targetChapter, participatingIds)
      : structuredClone(targetChapter.units), difficulty);
    setExtendedUnits(newUnits);
    setReserveUnits([]);
    if (!carryoverUnits) setConvoy([]);
    turnManagerRef.current?.restoreState({ turnNumber: 1, activePhase: 'player_phase' }, newUnits.map((u) => u.unit));
    syncState();
    setChapterOutcome('ongoing');
    setShowStoryIntro(true);
    setShowPreparation(targetChapter.deploymentSlots.length > 0 && targetChapter.carryoverUnitIds.length > 0);
    if (!carryoverUnits) setGold(0);
    setVillageStates({});
    setChestStates({});
    setDoorStates({});
    setSpawnedReinforcements([]);
    resetSelection();
    const arriving = announcedReinforcements(targetChapter, 1, []);
    if (arriving.length > 0) {
      setCombatLog((prev) => ['⚠️ Enemy reinforcements will arrive at the end of this turn!', ...prev]);
    }
    setActiveVillageDialogue(null);
    showNotice(`Switched to ${targetChapter.name}`);
    setCombatLog([`📜 Started ${targetChapter.name}`]);
    return true;
  };

  const handleRestartChapter = () => {
    setPopupQueue([]);
    loadChapter(currentChapterId);
  };

  const toggleDeployment = (unitId: string) => {
    if (unitId === currentChapter.lordUnitId) return;
    const active = extendedUnits.find(({ unit }) => unit.id === unitId && unit.faction === 'player');
    if (active) {
      const nextActive = placeDeployedUnits(extendedUnits.filter(({ unit }) => unit.id !== unitId), currentChapter);
      setExtendedUnits(nextActive);
      setReserveUnits([...reserveUnits, active]);
      turnManagerRef.current?.replaceUnits(nextActive.map(({ unit }) => unit));
      syncState();
      return;
    }
    const reserve = reserveUnits.find(({ unit }) => unit.id === unitId);
    const deploymentLimit = currentChapter.units.filter(({ unit }) => unit.faction === 'player').length;
    if (!reserve || extendedUnits.filter(({ unit }) => unit.faction === 'player').length >= deploymentLimit) return;
    const nextActive = placeDeployedUnits([...extendedUnits, reserve], currentChapter);
    setExtendedUnits(nextActive);
    setReserveUnits(reserveUnits.filter(({ unit }) => unit.id !== unitId));
    turnManagerRef.current?.replaceUnits(nextActive.map(({ unit }) => unit));
    syncState();
  };

  const applyLoadedSnapshot = (data: SaveGameData) => {
    setPopupQueue([]);
    if (data.chapterId !== currentChapterId) setCurrentChapterId(data.chapterId);
    setExtendedUnits(data.extendedUnits);
    setReserveUnits(data.reserveUnits ?? []);
    setConvoy(data.convoy ?? []);
    setShowPreparation(false);
    turnManagerRef.current?.restoreState(data.turnState, data.extendedUnits.map((item) => item.unit));
    defaultRNG.setSeed(data.rngSeed);
    setChapterOutcome(data.chapterOutcome);
    setShowStoryIntro(data.showStoryIntro);
    setCombatLog(data.combatLog);
    setGold(data.gold);
    setVillageStates(data.villageStates);
    setChestStates(data.chestStates ?? {});
    setDoorStates(data.doorStates ?? {});
    setSpawnedReinforcements(data.spawnedReinforcements ?? []);
    setDifficulty(data.difficulty ?? 'normal');
    resetSelection();
    setActiveVillageDialogue(null);
    syncState();
  };

  const handleSave = async (slotId: string = 'slot1') => {
    const turnState = getTurnState();
    if (pendingMovePos || combatForecast || isProcessingAI || activeMovingUnit || turnState.activePhase !== 'player_phase') {
      showNotice('Please complete your current action before saving.');
      return;
    }
    const ok = await saveGameState({
      chapterId: currentChapterId,
      turnState: { turnNumber: turnState.turnNumber, activePhase: turnState.activePhase },
      extendedUnits, reserveUnits, convoy, rngSeed: defaultRNG.getSeed(),
      chapterOutcome, showStoryIntro, combatLog: [], gold, villageStates,
      chestStates, doorStates, spawnedReinforcements, difficulty,
    }, slotId);
    showNotice(ok ? `✓ Game progress saved to ${slotId.toUpperCase()} successfully!` : 'Failed to save progress.');
  };

  const handleLoad = async (slotId: string = 'slot1') => {
    const data = await loadGameState(slotId);
    if (data) {
      applyLoadedSnapshot(data);
      showNotice(`✓ Save file loaded from ${slotId.toUpperCase()}!`);
    } else {
      alert('No valid save data found.');
    }
  };

  return {
    currentChapterId,
    setCurrentChapterId,
    currentChapter,
    mapData,
    currentDialogues,
    nextChapterId,
    chapterObjective,
    lordName,
    extendedUnits,
    setExtendedUnits,
    reserveUnits,
    setReserveUnits,
    convoy,
    setConvoy,
    gold,
    setGold,
    villageStates,
    setVillageStates,
    chestStates,
    setChestStates,
    doorStates,
    setDoorStates,
    spawnedReinforcements,
    setSpawnedReinforcements,
    activeVillageDialogue,
    setActiveVillageDialogue,
    activeScreen,
    setActiveScreen,
    saveSlotsMode,
    setSaveSlotsMode,
    difficulty,
    setDifficulty,
    showStoryIntro,
    setShowStoryIntro,
    showPreparation,
    setShowPreparation,
    chapterOutcome,
    setChapterOutcome,
    chapterState,
    commitChapterState,
    loadChapter,
    handleRestartChapter,
    toggleDeployment,
    applyLoadedSnapshot,
    handleSave,
    handleLoad,
  };
}
