import type { ExtendedUnitState } from '../../core/data/chapterData';
import type { MapData, Position } from '../../core/grid/types';
import type { TurnManager, TurnState } from '../../core/turn/turnManager';
import { defaultTerrainRegistry } from '../../core/grid/terrain';
import { calculateMovementRange } from '../../core/grid/pathfinding';
import { soundManager } from '../../audio/soundManager';
import type { UnitDisplay } from '../../renderer/Grid2D';
import { runMovementAnimation, type ActiveMovingUnit } from '../../renderer/movementAnimation';

export function getUnitDisplayEntry(extendedUnits: readonly ExtendedUnitState[], unitId: string): UnitDisplay | undefined {
  const entry = extendedUnits.find(({ unit }) => unit.id === unitId);
  return entry && {
    name: entry.unit.name,
    hp: entry.stats.hp,
    maxHp: entry.stats.maxHp,
    faction: entry.unit.faction,
    hasActed: Boolean(entry.unit.hasActed),
    avatarUrl: entry.avatarUrl,
    isReinforcement: entry.unit.isReinforcement,
  };
}

export interface SelectionTileClickCtx {
  readonly x: number;
  readonly y: number;
  readonly clickedExt: ExtendedUnitState | undefined;
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly reachableKeys: ReadonlySet<string>;
  readonly activeMovingUnit: ActiveMovingUnit | null;
  readonly pendingMovePos: Position | null;
  readonly moveCommitted: boolean;
  readonly moveOrigin: Position | null;
  readonly plannedPath: readonly Position[] | null;
  readonly turnState: TurnState;
  readonly turnManager: TurnManager;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly mapData: MapData;
  readonly openedDoorKeys: ReadonlySet<string>;
  readonly setPendingMovePos: (pos: Position | null) => void;
  readonly setPlannedPath: (path: readonly Position[] | null) => void;
  readonly setMoveOrigin: (pos: Position | null) => void;
  readonly setMoveCommitted: (val: boolean) => void;
  readonly setActiveMovingUnit: (amu: ActiveMovingUnit | null) => void;
  readonly setPinnedUnitId: (id: string | null) => void;
  readonly setHoveredUnitSummary: (val: { unitId: string; tile: Position } | null) => void;
  readonly setSelectedEnemyPos: React.Dispatch<React.SetStateAction<Position | null>>;
  readonly setHoveredTile: (pos: Position | null) => void;
  readonly animCleanupRef: React.MutableRefObject<(() => void) | null>;
  readonly resetTargeting: () => void;
  readonly syncState: () => void;
  readonly adoptTurnUnitsInPlace: () => void;
}

export function handleSelectionMoveOrSelect(ctx: SelectionTileClickCtx): void {
  const { x, y, clickedExt, selectedExtUnit, reachableKeys, activeMovingUnit, pendingMovePos, moveCommitted, moveOrigin, plannedPath, turnState, turnManager, extendedUnits, setExtendedUnits, mapData, openedDoorKeys, setPendingMovePos, setPlannedPath, setMoveOrigin, setMoveCommitted, setActiveMovingUnit, setPinnedUnitId, setHoveredUnitSummary, setSelectedEnemyPos, setHoveredTile, animCleanupRef, resetTargeting, syncState, adoptTurnUnitsInPlace } = ctx;

  if (selectedExtUnit && reachableKeys.has(`${x},${y}`) && !activeMovingUnit
    && !(pendingMovePos && (selectedExtUnit.unit.hasTraded || selectedExtUnit.unit.hasStored))) {
    const moveData = turnState.reachableTiles?.get(`${x},${y}`);
    const path = moveData?.path ?? [selectedExtUnit.unit.position, { x, y }];
    const dest = { x, y };
    const unitId = selectedExtUnit.unit.id;
    const moveType = selectedExtUnit.unit.moveType;
    const origin = moveOrigin ?? { ...selectedExtUnit.unit.position };
    setPendingMovePos(dest);
    setPlannedPath(path);
    resetTargeting();
    soundManager.playSfx('cursor');

    const arriveAtDest = () => {
      turnManager.moveSelectedUnit(dest);
      setExtendedUnits([...extendedUnits]);
      setActiveMovingUnit(null);
      setMoveCommitted(true);
      syncState();
    };
    const walkToDest = () => {
      if (path.length <= 1 || (path[0]!.x === dest.x && path[0]!.y === dest.y)) {
        arriveAtDest();
        return;
      }
      animCleanupRef.current = runMovementAnimation(path, moveType, soundManager, (pos) => setActiveMovingUnit({ unitId, pos }), () => {
        animCleanupRef.current = null;
        arriveAtDest();
      });
    };
    if (moveCommitted && plannedPath && plannedPath.length > 1) {
      const backPath = [...plannedPath].reverse();
      animCleanupRef.current = runMovementAnimation(backPath, moveType, soundManager, (pos) => setActiveMovingUnit({ unitId, pos }), () => {
        animCleanupRef.current = null;
        turnManager.moveSelectedUnit(origin);
        adoptTurnUnitsInPlace();
        setExtendedUnits([...extendedUnits]);
        setActiveMovingUnit(null);
        walkToDest();
      });
    } else {
      setMoveOrigin(origin);
      walkToDest();
    }
    return;
  }

  if (clickedExt && clickedExt.unit.faction === 'player' && !clickedExt.unit.hasActed && !pendingMovePos && !activeMovingUnit) {
    soundManager.playSfx('select');
    setSelectedEnemyPos(null);
    const range = calculateMovementRange(clickedExt.unit, {
      map: mapData,
      terrains: defaultTerrainRegistry,
      units: extendedUnits.map((u) => u.unit),
      openedDoors: openedDoorKeys,
    });
    turnManager.selectUnit(clickedExt.unit.id, range);
    setPinnedUnitId(clickedExt.unit.id);
    setHoveredUnitSummary({ unitId: clickedExt.unit.id, tile: { x, y } });
    setPendingMovePos(null);
    setPlannedPath(null);
    resetTargeting();
    syncState();
    return;
  }

  if (!pendingMovePos && !activeMovingUnit) {
    turnManager.cancelSelect();
    setPlannedPath(null);
    resetTargeting();
    if (clickedExt) {
      if (clickedExt.unit.faction === 'enemy') {
        soundManager.playSfx('select');
        setSelectedEnemyPos((prev) => (prev && prev.x === x && prev.y === y ? null : { x, y }));
      } else {
        soundManager.playSfx('cancel');
        setSelectedEnemyPos(null);
      }
      setPinnedUnitId(clickedExt.unit.id);
      setHoveredUnitSummary({ unitId: clickedExt.unit.id, tile: { x, y } });
    } else {
      soundManager.playSfx('cancel');
      setSelectedEnemyPos(null);
      setPinnedUnitId(null);
      setHoveredUnitSummary(null);
    }
    setHoveredTile({ x, y });
    syncState();
  }
}
