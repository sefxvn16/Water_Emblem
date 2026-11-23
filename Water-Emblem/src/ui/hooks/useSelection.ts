import { useState, useMemo, useRef, useEffect } from 'react';
import type { ExtendedUnitState, ChapterData } from '../../core/data/chapterData';
import type { Position, MapData } from '../../core/grid/types';
import type { TurnManager, TurnState } from '../../core/turn/turnManager';
import { defaultTerrainRegistry } from '../../core/grid/terrain';
import { calculateMovementRange } from '../../core/grid/pathfinding';
import { computeDangerZone, computeInspectedEnemyThreatKeys } from '../../core/simulation/enemyTurnSimulation';
import { buildBoardView, type BoardView } from '../../core/grid/boardView';
import { cancelMove } from '../../core/turn/playerActions';
import { runMovementAnimation, type ActiveMovingUnit } from '../../renderer/movementAnimation';
import { soundManager } from '../../audio/soundManager';
import type { UnitDisplay } from '../../renderer/Grid2D';
import type { DoorState } from '../../core/chapter/events';
import type { CombatForecast } from '../../core/combat/types';
import type { StaffForecast } from '../../core/combat/staff';
import { getUnitDisplayEntry, handleSelectionMoveOrSelect } from './selectionHelpers';

export interface UseSelectionParams {
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly currentChapter: ChapterData;
  readonly mapData: MapData;
  readonly doorStates: Record<string, DoorState>;
  readonly turnManager: TurnManager;
  readonly turnState: TurnState;
  readonly syncState: () => void;
  readonly adoptTurnUnitsInPlace: () => void;
  readonly isProcessingAI: boolean;
  readonly attackTargetKeys: ReadonlySet<string>;
  readonly staffTargetKeys: ReadonlySet<string>;
  readonly tradeTargetKeys: ReadonlySet<string>;
  readonly warpDestinationKeys: ReadonlySet<string>;
  readonly attackTargeting: boolean;
  readonly staffTargeting: boolean;
  readonly tradeTargeting: boolean;
  readonly warpTargeting: boolean;
  readonly weaponPickerOpen: boolean;
  readonly staffPickerOpen: boolean;
  readonly combatForecast: CombatForecast | null;
  readonly staffForecast: StaffForecast | null;
  readonly hasActiveModal: boolean;
  readonly onTargetingTileClick: (x: number, y: number, clickedExt?: ExtendedUnitState) => boolean;
  readonly resetTargeting: () => void;
}

export function useSelection({
  extendedUnits,
  setExtendedUnits,
  currentChapter,
  mapData,
  doorStates,
  turnManager,
  turnState,
  syncState,
  adoptTurnUnitsInPlace,
  isProcessingAI,
  attackTargetKeys,
  staffTargetKeys,
  tradeTargetKeys,
  warpDestinationKeys,
  attackTargeting,
  staffTargeting,
  tradeTargeting,
  warpTargeting,
  weaponPickerOpen,
  staffPickerOpen,
  combatForecast,
  staffForecast,
  hasActiveModal,
  onTargetingTileClick,
  resetTargeting,
}: UseSelectionParams) {
  const [pendingMovePos, setPendingMovePos] = useState<Position | null>(null);
  const [plannedPath, setPlannedPath] = useState<readonly Position[] | null>(null);
  const [moveCommitted, setMoveCommitted] = useState(false);
  const [moveOrigin, setMoveOrigin] = useState<Position | null>(null);
  const [activeMovingUnit, setActiveMovingUnit] = useState<ActiveMovingUnit | null>(null);
  const animCleanupRef = useRef<(() => void) | null>(null);

  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);
  const [pinnedUnitId, setPinnedUnitId] = useState<string | null>(null);
  const [hoveredUnitSummary, setHoveredUnitSummary] = useState<{ unitId: string; tile: Position } | null>(null);
  const isHoveringSummaryRef = useRef(false);
  const summaryGraceTimerRef = useRef<number | null>(null);
  const [inspectedTile, setInspectedTile] = useState<Position | null>(null);
  const [selectedEnemyPos, setSelectedEnemyPos] = useState<Position | null>(null);

  useEffect(() => {
    if (!turnState.selectedUnitId) {
      setMoveCommitted(false);
      setMoveOrigin(null);
    }
  }, [turnState.selectedUnitId]);

  const selectedUnit = turnManager.getSelectedUnit();
  const selectedExtUnit = extendedUnits.find((u) => u.unit.id === selectedUnit?.id);

  const reachableKeys = useMemo(() => {
    if (!turnState.reachableTiles) return new Set<string>();
    return new Set(Array.from(turnState.reachableTiles.keys()));
  }, [turnState.reachableTiles]);

  const openedDoorKeys = useMemo(() => new Set(
    (currentChapter.doors ?? [])
      .filter((door) => doorStates[door.id] === 'opened')
      .map((door) => `${door.position.x},${door.position.y}`),
  ), [currentChapter.doors, doorStates]);

  const threatContext = {
    map: mapData,
    terrains: defaultTerrainRegistry,
    units: extendedUnits.map((u) => u.unit),
    openedDoors: openedDoorKeys,
  };

  const combinedDangerZoneKeys = useMemo(
    () => computeDangerZone(extendedUnits, mapData, defaultTerrainRegistry, openedDoorKeys),
    [extendedUnits, openedDoorKeys, mapData],
  );

  const inspectedTargetTile = selectedEnemyPos ?? inspectedTile;
  const inspectedEnemy = inspectedTargetTile
    ? extendedUnits.find((u) => !u.unit.isDead && u.unit.faction === 'enemy' && u.unit.position.x === inspectedTargetTile.x && u.unit.position.y === inspectedTargetTile.y)
    : undefined;

  const inspectedThreatKeys = useMemo(
    () => (inspectedEnemy ? computeInspectedEnemyThreatKeys(inspectedEnemy, extendedUnits, mapData, defaultTerrainRegistry, openedDoorKeys) : null),
    [inspectedEnemy, extendedUnits, openedDoorKeys, mapData],
  );

  const enemyReachableKeys = useMemo(() => {
    if (!inspectedEnemy || selectedExtUnit) return null;
    const range = calculateMovementRange(inspectedEnemy.unit, threatContext);
    return new Set(Array.from(range.keys()));
  }, [inspectedEnemy, selectedExtUnit, threatContext]);

  const displayReachableKeys = (selectedExtUnit ? reachableKeys : enemyReachableKeys) ?? new Set<string>();
  const displayDangerZoneKeys = inspectedThreatKeys ?? combinedDangerZoneKeys;

  const targetOverlayKeys = warpTargeting
    ? warpDestinationKeys
    : staffTargeting
      ? staffTargetKeys
      : tradeTargeting
        ? tradeTargetKeys
        : attackTargetKeys;

  const boardView: BoardView = buildBoardView({
    map: mapData,
    units: extendedUnits.map(({ unit }) => unit),
    reachableKeys: displayReachableKeys,
    dangerZoneKeys: displayDangerZoneKeys,
    attackTargetKeys: targetOverlayKeys,
    selected: selectedUnit?.position ?? null,
    inspected: inspectedEnemy?.unit.position ?? null,
  });

  const getUnitDisplay = (unitId: string): UnitDisplay | undefined => getUnitDisplayEntry(extendedUnits, unitId);

  const endUnitTurn = () => {
    turnManager.waitSelectedUnit();
  };

  const executeWithMove = (actionFn: () => void) => {
    if (!selectedExtUnit || selectedExtUnit.unit.isDead || selectedExtUnit.unit.hasActed) return;
    if (moveCommitted) {
      actionFn();
      setMoveCommitted(false);
      setMoveOrigin(null);
      setPendingMovePos(null);
      setPlannedPath(null);
      return;
    }
    if (!selectedExtUnit || !pendingMovePos) { actionFn(); return; }
    const dest = { ...pendingMovePos };
    const path = plannedPath && plannedPath.length > 1 ? [...plannedPath] : null;
    const moveType = selectedExtUnit.unit.moveType;
    const unitId = selectedExtUnit.unit.id;
    setPendingMovePos(null);
    setPlannedPath(null);
    const origin = path?.[0];
    if (!path || !origin || (origin.x === dest.x && origin.y === dest.y)) {
      turnManager.moveSelectedUnit(dest);
      adoptTurnUnitsInPlace();
      setExtendedUnits([...extendedUnits]);
      actionFn();
      return;
    }
    animCleanupRef.current = runMovementAnimation(path, moveType, soundManager, (pos) => setActiveMovingUnit({ unitId, pos }), () => {
      animCleanupRef.current = null;
      turnManager.moveSelectedUnit(dest);
      adoptTurnUnitsInPlace();
      setExtendedUnits([...extendedUnits]);
      setActiveMovingUnit(null);
      actionFn();
    });
  };

  const handleCancelMove = () => {
    soundManager.playSfx('cancel');
    resetTargeting();
    if (moveCommitted && moveOrigin && selectedExtUnit) {
      const origin = moveOrigin;
      const unitId = selectedExtUnit.unit.id;
      const moveType = selectedExtUnit.unit.moveType;
      const backPath = plannedPath && plannedPath.length > 1 ? [...plannedPath].reverse() : null;
      const arriveBack = () => {
        const res = cancelMove({ units: extendedUnits }, { unitId, origin });
        const nextUnits = res ? res.state.units : extendedUnits;
        turnManager.moveSelectedUnit(origin);
        setExtendedUnits([...nextUnits]);
        setActiveMovingUnit(null);
        setMoveCommitted(false);
        setMoveOrigin(null);
        setPendingMovePos(null);
        setPlannedPath(null);
        syncState();
      };
      if (backPath) {
        animCleanupRef.current = runMovementAnimation(backPath, moveType, soundManager, (pos) => setActiveMovingUnit({ unitId, pos }), () => {
          animCleanupRef.current = null;
          arriveBack();
        });
      } else {
        arriveBack();
      }
      return;
    }
    setPendingMovePos(null);
    setPlannedPath(null);
    setPinnedUnitId(null);
    setHoveredUnitSummary(null);
    turnManager.cancelSelect();
    syncState();
  };

  useEffect(() => {
    if (!pendingMovePos || !moveCommitted || combatForecast || staffForecast || attackTargeting || weaponPickerOpen || staffPickerOpen || staffTargeting || tradeTargeting || activeMovingUnit) return;
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      handleCancelMove();
    };
    window.addEventListener('contextmenu', onContextMenu);
    return () => window.removeEventListener('contextmenu', onContextMenu);
  }, [pendingMovePos, moveCommitted, combatForecast, staffForecast, attackTargeting, weaponPickerOpen, staffPickerOpen, staffTargeting, tradeTargeting, activeMovingUnit]);

  const handleTileClick = (x: number, y: number) => {
    if (animCleanupRef.current) {
      animCleanupRef.current();
      animCleanupRef.current = null;
    }
    if (turnState.activePhase !== 'player_phase' || isProcessingAI || hasActiveModal) return;

    const clickedExt = extendedUnits.find(
      (u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y,
    );

    if (onTargetingTileClick(x, y, clickedExt)) return;

    handleSelectionMoveOrSelect({
      x, y, clickedExt, selectedExtUnit, reachableKeys, activeMovingUnit, pendingMovePos, moveCommitted, moveOrigin,
      plannedPath, turnState, turnManager, extendedUnits, setExtendedUnits, mapData, openedDoorKeys, setPendingMovePos,
      setPlannedPath, setMoveOrigin, setMoveCommitted, setActiveMovingUnit, setPinnedUnitId, setHoveredUnitSummary,
      setSelectedEnemyPos, setHoveredTile, animCleanupRef, resetTargeting, syncState, adoptTurnUnitsInPlace,
    });
  };

  const handleTileHover = (x: number, y: number) => {
    setHoveredTile({ x, y });
    const unitAtTile = extendedUnits.find((u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y);
    if (unitAtTile) {
      if (summaryGraceTimerRef.current) {
        clearTimeout(summaryGraceTimerRef.current);
        summaryGraceTimerRef.current = null;
      }
      setHoveredUnitSummary({ unitId: unitAtTile.unit.id, tile: { x, y } });
    } else {
      if (!isHoveringSummaryRef.current && !summaryGraceTimerRef.current) {
        summaryGraceTimerRef.current = window.setTimeout(() => {
          summaryGraceTimerRef.current = null;
          if (!isHoveringSummaryRef.current) setHoveredUnitSummary(null);
        }, 600);
      }
    }
  };

  const hoveredTerrainId = hoveredTile ? mapData.grid[hoveredTile.y]?.[hoveredTile.x] : null;

  const activeSummaryUnit = useMemo(() => {
    const id = pinnedUnitId ?? hoveredUnitSummary?.unitId ?? (selectedExtUnit && !combatForecast ? selectedExtUnit.unit.id : null);
    if (!id) return null;
    return extendedUnits.find((u) => !u.unit.isDead && u.unit.id === id) ?? null;
  }, [pinnedUnitId, hoveredUnitSummary, selectedExtUnit, combatForecast, extendedUnits]);

  const activeSummaryTile = pinnedUnitId
    ? activeSummaryUnit?.unit.position ?? null
    : hoveredUnitSummary?.tile ?? activeSummaryUnit?.unit.position ?? null;

  const inspectedUnit = inspectedTile
    ? extendedUnits.find((u) => !u.unit.isDead && u.unit.position.x === inspectedTile.x && u.unit.position.y === inspectedTile.y)
    : undefined;

  const resetSelection = () => {
    if (animCleanupRef.current) {
      if ('cancel' in animCleanupRef.current && typeof (animCleanupRef.current as { cancel?: unknown }).cancel === 'function') {
        (animCleanupRef.current as { cancel: () => void }).cancel();
      } else {
        animCleanupRef.current();
      }
      animCleanupRef.current = null;
    }
    setActiveMovingUnit(null);
    setMoveCommitted(false);
    setMoveOrigin(null);
    setPendingMovePos(null);
    setPlannedPath(null);
    setPinnedUnitId(null);
    setHoveredUnitSummary(null);
  };

  return {
    pendingMovePos,
    setPendingMovePos,
    plannedPath,
    setPlannedPath,
    moveCommitted,
    setMoveCommitted,
    moveOrigin,
    setMoveOrigin,
    activeMovingUnit,
    setActiveMovingUnit,
    hoveredTile,
    setHoveredTile,
    pinnedUnitId,
    setPinnedUnitId,
    hoveredUnitSummary,
    setHoveredUnitSummary,
    isHoveringSummaryRef,
    summaryGraceTimerRef,
    inspectedTile,
    setInspectedTile,
    selectedEnemyPos,
    setSelectedEnemyPos,
    selectedUnit,
    selectedExtUnit,
    reachableKeys,
    openedDoorKeys,
    combinedDangerZoneKeys,
    inspectedEnemy,
    inspectedUnit,
    boardView,
    activeSummaryUnit,
    activeSummaryTile,
    hoveredTerrainId,
    getUnitDisplay,
    endUnitTurn,
    executeWithMove,
    handleCancelMove,
    handleTileClick,
    handleTileHover,
    resetSelection,
  };
}
