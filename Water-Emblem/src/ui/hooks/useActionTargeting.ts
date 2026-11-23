import { useState, useMemo, useEffect } from 'react';
import type { ExtendedUnitState, ChapterData } from '../../core/data/chapterData';
import type { Position, MapData } from '../../core/grid/types';
import type { CombatForecast, ItemDefinition } from '../../core/combat/types';
import type { ChapterState, DialogueTable, GameEvent, VillageState } from '../../core/chapter/events';
import { bossStartEvent } from '../../core/chapter/events';
import { eventLogLines } from '../eventLog';
import { canAttackAtDistance, equipWeapon, findWeaponForDistance } from '../../core/combat/equip';
import { getManhattanDistance } from '../../core/combat/calculator';
import { defaultRNG } from '../../core/combat/rng';
import { attack, useStaff } from '../../core/turn/playerActions';
import { calculateStaffForecast, getAllStaffTargets, getStaffTargets, isWarpStaff, type StaffForecast } from '../../core/combat/staff';
import { buildCombatPopup, type CombatPopupData } from '../combatPopupData';
import { soundManager } from '../../audio/soundManager';
import itemsJson from '../../../data/items.json' with { type: 'json' };
import type { TurnManager } from '../../core/turn/turnManager';
import type { LevelUpEvent } from '../../core/combat/combatResolution';
import { ITEM_BY_ID } from './itemCatalog';
import {
  usableWeaponsForTarget,
  computeCombatForecast,
  computeUsableStavesForSelectedTarget,
  computeWarpDestinationKeys,
  handleTargetingTileClick,
} from './actionTargetingHelpers';
import { useTradeAction } from './useTradeAction';
import type { ChapterDialogueData } from './useChapterState';

export interface UseActionTargetingParams {
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly pendingMovePos: Position | null;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly currentChapter: ChapterData;
  readonly currentDialogues: ChapterDialogueData;
  readonly mapData: MapData;
  readonly setVillageStates: React.Dispatch<React.SetStateAction<Record<string, VillageState>>>;
  readonly gold: number;
  readonly setGold: React.Dispatch<React.SetStateAction<number>>;
  readonly chapterState: () => ChapterState;
  readonly turnManager: TurnManager;
  readonly endUnitTurn: () => void;
  readonly syncState: () => void;
  readonly executeWithMove: (actionFn: () => void) => void;
  readonly checkChapterOutcome: (units: readonly ExtendedUnitState[]) => void;
  readonly queueOverflows: (events: readonly GameEvent[]) => void;
  readonly setPendingLevelUp: (lu: LevelUpEvent) => void;
  readonly setPopupQueue: React.Dispatch<React.SetStateAction<CombatPopupData[]>>;
  readonly popupIdRef: React.MutableRefObject<number>;
  readonly setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  readonly showNotice: (msg: string) => void;
  readonly setPendingMovePos: React.Dispatch<React.SetStateAction<Position | null>>;
  readonly setPlannedPath: React.Dispatch<React.SetStateAction<readonly Position[] | null>>;
  readonly setMoveOrigin: React.Dispatch<React.SetStateAction<Position | null>>;
  readonly setMoveCommitted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useActionTargeting({
  selectedExtUnit,
  pendingMovePos,
  extendedUnits,
  setExtendedUnits,
  currentChapter,
  currentDialogues,
  mapData,
  setVillageStates,
  gold,
  setGold,
  chapterState,
  turnManager,
  endUnitTurn,
  syncState,
  executeWithMove,
  checkChapterOutcome,
  queueOverflows,
  setPendingLevelUp,
  setPopupQueue,
  popupIdRef,
  setCombatLog,
  showNotice,
  setPendingMovePos,
  setPlannedPath,
  setMoveOrigin,
  setMoveCommitted,
}: UseActionTargetingParams) {
  const trade = useTradeAction({
    selectedExtUnit, pendingMovePos, extendedUnits, setExtendedUnits, turnManager, syncState, showNotice,
  });

  const [selectedTarget, setSelectedTarget] = useState<ExtendedUnitState | null>(null);
  const [combatForecast, setCombatForecast] = useState<CombatForecast | null>(null);
  const [attackTargeting, setAttackTargeting] = useState(false);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);

  const [staffTargeting, setStaffTargeting] = useState<{ staffId?: string } | null>(null);
  const [selectedStaffTarget, setSelectedStaffTarget] = useState<ExtendedUnitState | null>(null);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffForecast, setStaffForecast] = useState<StaffForecast | null>(null);
  const [warpTargeting, setWarpTargeting] = useState<{ staffId: string; targetId: string } | null>(null);

  useEffect(() => {
    if (!attackTargeting && !weaponPickerOpen && !staffTargeting && !warpTargeting && !trade.tradeTargeting && !combatForecast && !staffForecast && !staffPickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAttackTargeting(false); setWeaponPickerOpen(false); setStaffTargeting(null); setWarpTargeting(null);
        trade.setTradeTargeting(false); setSelectedTarget(null); setSelectedStaffTarget(null); setStaffPickerOpen(false);
        setCombatForecast(null); setStaffForecast(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [attackTargeting, weaponPickerOpen, staffTargeting, warpTargeting, trade.tradeTargeting, combatForecast, staffForecast, staffPickerOpen]);

  const attackableTargets = useMemo(() => {
    if (!selectedExtUnit) return [];
    const pos = pendingMovePos ?? selectedExtUnit.unit.position;
    const enemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);
    return enemies.filter((enemy) => {
      const dist = getManhattanDistance(pos, enemy.unit.position);
      return canAttackAtDistance(selectedExtUnit, ITEM_BY_ID, dist);
    });
  }, [selectedExtUnit, pendingMovePos, extendedUnits]);

  const attackTargetKeys = useMemo(
    () => new Set(attackableTargets.map((t) => `${t.unit.position.x},${t.unit.position.y}`)),
    [attackableTargets],
  );

  const staffTargets = useMemo(() => {
    if (!staffTargeting || !selectedExtUnit || !pendingMovePos) return [];
    if (staffTargeting.staffId) {
      const staff = ITEM_BY_ID.get(staffTargeting.staffId);
      if (!staff) return [];
      return getStaffTargets(extendedUnits, selectedExtUnit, staff, pendingMovePos);
    }
    return getAllStaffTargets(extendedUnits, selectedExtUnit, ITEM_BY_ID, pendingMovePos);
  }, [staffTargeting, selectedExtUnit, pendingMovePos, extendedUnits]);

  const staffTargetKeys = useMemo(
    () => new Set(staffTargets.map((t) => `${t.unit.position.x},${t.unit.position.y}`)),
    [staffTargets],
  );

  const usableStavesForSelectedTarget = useMemo(() => {
    const pos = pendingMovePos ?? selectedExtUnit?.unit.position ?? { x: 0, y: 0 };
    return computeUsableStavesForSelectedTarget(selectedExtUnit, selectedStaffTarget, extendedUnits, ITEM_BY_ID, pos);
  }, [selectedExtUnit, selectedStaffTarget, pendingMovePos, extendedUnits]);

  const warpDestinationKeys = useMemo(
    () => computeWarpDestinationKeys(warpTargeting, extendedUnits, mapData),
    [warpTargeting, extendedUnits, mapData],
  );

  const openAttackForecast = (target: ExtendedUnitState, weaponDef?: ItemDefinition, fromPos?: Position) => {
    if (!selectedExtUnit) return;
    const pos = fromPos ?? pendingMovePos ?? selectedExtUnit.unit.position;
    soundManager.playSfx('cursor');
    setWeaponPickerOpen(false);
    setSelectedTarget(target);
    const dist = getManhattanDistance(pos, target.unit.position);
    const attackWeapon = weaponDef ?? findWeaponForDistance(selectedExtUnit, ITEM_BY_ID, dist);
    if (attackWeapon && attackWeapon.id !== selectedExtUnit.weapon?.id) {
      setExtendedUnits((prev) => equipWeapon(prev, selectedExtUnit.unit.id, attackWeapon.id, ITEM_BY_ID));
    }
    setCombatForecast(computeCombatForecast(selectedExtUnit, target, attackWeapon, mapData, extendedUnits, pos));
  };

  const selectAttackTarget = (target: ExtendedUnitState, fromPos?: Position) => {
    const pos = fromPos ?? pendingMovePos ?? selectedExtUnit?.unit.position;
    const weapons = usableWeaponsForTarget(selectedExtUnit, target, ITEM_BY_ID, pos);
    if (weapons.length > 1) {
      soundManager.playSfx('cursor');
      setSelectedTarget(target);
      setWeaponPickerOpen(true);
      return;
    }
    openAttackForecast(target, weapons[0]?.definition, pos);
  };

  const onTargetingTileClick = (x: number, y: number, clickedExt?: ExtendedUnitState): boolean => {
    return handleTargetingTileClick(x, y, clickedExt, {
      tradeTargeting: trade.tradeTargeting,
      setTradeTargeting: trade.setTradeTargeting,
      tradePartners: trade.tradePartners,
      setTradeState: trade.setTradeState,
      tradeChangedRef: trade.tradeChangedRef,
      warpTargeting,
      setWarpTargeting,
      warpDestinationKeys,
      staffTargeting,
      setStaffTargeting,
      staffTargets,
      setSelectedStaffTarget,
      setStaffPickerOpen,
      setStaffForecast,
      attackTargeting,
      setAttackTargeting,
      attackableTargets,
      selectAttackTarget,
      selectedExtUnit,
      pendingMovePos,
      setPendingMovePos,
      setPlannedPath,
      setMoveOrigin,
      setMoveCommitted,
      turnManager,
      executeWithMove,
      extendedUnits,
      setExtendedUnits,
      setCombatLog,
      syncState,
      endUnitTurn,
      mapData,
      itemById: ITEM_BY_ID,
    });
  };

  const handleConfirmAttack = () => {
    if (!combatForecast || !selectedExtUnit || !selectedTarget) return;
    const forecast = combatForecast;
    const attacker = selectedExtUnit;
    const defender = selectedTarget;
    setCombatForecast(null);
    setSelectedTarget(null);

    executeWithMove(() => {
      const hpBefore = { attacker: attacker.stats.hp, defender: defender.stats.hp };
      const actionResult = attack(
        { ...chapterState(), mapData, chapter: currentChapter, dialogues: currentDialogues as DialogueTable, itemById: ITEM_BY_ID, items: itemsJson.items as ItemDefinition[] },
        { attackerId: attacker.unit.id, defenderId: defender.unit.id, forecast },
        defaultRNG,
      );
      if (!actionResult) return;
      if (actionResult.rawCombatResult) {
        setPopupQueue([buildCombatPopup(++popupIdRef.current, attacker, defender, hpBefore, actionResult.rawCombatResult)]);
      }
      actionResult.soundCues?.forEach((cue) => cue.type === 'weapon' ? soundManager.playWeaponHit(cue.weaponType ?? 'sword') : soundManager.playSfx(cue.type));
      const logs: string[] = [];
      const startEvent = bossStartEvent(currentDialogues, defender.unit.id, defender.unit.name);
      if (startEvent) logs.push(...eventLogLines([startEvent]));
      if (actionResult.logs) logs.push(...actionResult.logs);
      const defeatEvents = actionResult.events.filter((e) => e.type === 'item_gained' || e.type === 'gold_gained' || e.type === 'unit_recruited' || (e.type === 'dialogue' && e.kind === 'boss_death'));
      if (defeatEvents.length > 0) {
        logs.push(...eventLogLines(defeatEvents));
        queueOverflows(defeatEvents);
      }
      setGold(actionResult.state.gold ?? gold);
      if (actionResult.state.villageStates) setVillageStates(actionResult.state.villageStates as Record<string, VillageState>);
      const updatedUnits = actionResult.state.units;
      setCombatLog((prev) => [...logs, ...prev].slice(0, 20));
      turnManager.replaceUnits(updatedUnits.map((item) => item.unit));
      setExtendedUnits(updatedUnits);
      if (actionResult.levelUps?.length) {
        const playerLevelUp = actionResult.levelUps.find((lu) => lu.unit.unit.faction === 'player');
        if (playerLevelUp) setPendingLevelUp(playerLevelUp);
      }
      checkChapterOutcome(updatedUnits);
      endUnitTurn();
      syncState();
    });
  };

  const handleAttack = () => {
    if (attackableTargets.length > 0) {
      soundManager.playSfx('cursor');
      setAttackTargeting(true);
    }
  };

  const handlePickWeapon = (itemId: string) => {
    if (!selectedExtUnit) return;
    setExtendedUnits((prev) => equipWeapon(prev, selectedExtUnit.unit.id, itemId, ITEM_BY_ID));
    setWeaponPickerOpen(false);
    if (selectedTarget) openAttackForecast(selectedTarget, ITEM_BY_ID.get(itemId));
  };

  const handleEquip = (itemId: string) => {
    if (!selectedExtUnit) return;
    setExtendedUnits((prev) => equipWeapon(prev, selectedExtUnit.unit.id, itemId, ITEM_BY_ID));
  };

  const handleStaff = (staffId?: string) => {
    soundManager.playSfx('cursor');
    setStaffTargeting({ staffId });
  };

  const handlePickStaff = (staffId: string) => {
    if (!selectedExtUnit || !selectedStaffTarget) return;
    const staff = ITEM_BY_ID.get(staffId);
    if (!staff) return;
    setStaffPickerOpen(false);
    if (isWarpStaff(staff)) {
      setWarpTargeting({ staffId, targetId: selectedStaffTarget.unit.id });
      return;
    }
    const forecast = calculateStaffForecast(selectedExtUnit, selectedStaffTarget, staff);
    soundManager.playSfx('cursor');
    setStaffForecast(forecast);
  };

  const handleConfirmStaff = () => {
    if (!staffForecast || !selectedExtUnit) return;
    const { target, staff } = staffForecast;
    const staffId = staff.id;
    const targetId = target.unit.id;
    setStaffForecast(null);
    setSelectedStaffTarget(null);

    executeWithMove(() => {
      if (!selectedExtUnit) return;
      const result = useStaff({ units: extendedUnits, itemById: ITEM_BY_ID }, { userId: selectedExtUnit.unit.id, targetId, staffId }, defaultRNG);
      if (!result) return;
      soundManager.playSfx('heal');
      turnManager.replaceUnits(result.state.units.map(({ unit }) => unit));
      endUnitTurn();
      setExtendedUnits(result.state.units);
      if (result.logs) setCombatLog((prev) => [...result.logs!, ...prev].slice(0, 20));
      syncState();
    });
  };

  const handleCancelStaff = () => { setStaffForecast(null); setStaffPickerOpen(true); };
  const handleCancelStaffPicker = () => { setStaffPickerOpen(false); setSelectedStaffTarget(null); };

  const resetTargeting = () => {
    setAttackTargeting(false);
    trade.setTradeTargeting(false);
    setStaffTargeting(null);
    setWarpTargeting(null);
    setSelectedTarget(null);
    setSelectedStaffTarget(null);
    setCombatForecast(null);
    setStaffForecast(null);
    setWeaponPickerOpen(false);
    setStaffPickerOpen(false);
  };

  return {
    selectedTarget,
    setSelectedTarget,
    combatForecast,
    setCombatForecast,
    attackTargeting,
    setAttackTargeting,
    tradeTargeting: trade.tradeTargeting,
    setTradeTargeting: trade.setTradeTargeting,
    weaponPickerOpen,
    setWeaponPickerOpen,
    tradeState: trade.tradeState,
    setTradeState: trade.setTradeState,
    tradeChangedRef: trade.tradeChangedRef,
    staffTargeting,
    setStaffTargeting,
    selectedStaffTarget,
    setSelectedStaffTarget,
    staffPickerOpen,
    setStaffPickerOpen,
    staffForecast,
    setStaffForecast,
    warpTargeting,
    setWarpTargeting,
    attackableTargets,
    attackTargetKeys,
    tradePartners: trade.tradePartners,
    tradeTargetKeys: trade.tradeTargetKeys,
    staffTargets,
    staffTargetKeys,
    usableStavesForSelectedTarget,
    warpDestinationKeys,
    onTargetingTileClick,
    handleConfirmAttack,
    handleAttack,
    handlePickWeapon,
    handleEquip,
    handleStaff,
    handlePickStaff,
    handleConfirmStaff,
    handleCancelStaff,
    handleCancelStaffPicker,
    handleTrade: trade.handleTrade,
    tradeProps: trade.tradeProps,
    resetTargeting,
  };
}
