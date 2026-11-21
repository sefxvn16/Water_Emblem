import React, { useState, useMemo, useEffect, useRef } from 'react';
import talysMapRaw from '../data/maps/chapter_01_talys.json' with { type: 'json' };
import galderMapRaw from '../data/maps/chapter_02_galder.json' with { type: 'json' };
import devilMountainMapRaw from '../data/maps/chapter_03_devil_mountain.json' with { type: 'json' };
import testMapRaw from '../data/maps/test_map_01.json' with { type: 'json' };
import ch01Dialogues from '../data/dialogues/chapter_01_dialogues.json' with { type: 'json' };
import ch02Dialogues from '../data/dialogues/chapter_02_dialogues.json' with { type: 'json' };
import ch03Dialogues from '../data/dialogues/chapter_03_dialogues.json' with { type: 'json' };
import itemsJson from '../data/items.json' with { type: 'json' };

const ITEM_BY_ID = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));
import { defaultTerrainRegistry, getElevation, healUnitsOnTerrain } from './core/grid/terrain';
import { calculateMovementRange } from './core/grid/pathfinding';
import { MapData, Position } from './core/grid/types';
import { TurnManager } from './core/turn/turnManager';
import { CombatForecast, type ItemDefinition } from './core/combat/types';
import { calculateCombatForecast, executeCombat, getManhattanDistance } from './core/combat/calculator';
import {
  canAttackAtDistance,
  equipWeapon,
  findWeaponForDistance,
  getAttackWeapons,
  getUsableWeapons,
} from './core/combat/equip';
import { defaultRNG } from './core/combat/rng';
import { evaluateAITurn, type AIDecision } from './core/ai/decision';
import { ThreeScene } from './renderer/ThreeScene';
import { Grid2D, type UnitDisplay } from './renderer/Grid2D';
import { isFastAnimation, runMovementAnimation, type ActiveMovingUnit } from './renderer/movementAnimation';
import { buildBoardView } from './core/grid/boardView';
import { resolveCombatConsequences } from './core/combat/combatResolution';
import { computeDangerZone, computeInspectedEnemyThreatKeys } from './core/simulation/enemyTurnSimulation';
import {
  bossStartEvent,
  canOpenChest,
  canOpenDoor,
  openChest,
  openDoor,
  pillageVillage,
  recruit,
  seize,
  visitVillage,
  type ChapterState,
  type ChestState,
  type DialogueLine,
  type DoorState,
  type GameEvent,
  type VillageState,
} from './core/chapter/events';
import { eventLogLines, villageRewardText } from './ui/eventLog';
import { evaluateChapterOutcome } from './core/chapter/types';
import { carryUnitsToChapter, placeDeployedUnits } from './core/chapter/transition';
import { saveGameState, loadGameState, buildNewGameSnapshot, type SaveGameData } from './storage/saveLoad';
import { chapters, chapter01Data, ExtendedUnitState } from './core/data/chapterData';
import { changeMountedState, getAttackRange, getClassDefinition, promoteWithoutItem, reclassUnit, skillIdsOf, useVulnerary } from './core/class/classRules';
import { soundManager } from './audio/soundManager';
import { TitleScreen } from './ui/TitleScreen';
import { BookSelectModal } from './ui/BookSelectModal';
import { SaveSlotsModal } from './ui/SaveSlotsModal';
import { WorldMapModal } from './ui/WorldMapModal';
import { BattleSettingsMenu, HUD_EDGE, HUD_SIZE } from './ui/BattleSettingsMenu';

// Scroll padding so the last tiles can scroll out from under the bottom-right HUD cluster.
const HUD_CLEAR = HUD_EDGE + HUD_SIZE + 8;
import { CombatForecastWindow } from './ui/CombatForecastWindow';
import { ActionMenuWindow } from './ui/ActionMenuWindow';
import { WeaponPickerWindow } from './ui/WeaponPickerWindow';
import { OverflowWindow } from './ui/OverflowWindow';
import { RewardPopup, type RewardPopupData } from './ui/RewardPopup';
import { getItemIcon } from './ui/itemIcon';
import { resolveOverflow, slotKind, hasRoomFor } from './core/data/inventory';
import { TradeWindow, type TradeSide } from './ui/TradeWindow';
import { getTradePartners, tradeMove, tradeSwap } from './core/data/trade';
import { ConvoyWindow } from './ui/ConvoyWindow';
import { CONVOY_SLOTS, depositToConvoy, sendToConvoy, withdrawFromConvoy } from './core/data/convoy';
import { ShopWindow } from './ui/ShopWindow';
import { ArenaWindow } from './ui/ArenaWindow';
import { ARENA_TIERS, canEnterArena, generateArenaOpponent, runArenaFight, type ArenaFightOutcome, type ArenaTier } from './core/combat/arena';
import { announcedReinforcements, dueReinforcements, spawnReinforcements } from './core/chapter/reinforcements';
import { applyDifficulty, type Difficulty } from './core/chapter/difficulty';
import { getSkillModifiers } from './core/combat/skills';
import { canTransform, imitateUnit, tickSpecialStates, transformUnit } from './core/combat/transform';
import { buyItem, getShopStock, sellItem, sellValue } from './core/data/shop';
import { applyStaffUse, applyWarpUse, getStaffTargets, getUsableStaves, getWarpDestinations, isHealStaff, isWarpStaff } from './core/combat/staff';
import type { InventoryEntry } from './core/data/chapterData';
import { UnitInspectorWindow } from './ui/UnitInspectorWindow';
import { DialogueBox } from './ui/DialogueBox';
import { BattlePreparationModal } from './ui/BattlePreparationModal';
import { UnitHoverWindow } from './ui/UnitHoverWindow';
import { TerrainInfoWindow } from './ui/TerrainInfoWindow';
import { CombatResultPopup } from './ui/CombatResultPopup';
import { buildCombatPopup, type CombatPopupData } from './ui/combatPopupData';

const chapterMaps: Record<string, MapData> = {
  chapter_01: talysMapRaw as MapData,
  chapter_02: galderMapRaw as MapData,
  chapter_03: devilMountainMapRaw as MapData,
  test_chapter_01: testMapRaw as MapData,
};

interface ChapterDialogueData {
  chapterId: string;
  opening: DialogueLine[];
  villages?: Record<string, DialogueLine[]>;
  ending: DialogueLine[];
}

const chapterDialogues: Record<string, ChapterDialogueData> = {
  chapter_01: ch01Dialogues as ChapterDialogueData,
  chapter_02: ch02Dialogues as ChapterDialogueData,
  chapter_03: ch03Dialogues as ChapterDialogueData,
};

export const App: React.FC = () => {
  const [currentChapterId, setCurrentChapterId] = useState<string>('chapter_01');
  const currentChapter = chapters[currentChapterId] ?? chapter01Data;
  const mapData = chapterMaps[currentChapterId] ?? (talysMapRaw as MapData);
  const currentDialogues = chapterDialogues[currentChapterId] ?? (ch01Dialogues as ChapterDialogueData);
  const chapterObjective = currentChapter.objective;
  const lordName = currentChapter.units.find(({ unit }) => unit.id === currentChapter.lordUnitId)?.unit.name ?? 'The lord';

  const [extendedUnits, setExtendedUnits] = useState<ExtendedUnitState[]>(() => structuredClone(currentChapter.units));
  const [reserveUnits, setReserveUnits] = useState<ExtendedUnitState[]>([]);
  const [turnManager] = useState<TurnManager>(() => new TurnManager(extendedUnits.map((u) => u.unit)));
  const [turnState, setTurnState] = useState(turnManager.getState());

  // Giao tranh & Hành động
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('2d');
  const [showStoryIntro, setShowStoryIntro] = useState<boolean>(true);
  const [showPreparation, setShowPreparation] = useState<boolean>(false);
  const [chapterOutcome, setChapterOutcome] = useState<'ongoing' | 'victory' | 'defeat'>('ongoing');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const showNotice = (msg: string, duration = 3000) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setStatusNotice(msg);
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusNotice(null);
      noticeTimerRef.current = null;
    }, duration);
  };
  const [pendingMovePos, setPendingMovePos] = useState<Position | null>(null);
  const [plannedPath, setPlannedPath] = useState<readonly Position[] | null>(null);
  // PLAN item 98: clicking a destination moves the unit there at once; the
  // action bar appears only after arrival. moveOrigin is where Cancel Move
  // sends the unit back to.
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
  const [selectedTarget, setSelectedTarget] = useState<ExtendedUnitState | null>(null);
  const [combatForecast, setCombatForecast] = useState<CombatForecast | null>(null);
  // Attack target-lock (PLAN item 80): after pressing Attack with several
  // targets in range, only target tiles respond until one is picked.
  const [attackTargeting, setAttackTargeting] = useState(false);
  const [tradeTargeting, setTradeTargeting] = useState(false);
  const [weaponPickerOpen, setWeaponPickerOpen] = useState(false);
  const [pendingOverflows, setPendingOverflows] = useState<
    { unitId: string; itemId: string; itemName: string }[]
  >([]);
  const [rewardPopups, setRewardPopups] = useState<RewardPopupData[]>([]);
  const [tradeState, setTradeState] = useState<{ partnerId: string | null } | null>(null);
  // PLAN item 160: a trade session only counts as an action when at
  // least one item actually changed hands.
  const tradeChangedRef = useRef(false);
  const storageChangedRef = useRef(false);
  const shopChangedRef = useRef(false);
  const [selectedEnemyPos, setSelectedEnemyPos] = useState<Position | null>(null);
  const [convoy, setConvoy] = useState<InventoryEntry[]>([]);
  const [storageOpen, setStorageOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [arenaTier, setArenaTier] = useState<ArenaTier | null>(null);
  const [arenaOpponent, setArenaOpponent] = useState<ExtendedUnitState | null>(null);
  const [arenaOutcome, setArenaOutcome] = useState<ArenaFightOutcome | null>(null);

  // PLAN item 98: a committed move belongs to the current selection only.
  useEffect(() => {
    if (!turnState.selectedUnitId) {
      setMoveCommitted(false);
      setMoveOrigin(null);
    }
  }, [turnState.selectedUnitId]);
  const [prepConvoyUnitId, setPrepConvoyUnitId] = useState<string | null>(null);
  const [prepTrade, setPrepTrade] = useState<{ unitId: string; partnerId: string | null } | null>(null);
  const [staffTargeting, setStaffTargeting] = useState<{ staffId: string } | null>(null);
  // PLAN item 156: Warp picks the ally first, then the destination tile.
  const [warpTargeting, setWarpTargeting] = useState<{ staffId: string; targetId: string } | null>(null);

  // PLAN item 159: Canto offer removed (owner playtest 2026-11-20) — after
  // an action the unit's turn ends immediately, FE3-style.
  // PLAN item 115: playthrough difficulty (enemy stat bonuses).
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  // PLAN item 138: Auto End Turn toggle, persisted locally; default off
  // (the player presses End Turn manually). PLAN item 162: the
  // Normal/Fast/Off animation-speed buttons were removed from Settings
  // (self-added, never requested); animation runs at the fixed default.
  const [autoEndTurn, setAutoEndTurnState] = useState<boolean>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('water-emblem-auto-end-turn') : null;
    return saved === 'on';
  });
  useEffect(() => {
    turnManager.setAutoEndTurn(autoEndTurn);
    try { localStorage.setItem('water-emblem-auto-end-turn', autoEndTurn ? 'on' : 'off'); } catch { /* storage unavailable */ }
  }, [autoEndTurn]);
  // Esc leaves the Attack target-lock / weapon picker / staff lock and
  // returns to the action menu.
  useEffect(() => {
    if (!attackTargeting && !weaponPickerOpen && !staffTargeting && !warpTargeting && !tradeTargeting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAttackTargeting(false); setWeaponPickerOpen(false); setStaffTargeting(null); setWarpTargeting(null); setTradeTargeting(false); setSelectedTarget(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [attackTargeting, weaponPickerOpen, staffTargeting, warpTargeting, tradeTargeting]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [popupQueue, setPopupQueue] = useState<CombatPopupData[]>([]);
  const popupQueueRef = useRef<CombatPopupData[]>([]);
  useEffect(() => { popupQueueRef.current = popupQueue; }, [popupQueue]);
  const popupIdRef = useRef(0);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
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

  // Màn hình tổng thể & Bản lưu
  const [activeScreen, setActiveScreen] = useState<'none' | 'title' | 'book_select' | 'save_slots' | 'world_map'>('title');
  const [saveSlotsMode, setSaveSlotsMode] = useState<'load' | 'save'>('load');

  const syncState = () => {
    const state = turnManager.getState();
    setTurnState({ ...state });
    // PLAN item 133: TurnManager never mutates unit objects (clone-on-write);
    // adopt its current unit objects so extendedUnits shows moved/acted state.
    setExtendedUnits((prev) => prev.map((entry) => {
      const unit = state.units.find((u) => u.id === entry.unit.id);
      return unit && unit !== entry.unit ? { ...entry, unit } : entry;
    }));
  };

  // PLAN item 133: same adoption for the entries held by this render's
  // closures, for code that must read the moved position before the next
  // render (executeWithMove's actionFn, the cancel-move walk-back).
  const adoptTurnUnitsInPlace = () => {
    const turnUnits = turnManager.getState().units;
    for (const entry of extendedUnits) {
      const unit = turnUnits.find((u) => u.id === entry.unit.id);
      if (unit && unit !== entry.unit) entry.unit = unit;
    }
  };

  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

  // PLAN item 128: master volume slider (0 = muted).
  const [volume, setVolume] = useState(soundManager.isMuted ? 0 : soundManager.sfxVolume);
  const handleVolume = (next: number) => {
    setVolume(next);
    soundManager.sfxVolume = next;
    soundManager.bgmVolume = next * 0.6;
    soundManager.isMuted = next <= 0;
    setIsMuted(next <= 0);
  };

  useEffect(() => {
    if (activeScreen === 'title' || activeScreen === 'world_map' || activeScreen === 'book_select') {
      soundManager.playBgm('preparation');
      return;
    }
    if (showStoryIntro || showPreparation) {
      soundManager.playBgm('preparation');
      return;
    }
    if (chapterOutcome === 'victory') {
      soundManager.playBgm('victory', false);
      return;
    }
    if (chapterOutcome === 'defeat') {
      soundManager.playBgm('gameover', false);
      return;
    }
    if (turnState.activePhase === 'player_phase') {
      soundManager.playBgm('player_phase');
    } else if (turnState.activePhase === 'enemy_phase') {
      soundManager.playBgm('enemy_phase');
    }
  }, [activeScreen, showStoryIntro, showPreparation, chapterOutcome, turnState.activePhase]);

  useEffect(() => {
    (window as any).__WATER_EMBLEM_STATE__ = {
      extendedUnits,
      turnState,
      currentChapterId,
    };
  }, [extendedUnits, turnState, currentChapterId]);

  const loadChapter = (chapterId: string, carryoverUnits?: readonly ExtendedUnitState[]) => {
    setPopupQueue([]);
    const targetChapter = chapters[chapterId];
    if (!targetChapter) return;
    setCurrentChapterId(chapterId);
    const participatingIds = new Set(extendedUnits
      .filter(({ unit }) => unit.faction === 'player' && !unit.isDead)
      .map(({ unit }) => unit.id));
    const newUnits = applyDifficulty(carryoverUnits
      ? carryUnitsToChapter(carryoverUnits, targetChapter, participatingIds)
      : structuredClone(targetChapter.units), difficulty);
    setExtendedUnits(newUnits);
    setReserveUnits([]);
    // The convoy carries over between chapters; a fresh game starts empty.
    if (!carryoverUnits) setConvoy([]);
    turnManager.restoreState({ turnNumber: 1, activePhase: 'player_phase' }, newUnits.map((u) => u.unit));
    setTurnState(turnManager.getState());
    setChapterOutcome('ongoing');
    setShowStoryIntro(true);
    setShowPreparation(chapterId === 'chapter_02' || chapterId === 'chapter_03');
    if (!carryoverUnits) setGold(0);
    setVillageStates({});
    setChestStates({});
    setDoorStates({});
    setSpawnedReinforcements([]);
    setMoveCommitted(false);
    setMoveOrigin(null);
    // PLAN item 94: warn about reinforcements arriving at the end of turn 1.
    const arriving = announcedReinforcements(targetChapter, 1, []);
    if (arriving.length > 0) {
      setCombatLog((prev) => ['⚠️ Enemy reinforcements will arrive at the end of this turn!', ...prev]);
    }
    setActiveVillageDialogue(null);
    setPendingMovePos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    setPinnedUnitId(null);
    setHoveredUnitSummary(null);
    showNotice(`Switched to ${targetChapter.name}`);
    setCombatLog([`📜 Started ${targetChapter.name}`]);
  };

  const toggleDeployment = (unitId: string) => {
    if (unitId === currentChapter.lordUnitId) return;
    const active = extendedUnits.find(({ unit }) => unit.id === unitId && unit.faction === 'player');
    if (active) {
      const nextActive = placeDeployedUnits(extendedUnits.filter(({ unit }) => unit.id !== unitId), currentChapter);
      setExtendedUnits(nextActive);
      setReserveUnits([...reserveUnits, active]);
      turnManager.replaceUnits(nextActive.map(({ unit }) => unit));
      syncState();
      return;
    }
    const reserve = reserveUnits.find(({ unit }) => unit.id === unitId);
    const deploymentLimit = currentChapter.units.filter(({ unit }) => unit.faction === 'player').length;
    if (!reserve || extendedUnits.filter(({ unit }) => unit.faction === 'player').length >= deploymentLimit) return;
    const nextActive = placeDeployedUnits([...extendedUnits, reserve], currentChapter);
    setExtendedUnits(nextActive);
    setReserveUnits(reserveUnits.filter(({ unit }) => unit.id !== unitId));
    turnManager.replaceUnits(nextActive.map(({ unit }) => unit));
    syncState();
  };

  const selectedUnit = turnManager.getSelectedUnit();
  const selectedExtUnit = extendedUnits.find((u) => u.unit.id === selectedUnit?.id);

  // Vùng di chuyển
  const reachableKeys = useMemo(() => {
    if (!turnState.reachableTiles) return new Set<string>();
    return new Set(Array.from(turnState.reachableTiles.keys()));
  }, [turnState.reachableTiles]);

  // PLAN item 92: opened door tiles are passable for movement.
  const openedDoorKeys = useMemo(() => new Set(
    (currentChapter.doors ?? [])
      .filter((door) => doorStates[door.id] === 'opened')
      .map((door) => `${door.position.x},${door.position.y}`),
  ), [currentChapter.doors, doorStates]);

  // Vùng nguy hiểm của quân địch (PLAN item 145): tập ô gộp của mọi địch,
  // tính bằng helper core dùng chung với vùng của từng địch.
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

  // Địch đang được xem (bấm vào địch): hiện vùng của riêng địch đó thay vùng
  // gộp, kiểu Fire Emblem (PLAN items 145/167).
  const inspectedTargetTile = selectedEnemyPos ?? inspectedTile;
  const inspectedEnemy = inspectedTargetTile
    ? extendedUnits.find((u) => !u.unit.isDead && u.unit.faction === 'enemy' && u.unit.position.x === inspectedTargetTile.x && u.unit.position.y === inspectedTargetTile.y)
    : undefined;
  const inspectedThreatKeys = useMemo(
    () => (inspectedEnemy ? computeInspectedEnemyThreatKeys(inspectedEnemy, extendedUnits, mapData, defaultTerrainRegistry, openedDoorKeys) : null),
    [inspectedEnemy, extendedUnits, openedDoorKeys, mapData],
  );

  // PLAN item 167: When an enemy is selected, its reachable movement tiles are computed
  // so the player can see both its movement range (blue) and its attack threat range (red).
  const enemyReachableKeys = useMemo(() => {
    if (!inspectedEnemy || selectedExtUnit) return null;
    const range = calculateMovementRange(inspectedEnemy.unit, threatContext);
    return new Set(Array.from(range.keys()));
  }, [inspectedEnemy, selectedExtUnit, threatContext]);

  const displayReachableKeys = (selectedExtUnit ? reachableKeys : enemyReachableKeys) ?? new Set<string>();
  const displayDangerZoneKeys = inspectedThreatKeys ?? combinedDangerZoneKeys;

  // Danh sách các mục tiêu có thể tấn công từ vị trí hiện tại
  // PLAN items 141 & 142: bao gồm cả trường hợp quân chưa di chuyển (đứng tại chỗ).
  const attackableTargets = useMemo(() => {
    if (!selectedExtUnit) return [];
    const pos = pendingMovePos ?? selectedExtUnit.unit.position;

    const enemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);
    return enemies.filter((enemy) => {
      const dist = getManhattanDistance(pos, enemy.unit.position);
      // Any usable weapon in the inventory counts (PLAN item 85): the
      // Attack command opens a weapon picker when several can reach.
      return canAttackAtDistance(selectedExtUnit, ITEM_BY_ID, dist);
    });
  }, [selectedExtUnit, pendingMovePos, extendedUnits]);

  const attackTargetKeys = useMemo(() => {
    return new Set(attackableTargets.map((t) => `${t.unit.position.x},${t.unit.position.y}`));
  }, [attackableTargets]);

  // PLAN item 89: heal-staff targets from the destination tile.
  const tradePartners = selectedExtUnit && pendingMovePos && !selectedExtUnit.unit.hasTraded
    ? getTradePartners(extendedUnits, selectedExtUnit, pendingMovePos)
    : [];

  const staffTargets = useMemo(() => {
    if (!staffTargeting || !selectedExtUnit || !pendingMovePos) return [];
    const staff = ITEM_BY_ID.get(staffTargeting.staffId);
    if (!staff) return [];
    return getStaffTargets(extendedUnits, selectedExtUnit, staff, pendingMovePos);
  }, [staffTargeting, selectedExtUnit, pendingMovePos, extendedUnits]);

  const staffTargetKeys = useMemo(() => {
    return new Set(staffTargets.map((t) => `${t.unit.position.x},${t.unit.position.y}`));
  }, [staffTargets]);

  // PLAN item 156: valid Warp destinations for the chosen ally.
  const warpDestinationKeys = useMemo(() => {
    if (!warpTargeting) return new Set<string>();
    const target = extendedUnits.find((u) => u.unit.id === warpTargeting.targetId);
    if (!target) return new Set<string>();
    return new Set(getWarpDestinations(extendedUnits, target, mapData, defaultTerrainRegistry)
      .map((pos) => `${pos.x},${pos.y}`));
  }, [warpTargeting, extendedUnits, mapData]);

  // PLAN item 132: trade partners are picked on the map (Fire Emblem
  // style), highlighted like attack/staff targets.
  const tradeTargetKeys = useMemo(() => {
    if (!tradeTargeting) return new Set<string>();
    return new Set(tradePartners.map((t) => `${t.unit.position.x},${t.unit.position.y}`));
  }, [tradeTargeting, tradePartners]);

  const boardView = buildBoardView({
    map: mapData,
    units: extendedUnits.map(({ unit }) => unit),
    reachableKeys: displayReachableKeys,
    dangerZoneKeys: displayDangerZoneKeys,
    attackTargetKeys: warpTargeting ? warpDestinationKeys : staffTargeting ? staffTargetKeys : tradeTargeting ? tradeTargetKeys : attackTargetKeys,
    selected: selectedUnit?.position ?? null,
    inspected: inspectedEnemy?.unit.position ?? null,
  });

  const getUnitDisplay = (unitId: string): UnitDisplay | undefined => {
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
  };

  const talkTarget = selectedExtUnit && pendingMovePos
    ? extendedUnits.find(({ unit }) => currentChapter.recruitments.some((rule) =>
      rule.speakerUnitId === selectedExtUnit.unit.id
      && rule.targetUnitId === unit.id
      && unit.faction === 'enemy' && !unit.isDead
      && getManhattanDistance(pendingMovePos, unit.position) <= rule.maxDistance))
    : undefined;

  const currentVillageAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit) return null;
    if (selectedExtUnit.unit.id !== currentChapter.lordUnitId) return null;
    const village = currentChapter.villages?.find(
      (v) => v.position.x === pendingMovePos.x && v.position.y === pendingMovePos.y
    );
    if (!village) return null;
    const state = villageStates[village.id] ?? 'intact';
    return state === 'intact' ? village : null;
  }, [pendingMovePos, selectedExtUnit, currentChapter.villages, villageStates]);

  // PLAN item 92: closed chest under the destination tile, closed door beside it.
  const currentChestAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit) return null;
    const chest = currentChapter.chests?.find(
      (c) => c.position.x === pendingMovePos.x && c.position.y === pendingMovePos.y,
    );
    if (!chest || chestStates[chest.id] === 'opened') return null;
    return chest;
  }, [pendingMovePos, selectedExtUnit, currentChapter.chests, chestStates]);

  const doorAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit) return null;
    const door = currentChapter.doors?.find(
      (d) => Math.abs(d.position.x - pendingMovePos.x) + Math.abs(d.position.y - pendingMovePos.y) === 1,
    );
    if (!door || doorStates[door.id] === 'opened') return null;
    return door;
  }, [pendingMovePos, selectedExtUnit, currentChapter.doors, doorStates]);

  // Click vào ô trên bản đồ
  // PLAN item 159 (owner playtest 2026-11-20): after an action the unit's
  // turn ends immediately. The Canto offer (PLAN item 102) left mounted /
  // flying units un-acted until clicked again, which the owner reported as
  // a bug; FE3 (this game's base) has no Canto, so the offer is removed.
  const endUnitTurn = () => {
    turnManager.waitSelectedUnit();
  };

  // PLAN item 158 (owner playtest 2026-11-20): Attack flow is target
  // first, then weapon, then forecast — so the player compares weapons
  // through the forecast. Weapons usable against a chosen target:
  const usableWeaponsForTarget = (target: ExtendedUnitState, fromPos?: Position) => {
    if (!selectedExtUnit) return [];
    const pos = fromPos ?? pendingMovePos ?? selectedExtUnit.unit.position;
    const dist = getManhattanDistance(pos, target.unit.position);
    return getAttackWeapons(selectedExtUnit, ITEM_BY_ID).filter((weapon) => {
      const range = getAttackRange(selectedExtUnit.unit, weapon.definition);
      return range.max > 0 && dist >= range.min && dist <= range.max;
    });
  };

  const openAttackForecast = (target: ExtendedUnitState, weaponDef?: ItemDefinition, fromPos?: Position) => {
    if (!selectedExtUnit) return;
    const pos = fromPos ?? pendingMovePos ?? selectedExtUnit.unit.position;
    soundManager.playSfx('cursor');
    setWeaponPickerOpen(false);
    setSelectedTarget(target);
    const dist = getManhattanDistance(pos, target.unit.position);
    // PLAN item 85: when the equipped weapon cannot reach this target
    // but another usable weapon can, equip that weapon for the attack.
    const attackWeapon = weaponDef ?? findWeaponForDistance(selectedExtUnit, ITEM_BY_ID, dist);
    if (attackWeapon && attackWeapon.id !== selectedExtUnit.weapon?.id) {
      setExtendedUnits((prev) => equipWeapon(prev, selectedExtUnit.unit.id, attackWeapon.id, ITEM_BY_ID));
    }
    const attackerTerrain = mapData.grid[pos.y]?.[pos.x] ?? 'plains';
    const defenderTerrain = mapData.grid[target.unit.position.y]?.[target.unit.position.x] ?? 'plains';
    // PLAN items 112/113: skill modifiers for both sides.
    const allySkillIds = new Map(extendedUnits.map((u) => [u.unit.id, skillIdsOf(u)]));
    const allGridUnits = extendedUnits.map((u) => u.unit);
    const attackerMods = getSkillModifiers(skillIdsOf(selectedExtUnit), selectedExtUnit.unit, selectedExtUnit.stats, attackWeapon ?? selectedExtUnit.weapon, target.weapon, true, allGridUnits, allySkillIds, selectedExtUnit.level);
    const defenderMods = getSkillModifiers(skillIdsOf(target), target.unit, target.stats, target.weapon, attackWeapon ?? selectedExtUnit.weapon, false, allGridUnits, allySkillIds, target.level);
    const holds = (entry: ExtendedUnitState, itemId: string) => entry.inventory.some((i) => i.itemId === itemId);
    setCombatForecast(calculateCombatForecast(
      selectedExtUnit.unit,
      selectedExtUnit.stats,
      attackWeapon ?? selectedExtUnit.weapon,
      target.unit,
      target.stats,
      target.weapon,
      dist,
      defaultTerrainRegistry,
      attackerTerrain,
      defenderTerrain,
      allGridUnits,
      { attacker: getElevation(mapData, pos), defender: getElevation(mapData, target.unit.position) },
      { attacker: attackerMods, defender: defenderMods },
      {
        attackerHasLight: holds(selectedExtUnit, 'lightsphere'),
        attackerHasDark: holds(selectedExtUnit, 'darksphere'),
        defenderHasLight: holds(target, 'lightsphere'),
        defenderHasDark: holds(target, 'darksphere'),
      }
    ));
  };

  // PLAN item 158: target chosen — with several usable weapons the picker
  // opens next; with one, the forecast opens right away.
  const selectAttackTarget = (target: ExtendedUnitState, fromPos?: Position) => {
    const pos = fromPos ?? pendingMovePos ?? selectedExtUnit?.unit.position;
    const weapons = usableWeaponsForTarget(target, pos);
    if (weapons.length > 1) {
      soundManager.playSfx('cursor');
      setSelectedTarget(target);
      setWeaponPickerOpen(true);
      return;
    }
    openAttackForecast(target, weapons[0]?.definition, pos);
  };

  const handleTileClick = (x: number, y: number) => {
    if (animCleanupRef.current) {
      animCleanupRef.current();
      animCleanupRef.current = null;
    }
    if (turnState.activePhase !== 'player_phase' || isProcessingAI) {
      return;
    }
    // PLAN item 86: a full-inventory choice must be resolved first.
    if (pendingOverflows.length > 0) {
      return;
    }
    // PLAN item 87: the trade window is modal.
    if (tradeState) {
      return;
    }
    // PLAN item 88: the storage window is modal.
    if (storageOpen) {
      return;
    }
    // PLAN item 91: the shop window is modal.
    if (shopOpen) {
      return;
    }
    // PLAN item 93: the arena window is modal.
    if (arenaOpen) {
      return;
    }

    const clickedExt = extendedUnits.find(
      (u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y
    );

    // PLAN item 132: trade target lock — click a highlighted ally on the
    // map to open the trade screen; click the unit's tile to go back.
    if (tradeTargeting) {
      if (clickedExt && tradePartners.some((t) => t.unit.id === clickedExt.unit.id)) {
        setTradeTargeting(false);
        tradeChangedRef.current = false;
        setTradeState({ partnerId: clickedExt.unit.id });
      } else if (pendingMovePos && x === pendingMovePos.x && y === pendingMovePos.y) {
        setTradeTargeting(false);
      }
      return;
    }

    // PLAN item 156: Warp destination lock — click a highlighted tile to
    // send the ally there, click the unit's destination tile to cancel.
    if (warpTargeting) {
      if (warpDestinationKeys.has(`${x},${y}`)) {
        const { staffId, targetId } = warpTargeting;
        const destination = { x, y };
        setWarpTargeting(null);
        executeWithMove(() => {
          if (!selectedExtUnit) return;
          const result = applyWarpUse(extendedUnits, selectedExtUnit.unit.id, targetId, staffId, destination, ITEM_BY_ID, defaultRNG, mapData, defaultTerrainRegistry);
          if (!result) return;
          turnManager.replaceUnits(result.units.map(({ unit }) => unit));
          endUnitTurn();
          setExtendedUnits(result.units);
          setCombatLog((prev) => [...result.messages, ...prev].slice(0, 20));
          syncState();
        });
      } else if (pendingMovePos && x === pendingMovePos.x && y === pendingMovePos.y) {
        setWarpTargeting(null);
      }
      return;
    }

    // PLAN item 89: staff target lock — click a highlighted ally to heal,
    // click the unit's destination tile to go back to the menu.
    if (staffTargeting) {
      if (clickedExt && staffTargets.some((t) => t.unit.id === clickedExt.unit.id)) {
        const staffId = staffTargeting.staffId;
        const targetId = clickedExt.unit.id;
        setStaffTargeting(null);
        // PLAN item 156: Warp needs a second pick — the destination tile.
        const staff = ITEM_BY_ID.get(staffId);
        if (staff && isWarpStaff(staff)) {
          setWarpTargeting({ staffId, targetId });
          return;
        }
        executeWithMove(() => {
          if (!selectedExtUnit) return;
          const result = applyStaffUse(extendedUnits, selectedExtUnit.unit.id, targetId, staffId, ITEM_BY_ID, defaultRNG);
          if (!result) return;
          soundManager.playSfx('heal');
          turnManager.replaceUnits(result.units.map(({ unit }) => unit));
          endUnitTurn();
          setExtendedUnits(result.units);
          setCombatLog((prev) => [...result.messages, ...prev].slice(0, 20));
          syncState();
        });
      } else if (pendingMovePos && x === pendingMovePos.x && y === pendingMovePos.y) {
        setStaffTargeting(null);
      }
      return;
    }

    // Đang khóa chọn mục tiêu Attack (PLAN item 80): chỉ ô địch trong tầm
    // mới đáp ứng; bấm ô đích của quân để quay lại menu, ô khác bỏ qua.
    if (attackTargeting) {
      if (clickedExt && clickedExt.unit.faction === 'enemy'
        && attackableTargets.some((t) => t.unit.id === clickedExt.unit.id)) {
        setAttackTargeting(false);
        selectAttackTarget(clickedExt);
      } else if (pendingMovePos && x === pendingMovePos.x && y === pendingMovePos.y) {
        setAttackTargeting(false);
      }
      return;
    }

    // PLAN items 141 & 142: Bấm vào quân địch trong tầm để tấn công trực tiếp.
    // Nếu quân chưa di chuyển (đứng tại chỗ), tự động xác nhận đứng yên tại chỗ
    // rồi mở chọn vũ khí / dự báo giao tranh với địch.
    if (selectedExtUnit && attackableTargets.length > 0 && clickedExt && clickedExt.unit.faction === 'enemy'
      && attackableTargets.some((t) => t.unit.id === clickedExt.unit.id)) {
      const pos = pendingMovePos ?? selectedExtUnit.unit.position;
      if (!pendingMovePos) {
        setMoveOrigin(pos);
        setPendingMovePos(pos);
        setPlannedPath([pos]);
        setMoveCommitted(true);
        turnManager.moveSelectedUnit(pos);
      }
      setAttackTargeting(false);
      selectAttackTarget(clickedExt, pos);
      return;
    }

    // Nếu đã chọn 1 quân ta và click vào ô di chuyển trong phạm vi
    // (PLAN items 87/88: after trading or using Storage, the destination is locked).
    // PLAN item 98: the click moves the unit to the tile right away; the
    // action bar appears after arrival. Clicking another reachable tile
    // sends the unit back to its origin first, then to the new tile.
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
      setWeaponPickerOpen(false);
      // Đổi ô đích thì hủy lựa chọn tấn công đang chờ: dự báo cũ tính theo
      // vị trí cũ, giữ lại sẽ đánh địch cũ trong khi quân đi ô khác (PLAN 80).
      setCombatForecast(null);
      setSelectedTarget(null);
      setAttackTargeting(false);
      setStaffTargeting(null);
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

    // Chọn đơn vị quân ta chưa đi
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
      setSelectedTarget(null);
      setCombatForecast(null);
      setAttackTargeting(false);
      syncState();
      return;
    }

    // Bỏ chọn hoặc chạm vào quân khác (địch hoặc đã đi) (PLAN items 145/167)
    if (!pendingMovePos && !activeMovingUnit) {
      turnManager.cancelSelect();
      setPlannedPath(null);
      setSelectedTarget(null);
      setCombatForecast(null);
      setAttackTargeting(false);
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
  };

  // Chạy di chuyển có hoạt cảnh trước khi hoàn tất hành động
  const executeWithMove = (actionFn: () => void) => {
    // Decision 5: Guard against null, dead, or already acted units before movement
    if (!selectedExtUnit || selectedExtUnit.unit.isDead || selectedExtUnit.unit.hasActed) {
      return;
    }
    // PLAN item 98: the unit already walked to the destination on click.
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

  // Xác nhận Tấn công
  const handleConfirmAttack = () => {
    if (!combatForecast || !selectedExtUnit || !selectedTarget) return;
    const forecast = combatForecast;
    const attacker = selectedExtUnit;
    const defender = selectedTarget;
    setCombatForecast(null);
    setSelectedTarget(null);

    executeWithMove(() => {
      const hpBefore = { attacker: attacker.stats.hp, defender: defender.stats.hp };
      const result = executeCombat(forecast, defaultRNG);
      const popup = buildCombatPopup(++popupIdRef.current, attacker, defender, hpBefore, result);
      setPopupQueue([popup]);

      const logs: string[] = [];
      const startEvent = bossStartEvent(currentDialogues, defender.unit.id, defender.unit.name);
      if (startEvent) logs.push(...eventLogLines([startEvent]));
      logs.push(`⚔️ ENGAGEMENT: ${attacker.unit.name} vs ${defender.unit.name}`);

      // PLAN item 135: Combat consequences handled by the stateless simulation layer
      const resolution = resolveCombatConsequences({
        units: extendedUnits,
        result,
        rng: defaultRNG,
        itemById: ITEM_BY_ID,
        itemsList: itemsJson.items as any,
        chapter: currentChapter,
        dialogues: currentDialogues as any,
        gold,
        villageStates,
      });

      for (const cue of resolution.soundCues) {
        if (cue.type === 'weapon') soundManager.playWeaponHit(cue.weaponType ?? 'sword');
        else soundManager.playSfx(cue.type);
      }

      logs.push(...resolution.logs);
      if (resolution.defeatEvents.length > 0) {
        logs.push(...eventLogLines(resolution.defeatEvents));
        queueOverflows(resolution.defeatEvents);
      }
      setGold(resolution.gold);
      setVillageStates(resolution.villageStates);

      const updatedUnits = resolution.units;
      setCombatLog((prev) => [...logs, ...prev].slice(0, 20));
      turnManager.replaceUnits(updatedUnits.map((item) => item.unit));
      setExtendedUnits(updatedUnits);

      const outcome = evaluateChapterOutcome(updatedUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId, { turnNumber: turnState.turnNumber });
      if (outcome !== 'ongoing') setChapterOutcome(outcome);

      endUnitTurn();
      syncState();
    });
  };

  // Xác nhận Chờ
  const handleConfirmWait = () => {
    executeWithMove(() => {
      soundManager.playSfx('accept');
      turnManager.waitSelectedUnit();
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
    });
  };

  // PLAN item 92: opening a chest or door ends the unit's action.
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
      setSelectedTarget(null);
      setCombatForecast(null);
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
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
    });
  };

  const handleUseVulnerary = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const item = itemsJson.items.find(({ id }) => id === 'vulnerary') as ItemDefinition | undefined;
      if (!item) return;
      const changed = useVulnerary(selectedExtUnit, item);
      if (!changed) return;
      soundManager.playSfx('heal');
      const nextUnits = extendedUnits.map((entry) => entry.unit.id === changed.unit.id ? changed : entry);
      turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
      endUnitTurn();
      setExtendedUnits(nextUnits);
      setCombatLog((prev) => [`${changed.unit.name} used ${item.name}: HP ${changed.stats.hp}/${changed.stats.maxHp}`, ...prev].slice(0, 20));
      syncState();
    });
  };

  const handlePromote = (targetClassId: string) => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const changed = promoteWithoutItem(selectedExtUnit, targetClassId);
      if (!changed) return;
      soundManager.playSfx('levelup');
      const nextUnits = extendedUnits.map((entry) => entry.unit.id === changed.unit.id ? changed : entry);
      turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
      endUnitTurn();
      setExtendedUnits(nextUnits);
      setCombatLog((prev) => [`${changed.unit.name} promoted to ${getClassDefinition(targetClassId)?.name ?? targetClassId}`, ...prev].slice(0, 20));
      syncState();
    });
  };

  const handleToggleMounted = () => {
    if (!selectedExtUnit || pendingMovePos || selectedExtUnit.unit.hasActed) return;
    const changed = changeMountedState(selectedExtUnit, Boolean(selectedExtUnit.unit.mountedClassId));
    if (!changed) return;
    soundManager.playSfx('cursor');
    const nextUnits = extendedUnits.map((entry) => entry.unit.id === changed.unit.id ? changed : entry);
    setExtendedUnits(nextUnits);
    turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
    const range = calculateMovementRange(changed.unit, {
      map: mapData,
      terrains: defaultTerrainRegistry,
      units: nextUnits.map(({ unit }) => unit),
      openedDoors: openedDoorKeys,
    });
    turnManager.selectUnit(changed.unit.id, range);
    syncState();
  };

  const chapterState = (units: readonly ExtendedUnitState[] = extendedUnits): ChapterState => ({ units, gold, villageStates, chestStates, doorStates });

  const commitChapterState = (next: ChapterState) => {
    setExtendedUnits([...next.units]);
    setGold(next.gold);
    setVillageStates({ ...next.villageStates });
    setChestStates({ ...next.chestStates });
    setDoorStates({ ...next.doorStates });
    turnManager.replaceUnits(next.units.map(({ unit }) => unit));
  };

  // PLAN item 86: full-inventory gains wait for a discard choice.
  // PLAN item 131: item/gold gains and recruitments also pop a centered
  // reward popup with the item icon or the character's avatar.
  const queueOverflows = (events: readonly GameEvent[]) => {
    const overflows = events
      .filter((event) => event.type === 'item_overflow')
      .map((event) => ({ unitId: event.unitId, itemId: event.itemId, itemName: event.itemName }));
    if (overflows.length > 0) setPendingOverflows((prev) => [...prev, ...overflows]);

    const popups: RewardPopupData[] = [];
    for (const event of events) {
      if (event.type === 'item_gained') {
        const item = ITEM_BY_ID.get(event.itemId);
        popups.push({
          kind: 'item',
          title: '🎁 Item received!',
          name: event.itemName,
          imageUrl: item ? getItemIcon(item.id, item.type) : undefined,
          detail: `${event.unitName} got ${event.itemName}.`,
        });
      } else if (event.type === 'gold_gained') {
        popups.push({
          kind: 'gold',
          title: '💰 Gold received!',
          name: `${event.amount.toLocaleString()} Gold`,
        });
      } else if (event.type === 'unit_recruited') {
        const recruited = extendedUnits.find((entry) => entry.unit.id === event.unitId);
        popups.push({
          kind: 'recruit',
          title: '🤝 Joined your army!',
          name: recruited?.unit.name ?? event.unitId,
          imageUrl: recruited?.avatarUrl,
          detail: `${recruited?.unit.name ?? event.unitId} has become one of your allies!`,
        });
      }
    }
    if (popups.length > 0) setRewardPopups((prev) => [...prev, ...popups]);
  };

  const resolvePendingOverflow = (discardItemId: string | null | 'convoy') => {
    const pending = pendingOverflows[0];
    if (!pending) return;
    const newUses = ITEM_BY_ID.get(pending.itemId)?.maxUses ?? 1;
    if (discardItemId === 'convoy') {
      const nextConvoy = sendToConvoy(convoy, pending.itemId, newUses);
      if (nextConvoy) setConvoy(nextConvoy);
    } else {
      setExtendedUnits((prev) =>
        resolveOverflow(prev, pending.unitId, pending.itemId, newUses, discardItemId, ITEM_BY_ID));
    }
    setPendingOverflows((prev) => prev.slice(1));
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

  // PLAN item 109: escape from an escape tile; the unit leaves the map.
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
      const outcome = evaluateChapterOutcome(updatedUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId, { turnNumber: turnState.turnNumber });
      if (outcome !== 'ongoing') setChapterOutcome(outcome);
      turnManager.waitSelectedUnit();
      syncState();
    });
  };

  // PLAN item 121: manakete transformation (ends the unit's action).
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

  // PLAN item 124: dancer refreshes an adjacent acted ally.
  const danceTarget = selectedExtUnit?.unit.classId === 'dancer' && pendingMovePos
    ? extendedUnits.find((entry) => entry.unit.faction === 'player' && !entry.unit.isDead
      && entry.unit.id !== selectedExtUnit.unit.id && entry.unit.hasActed
      && getManhattanDistance(entry.unit.position, pendingMovePos) === 1)
    : undefined;

  const handleDance = () => {
    if (!selectedExtUnit || !danceTarget) return;
    executeWithMove(() => {
      const next = extendedUnits.map((entry) => entry.unit.id === danceTarget.unit.id
        ? { ...entry, unit: { ...entry.unit, hasActed: false } }
        : entry);
      turnManager.replaceUnits(next.map(({ unit }) => unit));
      setExtendedUnits(next);
      soundManager.playSfx('accept');
      setCombatLog((prev) => [`💃 ${selectedExtUnit.unit.name} dances for ${danceTarget.unit.name}!`, ...prev]);
      turnManager.waitSelectedUnit();
      syncState();
    });
  };

  // PLAN item 124: Xane imitates an adjacent ally for 5 turns.
  const imitateTarget = selectedExtUnit?.unit.classId === 'chameleon' && pendingMovePos
    && (selectedExtUnit.unit.imitateTurns ?? 0) <= 0
    ? extendedUnits.find((entry) => entry.unit.faction === 'player' && !entry.unit.isDead
      && entry.unit.id !== selectedExtUnit.unit.id
      && getManhattanDistance(entry.unit.position, pendingMovePos) === 1)
    : undefined;

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
      const result = visitVillage(chapterState(), selectedExtUnit.unit.id, village, itemsJson.items, currentDialogues);
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
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
    });
  };

  // Nút Attack trong menu hành động (PLAN items 80/158): chọn mục tiêu
  // trước — đúng 1 mục tiêu thì chọn luôn, từ 2 mục tiêu thì khóa chọn
  // mục tiêu trong tầm đánh. Vũ khí chọn sau khi đã có mục tiêu
  // (selectAttackTarget), rồi mới hiện dự báo.
  const handleAttack = () => {
    if (attackableTargets.length === 1) {
      const target = attackableTargets[0];
      if (target) selectAttackTarget(target);
    } else if (attackableTargets.length > 0) {
      setAttackTargeting(true);
    }
  };

  const handlePickWeapon = (itemId: string) => {
    if (!selectedExtUnit) return;
    setExtendedUnits((prev) => equipWeapon(prev, selectedExtUnit.unit.id, itemId, ITEM_BY_ID));
    setWeaponPickerOpen(false);
    // PLAN item 158: the target is already chosen; open the forecast with
    // the picked weapon so weapons can be compared through the forecast.
    if (selectedTarget) {
      openAttackForecast(selectedTarget, ITEM_BY_ID.get(itemId));
    }
  };

  const handleEquip = (itemId: string) => {
    if (!selectedExtUnit) return;
    setExtendedUnits((prev) => equipWeapon(prev, selectedExtUnit.unit.id, itemId, ITEM_BY_ID));
  };

  const handleStaff = (staffId: string) => {
    setStaffTargeting({ staffId });
  };


  // PLAN item 88: Storage is available to Marth himself and to units
  // standing adjacent to Marth at their destination tile.
  const lordEntry = extendedUnits.find((u) => u.unit.id === currentChapter.lordUnitId && !u.unit.isDead);
  const canStorage = Boolean(selectedExtUnit && pendingMovePos && lordEntry && (
    selectedExtUnit.unit.id === lordEntry.unit.id
    || Math.abs(lordEntry.unit.position.x - pendingMovePos.x)
      + Math.abs(lordEntry.unit.position.y - pendingMovePos.y) === 1
  ));

  // PLAN item 91: Shop is available on shop terrain at the destination tile.
  const canShop = Boolean(selectedExtUnit && pendingMovePos
    && (mapData.grid[pendingMovePos.y]?.[pendingMovePos.x] ?? 'plains') === 'shop');

  // PLAN item 93: Arena is available on arena terrain for an armed unit with gold.
  const canArena = Boolean(selectedExtUnit && pendingMovePos
    && (mapData.grid[pendingMovePos.y]?.[pendingMovePos.x] ?? 'plains') === 'arena'
    && canEnterArena(selectedExtUnit) && gold >= ARENA_TIERS[0]!.wager);

  const handleDeposit = (index: number) => {
    if (!selectedExtUnit) return;
    const result = depositToConvoy(extendedUnits, convoy, selectedExtUnit.unit.id, index, ITEM_BY_ID);
    if (result) {
      storageChangedRef.current = true;
      setExtendedUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  const handleWithdraw = (index: number) => {
    if (!selectedExtUnit) return;
    const result = withdrawFromConvoy(extendedUnits, convoy, selectedExtUnit.unit.id, index, ITEM_BY_ID);
    if (result) {
      storageChangedRef.current = true;
      setExtendedUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  // PLAN item 165: only commit Storage action (locking destination) if an item actually changed hands.
  const handleStorageClose = () => {
    if (selectedExtUnit && storageChangedRef.current) {
      const next = extendedUnits.map((entry) =>
        entry.unit.id === selectedExtUnit.unit.id
          ? { ...entry, unit: { ...entry.unit, hasStored: true } }
          : entry);
      setExtendedUnits(next);
      turnManager.replaceUnits(next.map((entry) => entry.unit));
    }
    setStorageOpen(false);
    syncState();
  };

  const handleBuy = (itemId: string) => {
    if (!selectedExtUnit) return;
    const result = buyItem(extendedUnits, convoy, gold, selectedExtUnit.unit.id, itemId, ITEM_BY_ID);
    if (result) {
      shopChangedRef.current = true;
      soundManager.playSfx('item_get');
      setExtendedUnits(result.units);
      setConvoy(result.convoy);
      setGold(result.gold);
    }
  };

  const handleSell = (index: number) => {
    if (!selectedExtUnit) return;
    const result = sellItem(extendedUnits, gold, selectedExtUnit.unit.id, index, ITEM_BY_ID);
    if (result) {
      shopChangedRef.current = true;
      soundManager.playSfx('item_get');
      setExtendedUnits(result.units);
      setGold(result.gold);
    }
  };

  // PLAN item 165: closing the shop without buying/selling returns to action menu; only ends turn if transaction occurred.
  const handleShopClose = () => {
    setShopOpen(false);
    if (shopChangedRef.current) {
      executeWithMove(() => {
        endUnitTurn();
        syncState();
      });
    }
  };

  // PLAN item 93/165: arena — wager, fight gladiator; leaving without fighting does NOT consume turn.
  const handleArenaTier = (tier: ArenaTier) => {
    if (!selectedExtUnit || gold < tier.wager) return;
    const opponent = generateArenaOpponent(selectedExtUnit, tier, ITEM_BY_ID, defaultRNG);
    if (!opponent) return;
    setArenaTier(tier);
    setArenaOpponent(opponent);
    setArenaOutcome(null);
  };

  const handleArenaFight = () => {
    if (!selectedExtUnit || !arenaTier || !arenaOpponent) return;
    const tier = arenaTier;
    const opponent = arenaOpponent;
    const unitId = selectedExtUnit.unit.id;
    executeWithMove(() => {
      const entry = extendedUnits.find((u) => u.unit.id === unitId);
      if (!entry) return;
      const outcome = runArenaFight(entry, opponent, defaultRNG, ITEM_BY_ID);
      setGold((prev) => prev - tier.wager + (outcome.won ? tier.wager * 2 : 0));
      const nextUnits = extendedUnits.map((u) => (u.unit.id === unitId ? outcome.playerAfter : u));
      setExtendedUnits(nextUnits);
      turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
      setArenaOutcome(outcome);
      soundManager.playSfx(outcome.won ? 'item_get' : 'nodamage');
      setCombatLog((prev) => [
        outcome.won
          ? `🏟️ ${entry.unit.name} won the arena bout! +${tier.wager.toLocaleString()} G profit, +${outcome.expGained} EXP.`
          : `🏟️ ${entry.unit.name} lost the arena bout and the ${tier.wager.toLocaleString()} G wager (+${outcome.expGained} EXP).`,
        ...prev,
      ]);
      syncState();
    });
  };

  const handleArenaAgain = () => {
    setArenaTier(null);
    setArenaOpponent(null);
    setArenaOutcome(null);
  };

  const handleArenaLeave = () => {
    setArenaOpen(false);
    const didFight = arenaOutcome !== null;
    handleArenaAgain();
    if (didFight) {
      executeWithMove(() => {
        endUnitTurn();
        syncState();
      });
    }
  };

  const convoyRows = convoy.flatMap((item) => {
    const def = ITEM_BY_ID.get(item.itemId);
    return def
      ? [{ itemId: item.itemId, name: def.name, uses: item.uses, maxUses: def.maxUses, type: def.type, equipped: false }]
      : [];
  });

  const handlePrepDeposit = (index: number) => {
    if (!prepConvoyUnitId) return;
    const inDeployed = extendedUnits.some((u) => u.unit.id === prepConvoyUnitId);
    const source = inDeployed ? extendedUnits : reserveUnits;
    const result = depositToConvoy(source, convoy, prepConvoyUnitId, index, ITEM_BY_ID);
    if (result) {
      if (inDeployed) setExtendedUnits(result.units);
      else setReserveUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  const handlePrepWithdraw = (index: number) => {
    if (!prepConvoyUnitId) return;
    const inDeployed = extendedUnits.some((u) => u.unit.id === prepConvoyUnitId);
    const source = inDeployed ? extendedUnits : reserveUnits;
    const result = withdrawFromConvoy(source, convoy, prepConvoyUnitId, index, ITEM_BY_ID);
    if (result) {
      if (inDeployed) setExtendedUnits(result.units);
      else setReserveUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  const handleTrade = () => {
    if (tradePartners.length === 0) return;
    // PLAN item 132: one partner opens the trade screen directly; with
    // several, the player picks the partner on the map (FE style).
    if (tradePartners.length === 1) {
      tradeChangedRef.current = false;
      setTradeState({ partnerId: tradePartners[0]!.unit.id });
    } else {
      setTradeTargeting(true);
      showNotice('🔁 Trade: choose a partner on the map.');
    }
  };

  // PLAN item 116: trade between any two units in battle preparation.
  const applyPrepTrade = (fn: (units: ExtendedUnitState[]) => ExtendedUnitState[]) => {
    const deployedIds = new Set(extendedUnits.map((u) => u.unit.id));
    const next = fn([...extendedUnits, ...reserveUnits]);
    setExtendedUnits(next.filter((u) => deployedIds.has(u.unit.id)));
    setReserveUnits(next.filter((u) => !deployedIds.has(u.unit.id)));
  };

  // PLAN item 114: reclass in battle preparation (chapter 4+; test chapter
  // allows it for testing [Giả định]).
  const reclassAvailable = (() => {
    if (currentChapterId === 'test_chapter_01') return true;
    const match = /chapter_0?(\d+)/.exec(currentChapterId);
    return match ? Number(match[1]) >= 4 : false;
  })();

  const handlePrepReclass = (unitId: string, classId: string) => {
    const applyTo = (list: ExtendedUnitState[]) => list.map((entry) => {
      if (entry.unit.id !== unitId) return entry;
      return reclassUnit(entry, classId) ?? entry;
    });
    if (extendedUnits.some((u) => u.unit.id === unitId)) {
      const next = applyTo(extendedUnits);
      setExtendedUnits(next);
      turnManager.replaceUnits(next.map((u) => u.unit));
    } else {
      setReserveUnits(applyTo(reserveUnits));
    }
    soundManager.playSfx('accept');
  };

  const handleTradeSwap = (leftIndex: number, rightIndex: number) => {
    if (!selectedExtUnit || !tradeState?.partnerId) return;
    setExtendedUnits((prev) => {
      const next = tradeSwap(prev, selectedExtUnit.unit.id, tradeState.partnerId!, leftIndex, rightIndex, ITEM_BY_ID);
      if (next !== prev) tradeChangedRef.current = true;
      return next;
    });
  };

  const handleTradeMove = (fromSide: 'left' | 'right', index: number) => {
    if (!selectedExtUnit || !tradeState?.partnerId) return;
    const fromId = fromSide === 'left' ? selectedExtUnit.unit.id : tradeState.partnerId;
    const toId = fromSide === 'left' ? tradeState.partnerId : selectedExtUnit.unit.id;
    setExtendedUnits((prev) => {
      const next = tradeMove(prev, fromId, toId, index, ITEM_BY_ID);
      if (next !== prev) tradeChangedRef.current = true;
      return next;
    });
  };

  const handleTradeClose = () => {
    // PLAN item 160 (owner playtest 2026-11-20): closing Trade without
    // transferring anything is not an action — the unit may still cancel
    // its move, as in FE. Only a real transfer marks hasTraded.
    if (selectedExtUnit && tradeState?.partnerId && tradeChangedRef.current) {
      // PLAN item 87: one initiation per turn; movement ends on exit.
      const next = extendedUnits.map((entry) =>
        entry.unit.id === selectedExtUnit.unit.id
          ? { ...entry, unit: { ...entry.unit, hasTraded: true } }
          : entry);
      setExtendedUnits(next);
      turnManager.replaceUnits(next.map((entry) => entry.unit));
    }
    setTradeState(null);
    syncState();
  };

  const tradeSide = (entry: ExtendedUnitState): TradeSide => ({
    unitId: entry.unit.id,
    unitName: entry.unit.name,
    avatarUrl: entry.avatarUrl,
    items: entry.inventory.flatMap((item) => {
      const def = ITEM_BY_ID.get(item.itemId);
      return def
        ? [{
            itemId: item.itemId,
            name: def.name,
            uses: item.uses,
            maxUses: def.maxUses,
            type: def.type,
            equipped: entry.weapon?.id === item.itemId,
          }]
        : [];
    }),
  });

  // Hủy bước di chuyển
  const handleCancelMove = () => {
    soundManager.playSfx('cancel');
    setWeaponPickerOpen(false);
    setStaffTargeting(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    setAttackTargeting(false);
    // PLAN item 98: the unit already moved — walk it back to its origin
    // and keep it selected so another destination can be chosen.
    if (moveCommitted && moveOrigin && selectedExtUnit) {
      const origin = moveOrigin;
      const unitId = selectedExtUnit.unit.id;
      const moveType = selectedExtUnit.unit.moveType;
      const backPath = plannedPath && plannedPath.length > 1 ? [...plannedPath].reverse() : null;
      const arriveBack = () => {
        turnManager.moveSelectedUnit(origin);
        setExtendedUnits([...extendedUnits]);
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

  // Chạy AI Turn
  // PLAN item 140 (owner 2026-11-19): the enemy phase plays back one
  // enemy at a time — walk along the path, then attack with its result
  // popup — instead of resolving instantly. Under Playwright/headless
  // (isFastAnimation) the waits collapse so tests stay fast; the RNG
  // order and decisions are unchanged.
  const runAITurn = async () => {
    setIsProcessingAI(true);
    const fastPlayback = isFastAnimation();
    const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, fastPlayback ? 0 : ms));
    const animateEnemyMove = async (enemy: ExtendedUnitState, dest: Position) => {
      if (enemy.unit.position.x === dest.x && enemy.unit.position.y === dest.y) return;
      const range = calculateMovementRange(enemy.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: phaseUnits.map((u) => u.unit),
        openedDoors: openedDoorKeys,
      });
      const path = range.get(`${dest.x},${dest.y}`)?.path;
      if (path && path.length > 1) {
        await new Promise<void>((resolve) => {
          runMovementAnimation(path, enemy.unit.moveType, soundManager, (pos) => setActiveMovingUnit({ unitId: enemy.unit.id, pos }), () => {
            enemy.unit.position = { ...dest };
            setExtendedUnits([...phaseUnits]);
            setActiveMovingUnit(null);
            resolve();
          });
        });
      } else {
        enemy.unit.position = { ...dest };
        setExtendedUnits([...phaseUnits]);
      }
    };
    const scrollToTile = (pos: Position) => {
      document.querySelector(`[data-testid="tile-${pos.x}-${pos.y}"]`)?.scrollIntoView({ behavior: fastPlayback ? 'auto' : 'smooth', block: 'center', inline: 'center' });
    };
    let phaseUnits = healUnitsOnTerrain(
      extendedUnits.map((entry) => ({ ...entry, unit: { ...entry.unit }, stats: { ...entry.stats } })),
      'enemy', mapData, defaultTerrainRegistry,
    );
    const activeEnemies = phaseUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);
    const statsMap = new Map(phaseUnits.map((u) => [u.unit.id, u.stats]));
    const weaponsMap = new Map(phaseUnits.map((u) => [u.unit.id, u.weapon]));
    let nextVillageStates: Record<string, VillageState> = { ...villageStates };

    const logs: string[] = [`🔴 ENEMY PHASE (Turn ${turnState.turnNumber})`];

    for (const enemy of activeEnemies) {
      const openingMove = enemy.openingMove;
      const isOpeningMoveActive = openingMove && (turnState.turnNumber === (openingMove.turn ?? 1));
      let decision: AIDecision;

      if (isOpeningMoveActive) {
        const target = openingMove.targetPosition;
        if (enemy.unit.position.x !== target.x || enemy.unit.position.y !== target.y) {
          decision = { type: 'move_only', movePosition: target };
        } else {
          decision = { type: 'wait' };
        }
        if (openingMove.nextAiRole) {
          enemy.aiRole = openingMove.nextAiRole;
        }
      } else {
        decision = evaluateAITurn(enemy.unit, enemy.aiRole ?? 'pursue', {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: phaseUnits.map((u) => u.unit),
        unitStatsMap: statsMap,
        unitWeaponsMap: weaponsMap,
        unitSkillsMap: new Map(phaseUnits.map((u) => [u.unit.id, skillIdsOf(u)])),
        unitLevelsMap: new Map(phaseUnits.map((u) => [u.unit.id, u.level])),
        sphereHolders: {
          light: new Set(phaseUnits.filter((u) => u.inventory.some((i) => i.itemId === 'lightsphere')).map((u) => u.unit.id)),
          dark: new Set(phaseUnits.filter((u) => u.inventory.some((i) => i.itemId === 'darksphere')).map((u) => u.unit.id)),
        },
        villageTargets: currentChapter.villages?.filter(
          (v) => (nextVillageStates[v.id] ?? 'intact') === 'intact',
        ).map((v) => v.position),
        chestTargets: (currentChapter.chests ?? [])
          .filter((c) => chestStates[c.id] !== 'opened')
          .map((c) => c.position),
        patrolTargets: enemy.patrolPoints,
        turnNumber: turnState.turnNumber,
        openedDoors: openedDoorKeys,
        unitInventoriesMap: new Map(phaseUnits.map((u) => [u.unit.id, u.inventory])),
        itemsCatalog: ITEM_BY_ID,
        });
      }

      if (decision.type === 'attack') {
        if (decision.weapon.id !== enemy.weapon?.id) {
          logs.push(`  ⚔️ ${enemy.unit.name} switches to ${decision.weapon.name}!`);
          enemy.weapon = decision.weapon;
          const me = phaseUnits.find((u) => u.unit.id === enemy.unit.id);
          if (me) me.weapon = decision.weapon;
          weaponsMap.set(enemy.unit.id, decision.weapon);
        }
        scrollToTile(enemy.unit.position);
        await animateEnemyMove(enemy, decision.movePosition);
        await sleep(200);
        logs.push(`🔴 ${enemy.unit.name} moves to (${decision.movePosition.x},${decision.movePosition.y}) and attacks ${decision.targetUnit.name}!`);

        const targetEntry = phaseUnits.find((u) => u.unit.id === decision.targetUnit.id);
        const hpBefore = { attacker: enemy.stats.hp, defender: targetEntry?.stats.hp ?? 0 };
        const result = executeCombat(decision.forecast, defaultRNG);
        // PLAN item 133: executeCombat is pure — write the post-combat HP
        // from the result back into the phase units (previously the HP
        // arrived via mutation of the shared forecast stats objects).
        const attackerEntry = phaseUnits.find((u) => u.unit.id === enemy.unit.id);
        if (attackerEntry) attackerEntry.stats.hp = result.forecast.attacker.stats.hp;
        if (targetEntry) targetEntry.stats.hp = result.forecast.defender.stats.hp;
        if (targetEntry) {
          const popup = buildCombatPopup(++popupIdRef.current, enemy, targetEntry, hpBefore, result);
          setPopupQueue((queue) => [...queue, popup]);
          // PLAN item 140: hold the phase on this combat's popup until it
          // is dismissed (click or the 2.5s auto-dismiss), FE-style.
          while (!fastPlayback && popupQueueRef.current.some((entry) => entry.id === popup.id)) {
            await sleep(100);
          }
          await sleep(150);
        }
        // PLAN item 135: Combat consequences handled by the stateless simulation layer
        const resolution = resolveCombatConsequences({
          units: phaseUnits,
          result,
          rng: defaultRNG,
          itemById: ITEM_BY_ID,
          itemsList: itemsJson.items as any,
          chapter: currentChapter,
          dialogues: currentDialogues as any,
          gold,
          villageStates: nextVillageStates,
        });

        for (const cue of resolution.soundCues) {
          if (cue.type === 'weapon') soundManager.playWeaponHit(cue.weaponType ?? 'axe');
          else soundManager.playSfx(cue.type);
        }

        logs.push(...resolution.logs);
        if (resolution.defeatEvents.length > 0) {
          logs.push(...eventLogLines(resolution.defeatEvents, '  '));
          queueOverflows(resolution.defeatEvents);
        }
        nextVillageStates = resolution.villageStates;
        phaseUnits = resolution.units;
        for (const entry of phaseUnits) statsMap.set(entry.unit.id, entry.stats);
        for (const entry of phaseUnits) weaponsMap.set(entry.unit.id, entry.weapon);
      } else if (decision.type === 'staff') {
        scrollToTile(enemy.unit.position);
        await animateEnemyMove(enemy, decision.movePosition);
        await sleep(200);
        logs.push(`🟢 ${enemy.unit.name} moves to (${decision.movePosition.x},${decision.movePosition.y}) and casts ${decision.staff.name} on ${decision.targetUnit.name}!`);
        soundManager.playSfx('heal');

        const staffResult = applyStaffUse(
          phaseUnits,
          enemy.unit.id,
          decision.targetUnit.id,
          decision.staff.id,
          ITEM_BY_ID,
          defaultRNG,
        );
        if (staffResult) {
          phaseUnits = staffResult.units;
          logs.push(...staffResult.messages);
          for (const entry of phaseUnits) statsMap.set(entry.unit.id, entry.stats);
        } else {
          const targetEntry = phaseUnits.find((u) => u.unit.id === decision.targetUnit.id);
          if (targetEntry) {
            targetEntry.stats.hp = Math.min(targetEntry.stats.maxHp, targetEntry.stats.hp + decision.healAmount);
            logs.push(`  ✨ ${targetEntry.unit.name} recovered ${decision.healAmount} HP!`);
          }
        }
        await sleep(200);
      } else if (decision.type === 'move_only') {
        scrollToTile(enemy.unit.position);
        await animateEnemyMove(enemy, decision.movePosition);
        await sleep(100);
        logs.push(`🔴 ${enemy.unit.name} advances towards (${decision.movePosition.x},${decision.movePosition.y}).`);
      } else {
        logs.push(`🔴 ${enemy.unit.name} holds position on guard.`);
      }

      if (decision.type === 'move_only' || decision.type === 'attack' || decision.type === 'staff') {
        const raid = pillageVillage({ units: phaseUnits, gold, villageStates: nextVillageStates }, enemy.unit.id, currentChapter);
        nextVillageStates = { ...raid.state.villageStates };
        logs.push(...eventLogLines(raid.events));
      }

      // PLAN item 110: a thief standing on a chest loots it.
      if (enemy.aiRole === 'thief' && !enemy.unit.isDead) {
        const chest = (currentChapter.chests ?? []).find((c) =>
          chestStates[c.id] !== 'opened'
          && c.position.x === enemy.unit.position.x && c.position.y === enemy.unit.position.y);
        if (chest) {
          setChestStates((prev) => ({ ...prev, [chest.id]: 'opened' }));
          logs.push(`  💰 ${enemy.unit.name} loots the chest!`);
        }
      }

      enemy.unit.hasActed = true;
      setExtendedUnits([...phaseUnits]);
      if (evaluateChapterOutcome(phaseUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId, { turnNumber: turnState.turnNumber }) !== 'ongoing') break;
    }

    setVillageStates(nextVillageStates);

    // PLAN item 94: reinforcements arrive at the end of the enemy phase
    // and do not act on the turn they appear.
    let nextSpawnedReinforcements = spawnedReinforcements;
    for (const group of dueReinforcements(currentChapter, turnState.turnNumber, spawnedReinforcements)) {
      const spawned = spawnReinforcements(phaseUnits, group, mapData, defaultTerrainRegistry);
      phaseUnits = spawned.units;
      nextSpawnedReinforcements = [...nextSpawnedReinforcements, group.id];
      if (spawned.spawned.length > 0) {
        logs.push(`⚔️ Enemy reinforcements have arrived! (${spawned.spawned.length} units)`);
      }
    }
    if (nextSpawnedReinforcements !== spawnedReinforcements) {
      setSpawnedReinforcements(nextSpawnedReinforcements);
    }

    setCombatLog((prev) => [...logs, ...prev].slice(0, 30));

    // Kiểm tra kết quả chương sau lượt địch
    const outcome = evaluateChapterOutcome(phaseUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId, { turnNumber: turnState.turnNumber });
    if (outcome !== 'ongoing') setChapterOutcome(outcome);

    // Chuyển lại về Player Phase
    if (outcome === 'ongoing') {
      soundManager.playSfx('player_phase');
      turnManager.switchPhase('player_phase');
      phaseUnits = healUnitsOnTerrain(phaseUnits, 'player', mapData, defaultTerrainRegistry);
      // PLAN items 121/124: tick transformation/imitation timers.
      const ticked = tickSpecialStates(phaseUnits, ITEM_BY_ID);
      phaseUnits = ticked.units;
      for (const event of ticked.events) {
        logs.push(event.kind === 'transform_end'
          ? `🐉 ${event.unitName} returns to human form.`
          : `🎭 ${event.unitName}'s imitation ends.`);
      }
      phaseUnits = phaseUnits.map((u) => u.unit.faction === 'player' && !u.unit.isDead ? { ...u, unit: { ...u.unit, hasActed: false } } : u);
      // PLAN item 94: warn about reinforcements arriving this turn.
      const arriving = announcedReinforcements(currentChapter, turnState.turnNumber + 1, nextSpawnedReinforcements);
      if (arriving.length > 0) {
        showNotice('⚠️ Enemy reinforcements will arrive at the end of this turn!');
        setCombatLog((prev) => ['⚠️ Enemy reinforcements will arrive at the end of this turn!', ...prev]);
      }
    }
    turnManager.replaceUnits(phaseUnits.map(({ unit }) => unit));
    setExtendedUnits(phaseUnits);
    setIsProcessingAI(false);
    syncState();
  };

  const applyLoadedSnapshot = (data: SaveGameData) => {
    setPopupQueue([]);
    if (data.chapterId !== currentChapterId) {
      setCurrentChapterId(data.chapterId);
    }
    setExtendedUnits(data.extendedUnits);
    setReserveUnits(data.reserveUnits ?? []);
    setConvoy(data.convoy ?? []);
    setShowPreparation(false);
    turnManager.restoreState(data.turnState, data.extendedUnits.map((item) => item.unit));
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
    setMoveCommitted(false);
    setMoveOrigin(null);
    setActiveVillageDialogue(null);
    setPendingMovePos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    setPinnedUnitId(null);
    setHoveredUnitSummary(null);
    syncState();
  };

  const handleSave = async (slotId: string = 'slot1') => {
    if (pendingMovePos || combatForecast || isProcessingAI || turnState.activePhase !== 'player_phase') {
      showNotice('Please complete your current action before saving.');
      return;
    }
    const ok = await saveGameState({
      chapterId: currentChapterId,
      turnState: { turnNumber: turnState.turnNumber, activePhase: turnState.activePhase },
      extendedUnits,
      reserveUnits,
      convoy,
      rngSeed: defaultRNG.getSeed(),
      chapterOutcome,
      showStoryIntro,
      combatLog,
      gold,
      villageStates,
      chestStates,
      doorStates,
      spawnedReinforcements,
      difficulty,
    }, slotId);
    if (ok) {
      showNotice(`✓ Game progress saved to ${slotId.toUpperCase()} successfully!`);
    } else {
      showNotice('Failed to save progress.');
    }
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

  const handleRestartChapter = () => {
    setPopupQueue([]);
    loadChapter(currentChapterId);
  };

  const handleEndTurn = () => {
    soundManager.playSfx('enemy_phase');
    turnManager.switchPhase('enemy_phase');
    syncState();
  };

  useEffect(() => {
    if (turnState.activePhase !== 'enemy_phase' || chapterOutcome !== 'ongoing') return;
    const timer = window.setTimeout(runAITurn, 400);
    return () => window.clearTimeout(timer);
  }, [turnState.activePhase, chapterOutcome]);

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

  return (
    <div>
      {/* Map fills the whole viewport; this is the only scroll container */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'auto', backgroundColor: '#111' }}>
        {viewMode === '3d' ? (
          <div style={{ width: '100%', height: '100%' }}>
            <ThreeScene
              mapData={mapData}
              units={extendedUnits}
              reachableKeys={reachableKeys}
              dangerZoneKeys={combinedDangerZoneKeys}
              selectedPos={pendingMovePos || (selectedExtUnit ? selectedExtUnit.unit.position : null)}
              attackTargetKeys={attackTargetKeys}
              onTileClick={handleTileClick}
              onTileHover={handleTileHover}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', width: 'max-content', minWidth: '100%', minHeight: '100%', boxSizing: 'border-box', padding: `${HUD_CLEAR}px ${HUD_CLEAR}px ${HUD_CLEAR}px 8px` }}>
            <Grid2D
              board={boardView}
              movementPath={moveCommitted ? null : plannedPath}
              pendingDestination={pendingMovePos}
              activeMovingUnit={activeMovingUnit}
              getUnitDisplay={getUnitDisplay}
              onTileClick={handleTileClick}
              onTileHover={handleTileHover}
              onTileInspect={(x, y) => setInspectedTile({ x, y })}
            />
          </div>
        )}
      </div>

      <BattleSettingsMenu
        forceCloseKey={[currentChapterId, showPreparation, showStoryIntro, activeVillageDialogue !== null, chapterOutcome, activeScreen].join('|')}
        chapterId={currentChapterId}
        chapterName={currentChapter.name}
        objectiveText={chapterObjective.description ?? ''}
        gold={gold}
        turnNumber={turnState.turnNumber}
        activePhase={turnState.activePhase}
        viewMode={viewMode}
        isMuted={isMuted}
        volume={volume}
        onVolume={handleVolume}
        onChapterChange={loadChapter}
        onTitle={() => setActiveScreen('title')}
        onWorldMap={() => setActiveScreen('world_map')}
        onSaveFiles={() => {
          setSaveSlotsMode('load');
          setActiveScreen('save_slots');
        }}
        onSave={() => handleSave()}
        onLoad={() => handleLoad()}
        onViewMode={setViewMode}
        autoEndTurn={autoEndTurn}
        onAutoEndTurn={setAutoEndTurnState}
        onToggleMute={handleToggleMute}
        leading={turnState.activePhase === 'player_phase' && (
          <button
            onClick={handleEndTurn}
            disabled={isProcessingAI || pendingMovePos !== null || combatForecast !== null || activeMovingUnit !== null}
            style={{
              height: `${HUD_SIZE}px`, padding: '0 20px', backgroundColor: '#1d4ed8', border: '1px solid #60a5fa',
              borderRadius: '8px', color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              opacity: (isProcessingAI || pendingMovePos !== null || combatForecast !== null || activeMovingUnit !== null) ? 0.5 : 1,
            }}
          >
            End Turn
          </button>
        )}
      />

      {combatForecast && selectedExtUnit && selectedTarget && !activeMovingUnit && (
        <CombatForecastWindow
          forecast={combatForecast}
          attacker={selectedExtUnit}
          defender={selectedTarget}
          onConfirm={handleConfirmAttack}
          onCancel={() => {
            // PLAN items 158/163: cancelling the forecast returns to the
            // weapon picker when several weapons can reach the target (to
            // compare another weapon), otherwise back to the action menu
            // where Cancel Move is available again.
            setCombatForecast(null);
            if (selectedTarget && usableWeaponsForTarget(selectedTarget).length > 1) {
              setWeaponPickerOpen(true);
            } else {
              setSelectedTarget(null);
            }
          }}
        />
      )}

      <ActionMenuWindow
        anchorTile={pendingMovePos ?? selectedExtUnit?.unit.position ?? null}
        mountLabel={
          selectedExtUnit && !pendingMovePos && !combatForecast && !activeMovingUnit
            && (selectedExtUnit.unit.mountedClassId || getClassDefinition(selectedExtUnit.unit.classId)?.mountKind)
            ? (selectedExtUnit.unit.mountedClassId ? 'Mount' : 'Dismount')
            : null
        }
        actions={pendingMovePos && moveCommitted && !combatForecast && !attackTargeting && !tradeTargeting && !activeMovingUnit && !weaponPickerOpen && !tradeState && !storageOpen && !shopOpen && !arenaOpen && !staffTargeting && !warpTargeting ? {
          unitName: selectedExtUnit?.unit.name,
          canSeize: chapterObjective.type === 'seize' && selectedExtUnit?.unit.id === currentChapter.lordUnitId
            && pendingMovePos.x === chapterObjective.seizeTargetTile?.x
            && pendingMovePos.y === chapterObjective.seizeTargetTile?.y,
          talkTargetName: talkTarget?.unit.name ?? null,
          canUseVulnerary: Boolean(selectedExtUnit && selectedExtUnit.stats.hp < selectedExtUnit.stats.maxHp
            && selectedExtUnit.inventory.some((i) => i.itemId === 'vulnerary' && i.uses > 0)),
          promotions: selectedExtUnit && selectedExtUnit.level >= 10
            ? (getClassDefinition(selectedExtUnit.unit.classId)?.promotions ?? []).map((id) => ({ id, name: getClassDefinition(id)?.name ?? id })) : [],
          villageName: currentVillageAtPendingPos?.name ?? null,
          hasAttackTargets: attackableTargets.length > 0,
          targetPositions: attackableTargets.map((t) => t.unit.position),
          equipOptions: selectedExtUnit
            ? getUsableWeapons(selectedExtUnit, ITEM_BY_ID)
              .filter((weapon) => !weapon.equipped)
              .map((weapon) => ({ itemId: weapon.itemId, name: weapon.definition.name }))
            : [],
          canTrade: tradePartners.length > 0,
          canCancelMove: !selectedExtUnit?.unit.hasTraded && !selectedExtUnit?.unit.hasStored,
          canStorage,
          canShop,
          canOpenChest: Boolean(selectedExtUnit && currentChestAtPendingPos && canOpenChest(selectedExtUnit, currentChapter)),
          canOpenDoor: Boolean(selectedExtUnit && doorAtPendingPos && canOpenDoor(selectedExtUnit)),
          canArena,
          canEscape: chapterObjective.type === 'escape' && Boolean(pendingMovePos
            && (chapterObjective.escapeTiles ?? []).some((t) => t.x === pendingMovePos.x && t.y === pendingMovePos.y)),
          canTransform: Boolean(selectedExtUnit && canTransform(selectedExtUnit)),
          danceTargetName: danceTarget?.unit.name ?? null,
          imitateTargetName: imitateTarget?.unit.name ?? null,
          staffOptions: selectedExtUnit
            ? getUsableStaves(selectedExtUnit, ITEM_BY_ID)
              .filter((staff) => (isHealStaff(staff) || isWarpStaff(staff))
                && getStaffTargets(extendedUnits, selectedExtUnit, staff, pendingMovePos).length > 0)
              .map((staff) => ({ itemId: staff.id, name: staff.name }))
            : [],
        } : null}
        onToggleMount={handleToggleMounted}
        onAttack={handleAttack}
        onEquip={handleEquip}
        onTrade={handleTrade}
        onStorage={() => {
          storageChangedRef.current = false;
          setStorageOpen(true);
        }}
        onShop={() => {
          shopChangedRef.current = false;
          setShopOpen(true);
        }}
        onOpenChest={handleOpenChest}
        onOpenDoor={handleOpenDoor}
        onArena={() => setArenaOpen(true)}
        onStaff={handleStaff}
        onSeize={handleSeize}
        onEscape={handleEscape}
        onTransform={handleTransform}
        onDance={handleDance}
        onImitate={handleImitate}
        onTalk={handleTalk}
        onUseVulnerary={handleUseVulnerary}
        onPromote={handlePromote}
        onVisitVillage={handleVisitVillage}
        onWait={handleConfirmWait}
        onCancelMove={handleCancelMove}
      />

      {weaponPickerOpen && selectedExtUnit && pendingMovePos && (
        <WeaponPickerWindow
          anchorTile={pendingMovePos}
          unit={selectedExtUnit.unit}
          weapons={selectedTarget ? usableWeaponsForTarget(selectedTarget) : getAttackWeapons(selectedExtUnit, ITEM_BY_ID)}
          onPick={handlePickWeapon}
          onCancel={() => { setWeaponPickerOpen(false); setSelectedTarget(null); }}
        />
      )}

      {pendingOverflows[0] && (() => {
        const pending = pendingOverflows[0];
        const entry = extendedUnits.find((u) => u.unit.id === pending.unitId);
        const newDef = ITEM_BY_ID.get(pending.itemId);
        if (!entry || !newDef) return null;
        const kind = slotKind(newDef);
        const choices = entry.inventory.flatMap((item) => {
          const def = ITEM_BY_ID.get(item.itemId);
          return def && slotKind(def) === kind
            ? [{ itemId: item.itemId, name: def.name, uses: item.uses, maxUses: def.maxUses, type: def.type }]
            : [];
        });
        return (
          <OverflowWindow
            unitName={entry.unit.name}
            newItemName={pending.itemName}
            choices={choices}
            onDiscard={(itemId) => resolvePendingOverflow(itemId)}
            onDiscardNew={() => resolvePendingOverflow(null)}
            onSendToConvoy={convoy.length < CONVOY_SLOTS ? () => resolvePendingOverflow('convoy') : undefined}
          />
        );
      })()}

      {/* PLAN item 131: centered reward popup (item icon / recruit avatar) */}
      {rewardPopups.length > 0 && (
        <RewardPopup
          data={rewardPopups[0]!}
          onClose={() => setRewardPopups((prev) => prev.slice(1))}
        />
      )}

      {tradeState && selectedExtUnit && pendingMovePos && (() => {
        const partner = tradeState.partnerId
          ? extendedUnits.find((u) => u.unit.id === tradeState.partnerId)
          : undefined;
        return (
          <TradeWindow
            left={tradeSide(selectedExtUnit)}
            right={partner ? tradeSide(partner) : null}
            partnerChoices={tradePartners.map((p) => ({ unitId: p.unit.id, unitName: p.unit.name, avatarUrl: p.avatarUrl }))}
            onPickPartner={(unitId) => { tradeChangedRef.current = false; setTradeState({ partnerId: unitId }); }}
            onSwap={handleTradeSwap}
            onMove={handleTradeMove}
            onClose={handleTradeClose}
          />
        );
      })()}

      {storageOpen && selectedExtUnit && (
        <ConvoyWindow
          unitName={selectedExtUnit.unit.name}
          unitAvatarUrl={selectedExtUnit.avatarUrl}
          unitItems={tradeSide(selectedExtUnit).items}
          convoyItems={convoyRows}
          convoyCount={convoy.length}
          convoyCapacity={CONVOY_SLOTS}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
          onClose={handleStorageClose}
        />
      )}

      {shopOpen && selectedExtUnit && (
        <ShopWindow
          unitName={selectedExtUnit.unit.name}
          gold={gold}
          stock={getShopStock(ITEM_BY_ID).map((def) => ({
            itemId: def.id,
            name: def.name,
            type: def.type,
            price: def.price ?? 0,
            maxUses: def.maxUses,
            canBuy: gold >= (def.price ?? 0)
              && (hasRoomFor(selectedExtUnit, def.id, ITEM_BY_ID) || convoy.length < CONVOY_SLOTS),
          }))}
          sellItems={selectedExtUnit.inventory.flatMap((item) => {
            const def = ITEM_BY_ID.get(item.itemId);
            return def ? [{
              itemId: item.itemId,
              name: def.name,
              type: def.type,
              uses: item.uses,
              maxUses: def.maxUses,
              equipped: selectedExtUnit.weapon?.id === item.itemId,
              sellValue: sellValue(def, item.uses),
            }] : [];
          })}
          onBuy={handleBuy}
          onSell={handleSell}
          onClose={handleShopClose}
        />
      )}

      {arenaOpen && selectedExtUnit && (
        <ArenaWindow
          unitName={selectedExtUnit.unit.name}
          gold={gold}
          tier={arenaTier}
          opponent={arenaOpponent}
          outcome={arenaOutcome}
          onSelectTier={handleArenaTier}
          onFight={handleArenaFight}
          onFightAgain={handleArenaAgain}
          onLeave={handleArenaLeave}
        />
      )}

      {prepConvoyUnitId && (() => {
        const entry = [...extendedUnits, ...reserveUnits].find((u) => u.unit.id === prepConvoyUnitId);
        if (!entry) return null;
        return (
          <ConvoyWindow
            unitName={entry.unit.name}
            unitAvatarUrl={entry.avatarUrl}
            unitItems={tradeSide(entry).items}
            convoyItems={convoyRows}
            convoyCount={convoy.length}
            convoyCapacity={CONVOY_SLOTS}
            onDeposit={handlePrepDeposit}
            onWithdraw={handlePrepWithdraw}
            onClose={() => setPrepConvoyUnitId(null)}
          />
        );
      })()}

      {prepTrade && (() => {
        const all = [...extendedUnits, ...reserveUnits];
        const left = all.find((u) => u.unit.id === prepTrade.unitId);
        if (!left) return null;
        const partner = prepTrade.partnerId ? all.find((u) => u.unit.id === prepTrade.partnerId) : undefined;
        const partners = all.filter((u) => u.unit.faction === 'player' && !u.unit.isDead && u.unit.id !== left.unit.id);
        return (
          <TradeWindow
            left={tradeSide(left)}
            right={partner ? tradeSide(partner) : null}
            partnerChoices={partners.map((p) => ({ unitId: p.unit.id, unitName: p.unit.name, avatarUrl: p.avatarUrl }))}
            onPickPartner={(unitId) => setPrepTrade({ unitId: left.unit.id, partnerId: unitId })}
            onSwap={(leftIndex, rightIndex) => {
              if (prepTrade.partnerId) applyPrepTrade((units) => tradeSwap(units, left.unit.id, prepTrade.partnerId!, leftIndex, rightIndex, ITEM_BY_ID));
            }}
            onMove={(fromSide, index) => {
              if (!prepTrade.partnerId) return;
              const fromId = fromSide === 'left' ? left.unit.id : prepTrade.partnerId;
              const toId = fromSide === 'left' ? prepTrade.partnerId : left.unit.id;
              applyPrepTrade((units) => tradeMove(units, fromId, toId, index, ITEM_BY_ID));
            }}
            onClose={() => setPrepTrade(null)}
          />
        );
      })()}

      <CombatResultPopup entry={popupQueue[0] ?? null} onDismiss={() => setPopupQueue((queue) => queue.slice(1))} />
      {activeSummaryUnit && activeSummaryTile && !combatForecast && !inspectedUnit && (
        <UnitHoverWindow
          unit={activeSummaryUnit}
          tile={activeSummaryTile}
          hasActionBar={Boolean(pendingMovePos && moveCommitted)}
          onInspect={() => setInspectedTile(activeSummaryTile)}
          onMouseEnter={() => {
            isHoveringSummaryRef.current = true;
            if (summaryGraceTimerRef.current) {
              clearTimeout(summaryGraceTimerRef.current);
              summaryGraceTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isHoveringSummaryRef.current = false;
            summaryGraceTimerRef.current = window.setTimeout(() => {
              summaryGraceTimerRef.current = null;
              if (!isHoveringSummaryRef.current) setHoveredUnitSummary(null);
            }, 300);
          }}
        />
      )}
      {!activeSummaryUnit && hoveredTile && hoveredTerrainId && !combatForecast && !inspectedUnit && (
        <TerrainInfoWindow terrainId={hoveredTerrainId} tile={hoveredTile} />
      )}
      {inspectedUnit && inspectedTile && (
        <UnitInspectorWindow
          unit={inspectedUnit}
          allUnits={extendedUnits}
          terrainId={mapData.grid[inspectedTile.y]?.[inspectedTile.x] ?? 'plains'}
          tile={inspectedTile}
          onClose={() => setInspectedTile(null)}
        />
      )}

      {/* Status Notification Toast */}
      {statusNotice && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2e7d32', color: '#fff', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 9999 }}>
          {statusNotice}
        </div>
      )}

      {showPreparation && (
        <BattlePreparationModal
          chapterName={currentChapter.name}
          lordName={lordName}
          lordUnitId={currentChapter.lordUnitId}
          units={[...extendedUnits, ...reserveUnits].filter(({ unit }) => unit.faction === 'player')}
          deployedIds={new Set(extendedUnits.map(({ unit }) => unit.id))}
          deployedCount={extendedUnits.filter(({ unit }) => unit.faction === 'player' && !unit.isDead).length}
          deploymentLimit={currentChapter.units.filter(({ unit }) => unit.faction === 'player').length}
          onToggle={toggleDeployment}
          onStart={() => setShowPreparation(false)}
          onOpenConvoy={(unitId) => setPrepConvoyUnitId(unitId)}
          onTrade={(unitId) => setPrepTrade({ unitId, partnerId: null })}
          reclassAvailable={reclassAvailable}
          onReclass={handlePrepReclass}
        />
      )}

      {/* Opening Story Dialogue Cutscene Modal (Fire Emblem Visual Novel Style) */}
      {showStoryIntro && !showPreparation && activeScreen === 'none' && (
        <DialogueBox
          dialogues={currentDialogues.opening}
          title={`📜 ${currentChapter.name}`}
          themeColor="blue"
          actionButtonText="⚔️ Start Battle"
          summaryBox={
            <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', fontSize: '13px' }}>
              <strong style={{ color: '#fbbf24' }}>Victory Objective:</strong> {chapterObjective.description}.
              <br />
              <span style={{ color: '#ef4444' }}>Defeat if {lordName} falls in battle.</span>
            </div>
          }
          onConfirm={() => setShowStoryIntro(false)}
          onSkip={() => setShowStoryIntro(false)}
        />
      )}

      {/* Village Dialogue Modal (Fire Emblem Visual Novel Style) */}
      {activeVillageDialogue && (
        <DialogueBox
          dialogues={activeVillageDialogue.lines}
          title={`🏡 ${activeVillageDialogue.villageName.toUpperCase()}`}
          themeColor="amber"
          actionButtonText="Continue ➔"
          summaryBox={
            <div style={{ padding: '10px 14px', backgroundColor: '#451a03', border: '1px solid #d97706', borderRadius: '8px', color: '#fef08a', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>
              🎁 {activeVillageDialogue.rewardText}
            </div>
          }
          onConfirm={() => setActiveVillageDialogue(null)}
          onSkip={() => setActiveVillageDialogue(null)}
        />
      )}

      {/* Victory Modal with Ending Story Cutscene (Fire Emblem Visual Novel Style) */}
      {chapterOutcome === 'victory' && (
        <DialogueBox
          dialogues={currentDialogues.ending}
          title="🏆 STAGE CLEAR!"
          themeColor="green"
          actionButtonText={
            currentChapterId === 'chapter_01'
              ? '⚔️ Advance to Chapter 2: The Pirates of Galder ➔'
              : currentChapterId === 'chapter_02'
              ? '⚔️ Advance to Chapter 3: The Devil Mountain ➔'
              : '🔄 Continue / Restart Chapter ➔'
          }
          onConfirm={() => {
            if (currentChapterId === 'chapter_01') {
              loadChapter('chapter_02', [...extendedUnits, ...reserveUnits]);
            } else if (currentChapterId === 'chapter_02') {
              loadChapter('chapter_03', [...extendedUnits, ...reserveUnits]);
            } else {
              handleRestartChapter();
            }
          }}
        />
      )}

      {/* Defeat Modal */}
      {chapterOutcome === 'defeat' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#7f1d1d', border: '2px solid #ef4444', borderRadius: '12px', padding: '28px', maxWidth: '460px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#fca5a5', fontSize: '24px' }}>💀 GAME OVER</h2>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#fee2e2', marginBottom: '20px' }}>
              Prince Marth has fallen in battle...<br />The kingdom of Altea has lost all hope.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => handleLoad()} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                📂 Load Last Save
              </button>
              <button onClick={handleRestartChapter} style={{ padding: '10px 20px', backgroundColor: '#475569', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                🔄 Restart Chapter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Screen Overlay */}
      {activeScreen === 'title' && (
        <TitleScreen
          onStartNewGame={() => setActiveScreen('book_select')}
          onOpenSaveSlots={() => {
            setSaveSlotsMode('load');
            setActiveScreen('save_slots');
          }}
          onOpenWorldMap={() => setActiveScreen('world_map')}
          onContinueGame={() => setActiveScreen('none')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />
      )}

      {/* Book Select Modal */}
      {activeScreen === 'book_select' && (
        <BookSelectModal
          onSelectBook={(bookId) => {
            if (bookId === 'book1') {
              loadChapter('chapter_01');
              setActiveScreen('world_map');
            } else {
              alert('Book 2: The Mystery of the Emblem (Hardin Chronicles) is currently in development!');
            }
          }}
          onClose={() => setActiveScreen('none')}
        />
      )}

      {/* Save Slots Modal */}
      {activeScreen === 'save_slots' && (
        <SaveSlotsModal
          mode={saveSlotsMode}
          onSelectLoad={(data) => {
            applyLoadedSnapshot(data);
            setActiveScreen('none');
          }}
          onConfirmSave={async (slotId) => {
            await handleSave(slotId);
            setActiveScreen('none');
          }}
          onNewGameAtSlot={async (slotId) => {
            loadChapter('chapter_01');
            const snapshot = buildNewGameSnapshot('chapter_01', defaultRNG.getSeed());
            if (!snapshot) {
              showNotice('Failed to start a new game.');
            } else {
              const ok = await saveGameState(snapshot, slotId);
              if (ok) {
                showNotice(`✓ New game started and saved to ${slotId.toUpperCase()}!`);
              } else {
                showNotice('Failed to save the new game.');
              }
            }
            setActiveScreen('world_map');
          }}
          onClose={() => setActiveScreen('none')}
        />
      )}

      {/* World Map Modal */}
      {activeScreen === 'world_map' && (
        <WorldMapModal
          currentChapterId={currentChapterId}
          onSelectChapter={(chapterId) => {
            loadChapter(chapterId);
            setActiveScreen('none');
          }}
          onDeployBattle={() => setActiveScreen('none')}
          onClose={() => setActiveScreen('none')}
        />
      )}
    </div>
  );
};

export default App;
