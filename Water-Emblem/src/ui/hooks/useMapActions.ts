import { useMemo } from 'react';
import type { ExtendedUnitState, ChapterData } from '../../core/data/chapterData';
import type { Position, MapData } from '../../core/grid/types';
import type { ChapterState, GameEvent, VillageState, ChestState, DoorState } from '../../core/chapter/events';
import { openChest, openDoor, recruit, seize, visitVillage } from '../../core/chapter/events';
import { eventLogLines, villageRewardText } from '../eventLog';
import { getManhattanDistance } from '../../core/combat/calculator';
import { defaultRNG } from '../../core/combat/rng';
import { mountOrDismount, promote, useItem, wait } from '../../core/turn/playerActions';
import { canDanceFor, executeDance } from '../../core/turn/dance';
import { imitateUnit, transformUnit } from '../../core/combat/transform';
import { getClassDefinition } from '../../core/class/classRules';
import { soundManager } from '../../audio/soundManager';
import itemsJson from '../../../data/items.json' with { type: 'json' };
import type { TurnManager } from '../../core/turn/turnManager';
import { ITEM_BY_ID } from './itemCatalog';
import type { ChapterDialogueData } from './useChapterState';

export interface UseMapActionsParams {
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly pendingMovePos: Position | null;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly currentChapter: ChapterData;
  readonly currentDialogues: ChapterDialogueData;
  readonly mapData: MapData;
  readonly villageStates: Record<string, VillageState>;
  readonly chestStates: Record<string, ChestState>;
  readonly doorStates: Record<string, DoorState>;
  readonly chapterState: () => ChapterState;
  readonly commitChapterState: (next: ChapterState) => void;
  readonly turnManager: TurnManager;
  readonly endUnitTurn: () => void;
  readonly syncState: () => void;
  readonly executeWithMove: (actionFn: () => void) => void;
  readonly checkChapterOutcome: (units: readonly ExtendedUnitState[]) => void;
  readonly setChapterOutcome: React.Dispatch<React.SetStateAction<'ongoing' | 'victory' | 'defeat'>>;
  readonly queueOverflows: (events: readonly GameEvent[]) => void;
  readonly setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  readonly setActiveVillageDialogue: (dialogue: { villageName: string; lines: readonly import('../../core/chapter/events').DialogueLine[]; rewardText: string } | null) => void;
  readonly onActionDone: () => void;
}

export function useMapActions({
  selectedExtUnit,
  pendingMovePos,
  extendedUnits,
  setExtendedUnits,
  currentChapter,
  currentDialogues,
  mapData,
  villageStates,
  chestStates,
  doorStates,
  chapterState,
  commitChapterState,
  turnManager,
  endUnitTurn,
  syncState,
  executeWithMove,
  checkChapterOutcome,
  setChapterOutcome,
  queueOverflows,
  setCombatLog,
  setActiveVillageDialogue,
  onActionDone,
}: UseMapActionsParams) {
  const talkTarget = selectedExtUnit && pendingMovePos
    ? extendedUnits.find(({ unit }) => currentChapter.recruitments.some((rule) =>
      rule.speakerUnitId === selectedExtUnit.unit.id && rule.targetUnitId === unit.id
      && unit.faction === 'enemy' && !unit.isDead
      && getManhattanDistance(pendingMovePos, unit.position) <= rule.maxDistance))
    : undefined;

  const currentVillageAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit || selectedExtUnit.unit.id !== currentChapter.lordUnitId) return null;
    const village = currentChapter.villages?.find((v) => v.position.x === pendingMovePos.x && v.position.y === pendingMovePos.y);
    if (!village) return null;
    return (villageStates[village.id] ?? 'intact') === 'intact' ? village : null;
  }, [pendingMovePos, selectedExtUnit, currentChapter.villages, currentChapter.lordUnitId, villageStates]);

  const currentChestAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit) return null;
    const chest = currentChapter.chests?.find((c) => c.position.x === pendingMovePos.x && c.position.y === pendingMovePos.y);
    return chest && chestStates[chest.id] !== 'opened' ? chest : null;
  }, [pendingMovePos, selectedExtUnit, currentChapter.chests, chestStates]);

  const doorAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit) return null;
    const door = currentChapter.doors?.find((d) => Math.abs(d.position.x - pendingMovePos.x) + Math.abs(d.position.y - pendingMovePos.y) === 1);
    return door && doorStates[door.id] !== 'opened' ? door : null;
  }, [pendingMovePos, selectedExtUnit, currentChapter.doors, doorStates]);

  const danceTarget = selectedExtUnit && pendingMovePos
    ? extendedUnits.find((entry) => canDanceFor(selectedExtUnit, entry, getManhattanDistance(entry.unit.position, pendingMovePos)))
    : undefined;

  const imitateTarget = selectedExtUnit?.unit.classId === 'chameleon' && pendingMovePos && (selectedExtUnit.unit.imitateTurns ?? 0) <= 0
    ? extendedUnits.find((entry) => entry.unit.faction === 'player' && !entry.unit.isDead
      && entry.unit.id !== selectedExtUnit.unit.id && getManhattanDistance(entry.unit.position, pendingMovePos) === 1)
    : undefined;

  const handleConfirmWait = () => {
    if (!selectedExtUnit) return;
    executeWithMove(() => {
      const res = wait({ units: extendedUnits }, { unitId: selectedExtUnit.unit.id });
      if (!res) return;
      soundManager.playSfx('accept');
      turnManager.waitSelectedUnit();
      setExtendedUnits([...res.state.units]);
      onActionDone();
      syncState();
    });
  };

  const handleOpenChest = () => {
    if (!currentChestAtPendingPos || !selectedExtUnit || !pendingMovePos) return;
    const chest = currentChestAtPendingPos;
    executeWithMove(() => {
      const result = openChest(chapterState(), selectedExtUnit.unit.id, chest, currentChapter, itemsJson.items);
      if (result.events.length === 0) return;
      soundManager.playSfx('item_get');
      setCombatLog((prev) => [...eventLogLines(result.events), ...prev]);
      commitChapterState(result.state);
      queueOverflows(result.events);
      endUnitTurn();
      onActionDone();
      syncState();
    });
  };

  const handleOpenDoor = () => {
    if (!doorAtPendingPos || !selectedExtUnit || !pendingMovePos) return;
    const door = doorAtPendingPos;
    executeWithMove(() => {
      const result = openDoor(chapterState(), selectedExtUnit.unit.id, door);
      if (result.events.length === 0) return;
      soundManager.playSfx('item_get');
      setCombatLog((prev) => [...eventLogLines(result.events), ...prev]);
      commitChapterState(result.state);
      endUnitTurn();
      onActionDone();
      syncState();
    });
  };

  const handleUseVulnerary = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const res = useItem({ units: extendedUnits, itemById: ITEM_BY_ID }, { unitId: selectedExtUnit.unit.id, itemId: 'vulnerary' });
      if (!res) return;
      soundManager.playSfx('heal');
      turnManager.replaceUnits(res.state.units.map(({ unit }) => unit));
      endUnitTurn();
      setExtendedUnits([...res.state.units]);
      const changed = res.state.units.find((u) => u.unit.id === selectedExtUnit.unit.id);
      if (changed) setCombatLog((prev) => [`${changed.unit.name} used Vulnerary: HP ${changed.stats.hp}/${changed.stats.maxHp}`, ...prev].slice(0, 20));
      syncState();
    });
  };

  const handlePromote = (targetClassId: string) => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const res = promote({ units: extendedUnits }, { unitId: selectedExtUnit.unit.id, targetClassId });
      if (!res) return;
      soundManager.playSfx('levelup');
      turnManager.replaceUnits(res.state.units.map(({ unit }) => unit));
      endUnitTurn();
      setExtendedUnits([...res.state.units]);
      const changed = res.state.units.find((u) => u.unit.id === selectedExtUnit.unit.id);
      setCombatLog((prev) => [`${changed?.unit.name ?? selectedExtUnit.unit.name} promoted to ${getClassDefinition(targetClassId)?.name ?? targetClassId}`, ...prev].slice(0, 20));
      syncState();
    });
  };

  const handleToggleMounted = () => {
    if (!selectedExtUnit || pendingMovePos || selectedExtUnit.unit.hasActed) return;
    const res = mountOrDismount({ units: extendedUnits }, { unitId: selectedExtUnit.unit.id });
    if (!res) return;
    soundManager.playSfx('cursor');
    setExtendedUnits([...res.state.units]);
    turnManager.replaceUnits(res.state.units.map(({ unit }) => unit));
    syncState();
  };

  const handleSeize = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const result = seize(chapterState(), selectedExtUnit.unit.id, currentChapter, itemsJson.items);
      if (!result.events.some(({ type }) => type === 'chapter_seized')) return;
      soundManager.playSfx('stage_clear');
      commitChapterState(result.state);
      queueOverflows(result.events);
      setCombatLog((prev) => [...eventLogLines(result.events), ...prev]);
      endUnitTurn();
      setChapterOutcome('victory');
      syncState();
    });
  };

  const handleEscape = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const updatedUnits = extendedUnits.map((entry) => entry.unit.id === selectedExtUnit.unit.id
        ? { ...entry, unit: { ...entry.unit, hasEscaped: true, hasActed: true } }
        : entry);
      turnManager.replaceUnits(updatedUnits.map(({ unit }) => unit));
      setExtendedUnits(updatedUnits);
      soundManager.playSfx('accept');
      setCombatLog((prev) => [`🏃 ${selectedExtUnit.unit.name} escapes the map!`, ...prev]);
      checkChapterOutcome(updatedUnits);
      turnManager.waitSelectedUnit();
      syncState();
    });
  };

  const handleTransform = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const transformed = transformUnit(selectedExtUnit, ITEM_BY_ID);
      if (!transformed) return;
      const next = extendedUnits.map((entry) => entry.unit.id === transformed.unit.id ? transformed : entry);
      turnManager.replaceUnits(next.map(({ unit }) => unit));
      setExtendedUnits(next);
      soundManager.playSfx('accept');
      setCombatLog((prev) => [`🐉 ${transformed.unit.name} transforms into a dragon!`, ...prev]);
      turnManager.waitSelectedUnit();
      syncState();
    });
  };

  const handleDance = () => {
    if (!selectedExtUnit || !danceTarget) return;
    executeWithMove(() => {
      const result = executeDance(selectedExtUnit, danceTarget, extendedUnits, 18, defaultRNG);
      turnManager.replaceUnits(result.updatedUnits.map(({ unit }) => unit));
      setExtendedUnits([...result.updatedUnits]);
      soundManager.playSfx('accept');
      setCombatLog((prev) => [result.message, ...prev]);
      turnManager.waitSelectedUnit();
      syncState();
    });
  };

  const handleImitate = () => {
    if (!selectedExtUnit || !imitateTarget) return;
    executeWithMove(() => {
      const imitated = imitateUnit(selectedExtUnit, imitateTarget);
      if (!imitated) return;
      const next = extendedUnits.map((entry) => entry.unit.id === imitated.unit.id ? imitated : entry);
      turnManager.replaceUnits(next.map(({ unit }) => unit));
      setExtendedUnits(next);
      soundManager.playSfx('accept');
      setCombatLog((prev) => [`🎭 ${imitated.unit.name} imitates ${imitateTarget.unit.name}!`, ...prev]);
      turnManager.waitSelectedUnit();
      syncState();
    });
  };

  const handleTalk = () => {
    if (!talkTarget || !selectedExtUnit) return;
    executeWithMove(() => {
      const result = recruit(chapterState(), selectedExtUnit.unit.id, talkTarget.unit.id, currentChapter, currentDialogues);
      if (result.events.length === 0) return;
      soundManager.playSfx('item_get');
      commitChapterState(result.state);
      queueOverflows(result.events);
      endUnitTurn();
      setCombatLog((prev) => [...eventLogLines(result.events), ...prev]);
      syncState();
    });
  };

  const handleVisitVillage = () => {
    if (!currentVillageAtPendingPos || !selectedExtUnit || !pendingMovePos) return;
    const village = currentVillageAtPendingPos;
    executeWithMove(() => {
      const result = visitVillage(chapterState(), selectedExtUnit.unit.id, village, itemsJson.items, currentDialogues, currentChapter, mapData);
      if (result.events.length === 0) return;
      soundManager.playSfx('item_get');
      const dialogue = result.events.find((event) => event.type === 'dialogue');
      setActiveVillageDialogue({
        villageName: village.name,
        lines: dialogue?.type === 'dialogue' ? dialogue.lines : [],
        rewardText: villageRewardText(result.events),
      });
      setCombatLog((prev) => [...eventLogLines(result.events), ...prev]);
      commitChapterState(result.state);
      queueOverflows(result.events);
      endUnitTurn();
      onActionDone();
      syncState();
    });
  };

  return {
    talkTarget,
    currentVillageAtPendingPos,
    currentChestAtPendingPos,
    doorAtPendingPos,
    danceTarget,
    imitateTarget,
    handleConfirmWait,
    handleOpenChest,
    handleOpenDoor,
    handleUseVulnerary,
    handlePromote,
    handleToggleMounted,
    handleSeize,
    handleEscape,
    handleTransform,
    handleDance,
    handleImitate,
    handleTalk,
    handleVisitVillage,
  };
}
