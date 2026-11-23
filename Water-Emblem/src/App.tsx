import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Position } from './core/grid/types';
import type { TurnState } from './core/turn/turnManager';
import { canOpenChest, canOpenDoor } from './core/chapter/events';
import { getClassDefinition } from './core/class/classRules';
import { ThreeScene } from './renderer/ThreeScene';
import { Grid2D } from './renderer/Grid2D';
import { BattleSettingsMenu, HUD_EDGE, HUD_SIZE } from './ui/BattleSettingsMenu';
import { ITEM_BY_ID } from './ui/hooks/itemCatalog';
import { useChapterState } from './ui/hooks/useChapterState';
import { useTurnFlow } from './ui/hooks/useTurnFlow';
import { useGameFeedback } from './ui/hooks/useGameFeedback';
import { useActionTargeting } from './ui/hooks/useActionTargeting';
import { useMapActions } from './ui/hooks/useMapActions';
import { useShopArena } from './ui/hooks/useShopArena';
import { useSelection } from './ui/hooks/useSelection';
import { buildActionMenuActions } from './ui/hooks/actionTargetingHelpers';
import { BattleWindows } from './ui/hooks/BattleWindows';
import { ScreenModals } from './ui/hooks/ScreenModals';

const HUD_CLEAR = HUD_EDGE + HUD_SIZE + 8;

declare global {
  interface Window {
    __WATER_EMBLEM_STATE__?: unknown;
  }
}

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('2d');

  // References to decouple mutual dependencies between custom hooks
  const turnManagerRef = useRef<import('./core/turn/turnManager').TurnManager | null>(null);
  const turnStateRef = useRef<TurnState>({ turnNumber: 1, activePhase: 'player_phase', units: [], selectedUnitId: null, reachableTiles: null });
  const syncStateRef = useRef<() => void>(() => {});
  const resetSelectionRef = useRef<() => void>(() => {});
  const feedbackRef = useRef<{
    showNotice: (msg: string) => void;
    setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
    setPopupQueue: React.Dispatch<React.SetStateAction<import('./ui/combatPopupData').CombatPopupData[]>>;
  }>({ showNotice: () => {}, setCombatLog: () => {}, setPopupQueue: () => {} });

  const selectionStateRef = useRef<{
    pendingMovePos: Position | null;
    isProcessingAI: boolean;
    combatForecast: import('./core/combat/types').CombatForecast | null;
    activeMovingUnit?: import('./renderer/movementAnimation').ActiveMovingUnit | null;
  }>({ pendingMovePos: null, isProcessingAI: false, combatForecast: null, activeMovingUnit: null });

  // 1. Chapter State
  const chapter = useChapterState({
    turnManagerRef,
    getTurnState: () => turnStateRef.current,
    syncState: () => syncStateRef.current(),
    showNotice: (msg) => feedbackRef.current.showNotice(msg),
    setCombatLog: (val) => feedbackRef.current.setCombatLog(val),
    setPopupQueue: (val) => feedbackRef.current.setPopupQueue(val),
    resetSelection: () => resetSelectionRef.current(),
    isProcessingAI: selectionStateRef.current.isProcessingAI,
    pendingMovePos: selectionStateRef.current.pendingMovePos,
    combatForecast: selectionStateRef.current.combatForecast,
    activeMovingUnit: selectionStateRef.current.activeMovingUnit,
  });

  // 2. Feedback (sound, logs, notifications, popups)
  const feedback = useGameFeedback({
    activeScreen: chapter.activeScreen,
    showStoryIntro: chapter.showStoryIntro,
    showPreparation: chapter.showPreparation,
    chapterOutcome: chapter.chapterOutcome,
    activePhase: turnStateRef.current.activePhase,
    extendedUnits: chapter.extendedUnits,
    setExtendedUnits: chapter.setExtendedUnits,
    convoy: chapter.convoy,
    setConvoy: chapter.setConvoy,
    syncState: () => syncStateRef.current(),
  });
  feedbackRef.current = {
    showNotice: feedback.showNotice,
    setCombatLog: feedback.setCombatLog,
    setPopupQueue: feedback.setPopupQueue,
  };

  const selectionActionRef = useRef<{
    executeWithMove: (fn: () => void) => void;
    setActiveMovingUnit: (amu: import('./renderer/movementAnimation').ActiveMovingUnit | null) => void;
  }>({ executeWithMove: () => {}, setActiveMovingUnit: () => {} });

  // 3. Turn Flow (phase handling, AI turn loop, turn outcome evaluation)
  const turn = useTurnFlow({
    initialUnits: chapter.extendedUnits,
    extendedUnits: chapter.extendedUnits, setExtendedUnits: chapter.setExtendedUnits,
    currentChapter: chapter.currentChapter, chapterObjective: chapter.chapterObjective,
    currentDialogues: chapter.currentDialogues, mapData: chapter.mapData, openedDoorKeys: new Set(),
    gold: chapter.gold, setGold: chapter.setGold,
    villageStates: chapter.villageStates, setVillageStates: chapter.setVillageStates,
    chestStates: chapter.chestStates, setChestStates: chapter.setChestStates, doorStates: chapter.doorStates,
    spawnedReinforcements: chapter.spawnedReinforcements, setSpawnedReinforcements: chapter.setSpawnedReinforcements,
    chapterOutcome: chapter.chapterOutcome, setChapterOutcome: chapter.setChapterOutcome,
    queueOverflows: feedback.queueOverflows, setPendingLevelUp: feedback.setPendingLevelUp,
    queueLevelUps: feedback.queueLevelUps, levelUpQueueRef: feedback.levelUpQueueRef,
    setPopupQueue: feedback.setPopupQueue, popupQueueRef: feedback.popupQueueRef, popupIdRef: feedback.popupIdRef,
    setCombatLog: feedback.setCombatLog, showNotice: feedback.showNotice,
    setActiveMovingUnit: (amu) => selectionActionRef.current.setActiveMovingUnit(amu),
  });
  turnManagerRef.current = turn.turnManager;
  turnStateRef.current = turn.turnState;
  syncStateRef.current = turn.syncState;

  const selectionPosRef = useRef<{
    pendingMovePos: Position | null;
    selectedExtUnit: import('./core/data/chapterData').ExtendedUnitState | undefined;
    moveCommitted: boolean;
    setPendingMovePos: React.Dispatch<React.SetStateAction<Position | null>>;
    setPlannedPath: React.Dispatch<React.SetStateAction<readonly Position[] | null>>;
    setMoveOrigin: React.Dispatch<React.SetStateAction<Position | null>>;
    setMoveCommitted: React.Dispatch<React.SetStateAction<boolean>>;
  }>({
    pendingMovePos: null, selectedExtUnit: undefined, moveCommitted: false,
    setPendingMovePos: () => {}, setPlannedPath: () => {}, setMoveOrigin: () => {}, setMoveCommitted: () => {},
  });

  // 4. Action Targeting (Attack, Staff, Warp, Trade targeting)
  const targeting = useActionTargeting({
    selectedExtUnit: selectionPosRef.current.selectedExtUnit, pendingMovePos: selectionPosRef.current.pendingMovePos,
    extendedUnits: chapter.extendedUnits, setExtendedUnits: chapter.setExtendedUnits,
    currentChapter: chapter.currentChapter, currentDialogues: chapter.currentDialogues, mapData: chapter.mapData,
    setVillageStates: chapter.setVillageStates, gold: chapter.gold, setGold: chapter.setGold,
    chapterState: chapter.chapterState, turnManager: turn.turnManager, endUnitTurn: () => turn.turnManager.waitSelectedUnit(),
    syncState: turn.syncState, executeWithMove: (fn) => selectionActionRef.current.executeWithMove(fn),
    checkChapterOutcome: turn.checkChapterOutcome, queueOverflows: feedback.queueOverflows,
    setPendingLevelUp: feedback.setPendingLevelUp, setPopupQueue: feedback.setPopupQueue, popupIdRef: feedback.popupIdRef,
    setCombatLog: feedback.setCombatLog, showNotice: feedback.showNotice,
    setPendingMovePos: (pos) => selectionPosRef.current.setPendingMovePos(pos),
    setPlannedPath: (path) => selectionPosRef.current.setPlannedPath(path),
    setMoveOrigin: (pos) => selectionPosRef.current.setMoveOrigin(pos),
    setMoveCommitted: (val) => selectionPosRef.current.setMoveCommitted(val),
  });

  // 5. Map Actions (chest, door, village, seize, escape, transform, dance, talk, wait, promote, mount)
  const mapActions = useMapActions({
    selectedExtUnit: selectionPosRef.current.selectedExtUnit, pendingMovePos: selectionPosRef.current.pendingMovePos,
    extendedUnits: chapter.extendedUnits, setExtendedUnits: chapter.setExtendedUnits,
    currentChapter: chapter.currentChapter, currentDialogues: chapter.currentDialogues, mapData: chapter.mapData,
    villageStates: chapter.villageStates, chestStates: chapter.chestStates, doorStates: chapter.doorStates,
    chapterState: chapter.chapterState, commitChapterState: chapter.commitChapterState, turnManager: turn.turnManager,
    endUnitTurn: () => turn.turnManager.waitSelectedUnit(), syncState: turn.syncState,
    executeWithMove: (fn) => selectionActionRef.current.executeWithMove(fn),
    checkChapterOutcome: turn.checkChapterOutcome, setChapterOutcome: chapter.setChapterOutcome,
    queueOverflows: feedback.queueOverflows, setCombatLog: feedback.setCombatLog,
    setActiveVillageDialogue: chapter.setActiveVillageDialogue,
    onActionDone: () => { targeting.setSelectedTarget(null); targeting.setCombatForecast(null); },
  });

  // 6. Shop, Storage, Arena & Preparation Convoy/Trade
  const shopArena = useShopArena({
    selectedExtUnit: selectionPosRef.current.selectedExtUnit, pendingMovePos: selectionPosRef.current.pendingMovePos,
    extendedUnits: chapter.extendedUnits, setExtendedUnits: chapter.setExtendedUnits,
    reserveUnits: chapter.reserveUnits, setReserveUnits: chapter.setReserveUnits,
    convoy: chapter.convoy, setConvoy: chapter.setConvoy, gold: chapter.gold, setGold: chapter.setGold,
    currentChapter: chapter.currentChapter, currentChapterId: chapter.currentChapterId, mapData: chapter.mapData,
    turnManager: turn.turnManager, syncState: turn.syncState,
    executeWithMove: (fn) => selectionActionRef.current.executeWithMove(fn),
    endUnitTurn: () => turn.turnManager.waitSelectedUnit(), setCombatLog: feedback.setCombatLog,
  });

  // 7. Selection & Navigation (tiles, path, hover, inspect, danger keys)
  const selection = useSelection({
    extendedUnits: chapter.extendedUnits, setExtendedUnits: chapter.setExtendedUnits,
    currentChapter: chapter.currentChapter, mapData: chapter.mapData, doorStates: chapter.doorStates,
    turnManager: turn.turnManager, turnState: turn.turnState, syncState: turn.syncState,
    adoptTurnUnitsInPlace: turn.adoptTurnUnitsInPlace, isProcessingAI: turn.isProcessingAI,
    attackTargetKeys: targeting.attackTargetKeys, staffTargetKeys: targeting.staffTargetKeys,
    tradeTargetKeys: targeting.tradeTargetKeys, warpDestinationKeys: targeting.warpDestinationKeys,
    attackTargeting: targeting.attackTargeting, staffTargeting: Boolean(targeting.staffTargeting),
    tradeTargeting: targeting.tradeTargeting, warpTargeting: Boolean(targeting.warpTargeting),
    weaponPickerOpen: targeting.weaponPickerOpen, staffPickerOpen: targeting.staffPickerOpen,
    combatForecast: targeting.combatForecast, staffForecast: targeting.staffForecast,
    hasActiveModal: Boolean(feedback.pendingOverflows.length > 0 || targeting.tradeState || shopArena.storageOpen || shopArena.shopOpen || shopArena.arenaOpen),
    onTargetingTileClick: targeting.onTargetingTileClick, resetTargeting: targeting.resetTargeting,
  });

  resetSelectionRef.current = selection.resetSelection;
  selectionActionRef.current = { executeWithMove: selection.executeWithMove, setActiveMovingUnit: selection.setActiveMovingUnit };
  selectionPosRef.current = {
    pendingMovePos: selection.pendingMovePos, selectedExtUnit: selection.selectedExtUnit, moveCommitted: selection.moveCommitted,
    setPendingMovePos: selection.setPendingMovePos, setPlannedPath: selection.setPlannedPath,
    setMoveOrigin: selection.setMoveOrigin, setMoveCommitted: selection.setMoveCommitted,
  };
  selectionStateRef.current = {
    pendingMovePos: selection.pendingMovePos, isProcessingAI: turn.isProcessingAI, combatForecast: targeting.combatForecast,
    activeMovingUnit: selection.activeMovingUnit,
  };

  useEffect(() => {
    window.__WATER_EMBLEM_STATE__ = {
      extendedUnits: chapter.extendedUnits,
      turnState: turn.turnState,
      currentChapterId: chapter.currentChapterId,
    };
  }, [chapter.extendedUnits, turn.turnState, chapter.currentChapterId]);

  const actionMenuProps = useMemo(() => buildActionMenuActions({
    pendingMovePos: selection.pendingMovePos, moveCommitted: selection.moveCommitted,
    selectedExtUnit: selection.selectedExtUnit, activeMovingUnit: selection.activeMovingUnit,
    combatForecast: targeting.combatForecast, staffForecast: targeting.staffForecast,
    attackTargeting: targeting.attackTargeting, tradeTargeting: targeting.tradeTargeting,
    weaponPickerOpen: targeting.weaponPickerOpen, staffPickerOpen: targeting.staffPickerOpen,
    tradeState: targeting.tradeState, storageOpen: shopArena.storageOpen, shopOpen: shopArena.shopOpen,
    arenaOpen: shopArena.arenaOpen, staffTargeting: targeting.staffTargeting, warpTargeting: targeting.warpTargeting,
    chapterObjective: chapter.chapterObjective, lordUnitId: chapter.currentChapter.lordUnitId,
    talkTargetName: mapActions.talkTarget?.unit.name ?? null,
    currentVillageName: mapActions.currentVillageAtPendingPos?.name ?? null,
    attackableTargets: targeting.attackableTargets, tradePartners: targeting.tradePartners,
    canStorage: shopArena.canStorage, canShop: shopArena.canShop, canArena: shopArena.canArena,
    currentChestAtPendingPos: Boolean(selection.selectedExtUnit && mapActions.currentChestAtPendingPos && canOpenChest(selection.selectedExtUnit, chapter.currentChapter)),
    currentDoorAtPendingPos: Boolean(selection.selectedExtUnit && mapActions.doorAtPendingPos && canOpenDoor(selection.selectedExtUnit)),
    danceTargetName: mapActions.danceTarget?.unit.name ?? null,
    imitateTargetName: mapActions.imitateTarget?.unit.name ?? null,
    extendedUnits: chapter.extendedUnits, itemById: ITEM_BY_ID,
  }), [selection, targeting, mapActions, shopArena, chapter]);

  const mountLabel = selection.selectedExtUnit && !targeting.combatForecast && !targeting.staffForecast && !selection.activeMovingUnit
    && (selection.selectedExtUnit.unit.mountedClassId || getClassDefinition(selection.selectedExtUnit.unit.classId)?.mountKind)
    ? (selection.selectedExtUnit.unit.mountedClassId ? 'Mount' : 'Dismount')
    : null;

  return (
    <div>
      <div style={{ position: 'fixed', inset: 0, overflow: 'auto', backgroundColor: '#111' }}>
        {viewMode === '3d' ? (
          <div style={{ width: '100%', height: '100%' }}>
            <ThreeScene
              mapData={chapter.mapData} units={chapter.extendedUnits} reachableKeys={selection.reachableKeys}
              dangerZoneKeys={selection.combinedDangerZoneKeys} attackTargetKeys={targeting.attackTargetKeys}
              selectedPos={selection.pendingMovePos || (selection.selectedExtUnit ? selection.selectedExtUnit.unit.position : null)}
              onTileClick={selection.handleTileClick} onTileHover={selection.handleTileHover}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', width: 'max-content', minWidth: '100%', minHeight: '100%', boxSizing: 'border-box', padding: `${HUD_CLEAR}px ${HUD_CLEAR}px ${HUD_CLEAR}px 8px` }}>
            <Grid2D
              board={selection.boardView} isInspectingEnemy={Boolean(selection.inspectedEnemy && !selection.selectedExtUnit)}
              movementPath={selection.moveCommitted ? null : selection.plannedPath} pendingDestination={selection.pendingMovePos}
              activeMovingUnit={selection.activeMovingUnit} activeActingEnemyId={turn.activeActingEnemyId}
              getUnitDisplay={selection.getUnitDisplay} onTileClick={selection.handleTileClick}
              onTileHover={selection.handleTileHover} onTileInspect={(x, y) => selection.setInspectedTile({ x, y })}
            />
          </div>
        )}
      </div>

      <BattleSettingsMenu
        forceCloseKey={[chapter.currentChapterId, chapter.showPreparation, chapter.showStoryIntro, chapter.activeVillageDialogue !== null, chapter.chapterOutcome, chapter.activeScreen].join('|')}
        chapterId={chapter.currentChapterId} chapterName={chapter.currentChapter.name} objectiveText={chapter.chapterObjective.description ?? ''}
        gold={chapter.gold} turnNumber={turn.turnState.turnNumber} activePhase={turn.turnState.activePhase} viewMode={viewMode}
        isMuted={feedback.isMuted} volume={feedback.volume} onVolume={feedback.handleVolume} onChapterChange={chapter.loadChapter}
        onTitle={() => chapter.setActiveScreen('title')} onWorldMap={() => chapter.setActiveScreen('world_map')}
        onSaveFiles={() => { chapter.setSaveSlotsMode('load'); chapter.setActiveScreen('save_slots'); }}
        onSave={() => chapter.handleSave()} onLoad={() => chapter.handleLoad()} onViewMode={setViewMode}
        autoEndTurn={turn.autoEndTurn} onAutoEndTurn={turn.setAutoEndTurnState} onToggleMute={feedback.handleToggleMute}
        leading={turn.turnState.activePhase === 'player_phase' ? (
          <button
            onClick={turn.handleEndTurn}
            disabled={turn.isProcessingAI || selection.pendingMovePos !== null || targeting.combatForecast !== null || selection.activeMovingUnit !== null}
            style={{
              height: `${HUD_SIZE}px`, padding: '0 20px', backgroundColor: '#1d4ed8', border: '1px solid #60a5fa',
              borderRadius: '8px', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              opacity: (turn.isProcessingAI || selection.pendingMovePos !== null || targeting.combatForecast !== null || selection.activeMovingUnit !== null) ? 0.5 : 1,
            }}
          >
            End Turn
          </button>
        ) : turn.isProcessingAI ? (
          <button
            onClick={turn.skipEnemyPhase}
            data-testid="skip-enemy-phase-btn"
            style={{
              height: `${HUD_SIZE}px`, padding: '0 20px', backgroundColor: '#dc2626', border: '1px solid #f87171',
              borderRadius: '8px', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            Skip ⏭️
          </button>
        ) : null}
      />

      <BattleWindows
        selection={selection}
        targeting={targeting}
        mapActions={mapActions}
        shopArena={shopArena}
        feedback={feedback}
        turn={turn}
        chapter={chapter}
        actionMenuProps={actionMenuProps}
        mountLabel={mountLabel}
      />

      <ScreenModals chapter={chapter} feedback={feedback} shopArena={shopArena} />
    </div>
  );
};

export default App;
