import React, { useState, useMemo, useEffect, useRef } from 'react';
import talysMapRaw from '../data/maps/chapter_01_talys.json';
import galderMapRaw from '../data/maps/chapter_02_galder.json';
import devilMountainMapRaw from '../data/maps/chapter_03_devil_mountain.json';
import testMapRaw from '../data/maps/test_map_01.json';
import ch01Dialogues from '../data/dialogues/chapter_01_dialogues.json';
import ch02Dialogues from '../data/dialogues/chapter_02_dialogues.json';
import ch03Dialogues from '../data/dialogues/chapter_03_dialogues.json';
import itemsJson from '../data/items.json';
import { defaultTerrainRegistry, healUnitsOnTerrain } from './core/grid/terrain';
import { calculateMovementRange } from './core/grid/pathfinding';
import { MapData, Position } from './core/grid/types';
import { TurnManager } from './core/turn/turnManager';
import { CombatForecast, type ItemDefinition } from './core/combat/types';
import { calculateCombatForecast, executeCombat, getManhattanDistance } from './core/combat/calculator';
import { defaultRNG } from './core/combat/rng';
import { evaluateAITurn } from './core/ai/decision';
import { ThreeScene } from './renderer/ThreeScene';
import { Grid2D, type UnitDisplay } from './renderer/Grid2D';
import { runMovementAnimation, type ActiveMovingUnit } from './renderer/movementAnimation';
import { buildBoardView } from './core/grid/boardView';
import {
  bossStartEvent,
  pillageVillage,
  recruit,
  resolveDefeat,
  seize,
  visitVillage,
  type ChapterState,
  type DialogueLine,
  type VillageState,
} from './core/chapter/events';
import { eventLogLines, villageRewardText } from './ui/eventLog';
import { evaluateChapterOutcome } from './core/chapter/types';
import { carryUnitsToChapter, placeDeployedUnits } from './core/chapter/transition';
import { saveGameState, loadGameState, buildNewGameSnapshot, type SaveGameData } from './storage/saveLoad';
import { chapters, chapter01Data, ExtendedUnitState } from './core/data/chapterData';
import { changeMountedState, getAttackRange, getClassDefinition, promoteWithMasterSeal, useVulnerary } from './core/class/classRules';
import { applyCombatExperience } from './core/progression/experience';
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
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [popupQueue, setPopupQueue] = useState<CombatPopupData[]>([]);
  const popupIdRef = useRef(0);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [gold, setGold] = useState<number>(0);
  const [villageStates, setVillageStates] = useState<Record<string, VillageState>>({});
  const [activeVillageDialogue, setActiveVillageDialogue] = useState<{
    villageName: string;
    lines: readonly DialogueLine[];
    rewardText: string;
  } | null>(null);

  // Màn hình tổng thể & Bản lưu
  const [activeScreen, setActiveScreen] = useState<'none' | 'title' | 'book_select' | 'save_slots' | 'world_map'>('title');
  const [saveSlotsMode, setSaveSlotsMode] = useState<'load' | 'save'>('load');

  const syncState = () => {
    setTurnState({ ...turnManager.getState() });
  };

  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
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
    const newUnits = carryoverUnits
      ? carryUnitsToChapter(carryoverUnits, targetChapter, participatingIds)
      : structuredClone(targetChapter.units);
    setExtendedUnits(newUnits);
    setReserveUnits([]);
    turnManager.restoreState({ turnNumber: 1, activePhase: 'player_phase' }, newUnits.map((u) => u.unit));
    setTurnState(turnManager.getState());
    setChapterOutcome('ongoing');
    setShowStoryIntro(true);
    setShowPreparation(chapterId === 'chapter_02' || chapterId === 'chapter_03');
    if (!carryoverUnits) setGold(0);
    setVillageStates({});
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

  // Vùng nguy hiểm của quân địch
  const dangerZoneKeys = useMemo(() => {
    const danger = new Set<string>();
    const enemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);

    for (const enemy of enemies) {
      const range = calculateMovementRange(enemy.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: extendedUnits.map((u) => u.unit),
      });

      const candidateTiles = enemy.aiRole === 'stationary'
        ? [enemy.unit.position]
        : Array.from(range.values(), ({ position }) => position);
      for (const tile of candidateTiles) {
        const { min: minR, max: maxR } = getAttackRange(enemy.unit, enemy.weapon);
        for (let dx = -maxR; dx <= maxR; dx++) {
          for (let dy = -maxR; dy <= maxR; dy++) {
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist >= minR && dist <= maxR) {
              const nx = tile.x + dx;
              const ny = tile.y + dy;
              if (nx >= 0 && nx < mapData.width && ny >= 0 && ny < mapData.height) {
                danger.add(`${nx},${ny}`);
              }
            }
          }
        }
      }
    }
    return danger;
  }, [extendedUnits]);

  // Danh sách các mục tiêu có thể tấn công từ vị trí hiện tại
  const attackableTargets = useMemo(() => {
    if (!selectedExtUnit || !pendingMovePos) return [];

    const enemies = extendedUnits.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);
    return enemies.filter((enemy) => {
      const dist = getManhattanDistance(pendingMovePos, enemy.unit.position);
      const range = getAttackRange(selectedExtUnit.unit, selectedExtUnit.weapon);
      return dist >= range.min && dist <= range.max;
    });
  }, [selectedExtUnit, pendingMovePos, extendedUnits]);

  const attackTargetKeys = useMemo(() => {
    return new Set(attackableTargets.map((t) => `${t.unit.position.x},${t.unit.position.y}`));
  }, [attackableTargets]);

  const boardView = buildBoardView({
    map: mapData,
    units: extendedUnits.map(({ unit }) => unit),
    reachableKeys,
    dangerZoneKeys,
    attackTargetKeys,
    selected: selectedUnit?.position ?? null,
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

  // Click vào ô trên bản đồ
  const handleTileClick = (x: number, y: number) => {
    if (animCleanupRef.current) {
      animCleanupRef.current();
      animCleanupRef.current = null;
    }
    if (turnState.activePhase !== 'player_phase' || isProcessingAI) {
      return;
    }

    const clickedExt = extendedUnits.find(
      (u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y
    );

    // Nếu đã di chuyển và đang chọn mục tiêu tấn công
    if (pendingMovePos && attackableTargets.length > 0 && clickedExt && clickedExt.unit.faction === 'enemy') {
      const isTargetValid = attackableTargets.some((t) => t.unit.id === clickedExt.unit.id);
      if (isTargetValid && selectedExtUnit) {
        soundManager.playSfx('cursor');
        setSelectedTarget(clickedExt);
        const dist = getManhattanDistance(pendingMovePos, clickedExt.unit.position);
        const attackerTerrain = mapData.grid[pendingMovePos.y]?.[pendingMovePos.x] ?? 'plains';
        const defenderTerrain = mapData.grid[clickedExt.unit.position.y]?.[clickedExt.unit.position.x] ?? 'plains';

        const forecast = calculateCombatForecast(
          selectedExtUnit.unit,
          selectedExtUnit.stats,
          selectedExtUnit.weapon,
          clickedExt.unit,
          clickedExt.stats,
          clickedExt.weapon,
          dist,
          defaultTerrainRegistry,
          attackerTerrain,
          defenderTerrain,
          extendedUnits.map((u) => u.unit)
        );
        setCombatForecast(forecast);
        return;
      }
    }

    // Nếu đã chọn 1 quân ta và click vào ô di chuyển trong phạm vi
    if (selectedExtUnit && reachableKeys.has(`${x},${y}`) && !activeMovingUnit) {
      const moveData = turnState.reachableTiles?.get(`${x},${y}`);
      const path = moveData?.path ?? [selectedExtUnit.unit.position, { x, y }];
      setPendingMovePos({ x, y });
      setPlannedPath(path);
      soundManager.playSfx('cursor');
      return;
    }

    // Chọn đơn vị quân ta chưa đi
    if (clickedExt && clickedExt.unit.faction === 'player' && !clickedExt.unit.hasActed && !pendingMovePos && !activeMovingUnit) {
      soundManager.playSfx('select');
      const range = calculateMovementRange(clickedExt.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: extendedUnits.map((u) => u.unit),
      });
      turnManager.selectUnit(clickedExt.unit.id, range);
      setPinnedUnitId(clickedExt.unit.id);
      setHoveredUnitSummary({ unitId: clickedExt.unit.id, tile: { x, y } });
      setPendingMovePos(null);
      setPlannedPath(null);
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
      return;
    }

    // Bỏ chọn hoặc chạm vào quân khác (địch hoặc đã đi)
    if (!pendingMovePos && !activeMovingUnit) {
      soundManager.playSfx('cancel');
      turnManager.cancelSelect();
      setPlannedPath(null);
      setSelectedTarget(null);
      setCombatForecast(null);
      if (clickedExt) {
        setPinnedUnitId(clickedExt.unit.id);
        setHoveredUnitSummary({ unitId: clickedExt.unit.id, tile: { x, y } });
      } else {
        setPinnedUnitId(null);
        setHoveredUnitSummary(null);
      }
      setHoveredTile({ x, y });
      syncState();
    }
  };

  // Chạy di chuyển có hoạt cảnh trước khi hoàn tất hành động
  const executeWithMove = (actionFn: () => void) => {
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
      setExtendedUnits([...extendedUnits]);
      actionFn();
      return;
    }
    animCleanupRef.current = runMovementAnimation(path, moveType, soundManager, (pos) => setActiveMovingUnit({ unitId, pos }), () => {
      animCleanupRef.current = null;
      turnManager.moveSelectedUnit(dest);
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
      for (const ev of result.events) {
        const atk = extendedUnits.find((u) => u.unit.id === ev.attackerId)?.unit.name || 'Unknown';
        const def = extendedUnits.find((u) => u.unit.id === ev.defenderId)?.unit.name || 'Unknown';
        if (!ev.isHit) {
          soundManager.playSfx('miss');
          logs.push(`${atk} attacked ${def} but MISSED!`);
        } else {
          if (ev.isCrit) soundManager.playSfx('crit');
          else if (ev.damageDealt === 0) soundManager.playSfx('nodamage');
          else soundManager.playWeaponHit(extendedUnits.find((u) => u.unit.id === ev.attackerId)?.weapon.type ?? 'sword');
          const critText = ev.isCrit ? ' [CRITICAL HIT!]' : '';
          logs.push(`${atk} hit ${def} for ${ev.damageDealt} damage!${critText} (${def} remaining HP: ${ev.defenderHpAfter})`);
        }
      }

      let updatedUnits: ExtendedUnitState[] = extendedUnits.map((item) => {
        if (item.unit.id === attacker.unit.id) return { ...item, stats: { ...forecast.attacker.stats }, unit: { ...item.unit, isDead: forecast.attacker.stats.hp <= 0 } };
        if (item.unit.id === defender.unit.id) return { ...item, stats: { ...forecast.defender.stats }, unit: { ...item.unit, isDead: forecast.defender.stats.hp <= 0 } };
        return item;
      });
      if (result.unitDefeatedId) {
        soundManager.playSfx('death');
        logs.push(`💀 ${updatedUnits.find((u) => u.unit.id === result.unitDefeatedId)?.unit.name} was defeated!`);
        const killerId = result.unitDefeatedId === attacker.unit.id ? defender.unit.id : attacker.unit.id;
        const defeat = resolveDefeat(chapterState(updatedUnits), result.unitDefeatedId, killerId, itemsJson.items, currentDialogues);
        logs.push(...eventLogLines(defeat.events));
        updatedUnits = [...defeat.state.units];
      }
      const experience = applyCombatExperience(updatedUnits, result, defaultRNG);
      updatedUnits = experience.entries;
      logs.push(...experience.messages);
      setCombatLog((prev) => [...logs, ...prev].slice(0, 20));
      turnManager.replaceUnits(updatedUnits.map((item) => item.unit));
      setExtendedUnits(updatedUnits);

      const outcome = evaluateChapterOutcome(updatedUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId);
      if (outcome !== 'ongoing') setChapterOutcome(outcome);

      turnManager.waitSelectedUnit();
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
      turnManager.waitSelectedUnit();
      setExtendedUnits(nextUnits);
      setCombatLog((prev) => [`${changed.unit.name} used ${item.name}: HP ${changed.stats.hp}/${changed.stats.maxHp}`, ...prev].slice(0, 20));
      syncState();
    });
  };

  const handlePromote = (targetClassId: string) => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const changed = promoteWithMasterSeal(selectedExtUnit, targetClassId);
      if (!changed) return;
      soundManager.playSfx('levelup');
      const nextUnits = extendedUnits.map((entry) => entry.unit.id === changed.unit.id ? changed : entry);
      turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
      turnManager.waitSelectedUnit();
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
    });
    turnManager.selectUnit(changed.unit.id, range);
    syncState();
  };

  const chapterState = (units: readonly ExtendedUnitState[] = extendedUnits): ChapterState => ({ units, gold, villageStates });

  const commitChapterState = (next: ChapterState) => {
    setExtendedUnits([...next.units]);
    setGold(next.gold);
    setVillageStates({ ...next.villageStates });
    turnManager.replaceUnits(next.units.map(({ unit }) => unit));
  };

  const handleSeize = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    executeWithMove(() => {
      const result = seize(chapterState(), selectedExtUnit.unit.id, currentChapter, itemsJson.items);
      if (!result.events.some(({ type }) => type === 'chapter_seized')) return;
      soundManager.playSfx('stage_clear');
      commitChapterState(result.state);
      setCombatLog((prev) => [...eventLogLines(result.events), ...prev]);
      turnManager.waitSelectedUnit();
      setChapterOutcome('victory');
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
      turnManager.waitSelectedUnit();
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
      turnManager.waitSelectedUnit();
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
    });
  };

  // Hủy bước di chuyển
  const handleCancelMove = () => {
    soundManager.playSfx('cancel');
    setPendingMovePos(null);
    setPlannedPath(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    setPinnedUnitId(null);
    setHoveredUnitSummary(null);
    turnManager.cancelSelect();
    syncState();
  };

  // Chạy AI Turn
  const runAITurn = () => {
    setIsProcessingAI(true);
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
      const decision = evaluateAITurn(enemy.unit, enemy.aiRole ?? 'pursue', {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: phaseUnits.map((u) => u.unit),
        unitStatsMap: statsMap,
        unitWeaponsMap: weaponsMap,
        villageTargets: currentChapter.villages?.filter(
          (v) => (nextVillageStates[v.id] ?? 'intact') === 'intact',
        ).map((v) => v.position),
      });

      if (decision.type === 'attack') {
        enemy.unit.position = { ...decision.movePosition };
        logs.push(`🔴 ${enemy.unit.name} moves to (${decision.movePosition.x},${decision.movePosition.y}) and attacks ${decision.targetUnit.name}!`);

        const targetEntry = phaseUnits.find((u) => u.unit.id === decision.targetUnit.id);
        const hpBefore = { attacker: enemy.stats.hp, defender: targetEntry?.stats.hp ?? 0 };
        const result = executeCombat(decision.forecast, defaultRNG);
        if (targetEntry) {
          const popup = buildCombatPopup(++popupIdRef.current, enemy, targetEntry, hpBefore, result);
          setPopupQueue((queue) => [...queue, popup]);
        }
        for (const ev of result.events) {
          const atk = phaseUnits.find((u) => u.unit.id === ev.attackerId)?.unit.name || '';
          const def = phaseUnits.find((u) => u.unit.id === ev.defenderId)?.unit.name || '';
          if (!ev.isHit) {
            soundManager.playSfx('miss');
            logs.push(`  ${atk} missed ${def}!`);
          } else {
            if (ev.isCrit) {
              soundManager.playSfx('crit');
            } else if (ev.damageDealt === 0) {
              soundManager.playSfx('nodamage');
            } else {
              const attackerUnit = phaseUnits.find((u) => u.unit.id === ev.attackerId);
              soundManager.playWeaponHit(attackerUnit?.weapon.type ?? 'axe');
            }
            const critText = ev.isCrit ? ' [CRITICAL HIT!]' : '';
            logs.push(`  ${atk} strikes ${def} for ${ev.damageDealt} damage!${critText}`);
          }
        }
        if (result.unitDefeatedId) {
          soundManager.playSfx('death');
          const defeatedUnit = phaseUnits.find((u) => u.unit.id === result.unitDefeatedId);
          if (defeatedUnit) defeatedUnit.unit.isDead = true;
          logs.push(`  💀 ${defeatedUnit?.unit.name} has fallen!`);
          const killerId = result.unitDefeatedId === enemy.unit.id ? decision.targetUnit.id : enemy.unit.id;
          const defeat = resolveDefeat(
            { units: phaseUnits, gold, villageStates: nextVillageStates },
            result.unitDefeatedId, killerId, itemsJson.items, currentDialogues,
          );
          logs.push(...eventLogLines(defeat.events, '  '));
          phaseUnits = [...defeat.state.units];
        }
        const experience = applyCombatExperience(phaseUnits, result, defaultRNG);
        phaseUnits = experience.entries;
        for (const entry of phaseUnits) statsMap.set(entry.unit.id, entry.stats);
        logs.push(...experience.messages);
      } else if (decision.type === 'move_only') {
        enemy.unit.position = { ...decision.movePosition };
        logs.push(`🔴 ${enemy.unit.name} advances towards (${decision.movePosition.x},${decision.movePosition.y}).`);
      } else {
        logs.push(`🔴 ${enemy.unit.name} holds position on guard.`);
      }

      if (decision.type === 'move_only' || decision.type === 'attack') {
        const raid = pillageVillage({ units: phaseUnits, gold, villageStates: nextVillageStates }, enemy.unit.id, currentChapter);
        nextVillageStates = { ...raid.state.villageStates };
        logs.push(...eventLogLines(raid.events));
      }

      enemy.unit.hasActed = true;
      if (evaluateChapterOutcome(phaseUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId) !== 'ongoing') break;
    }

    setVillageStates(nextVillageStates);

    setCombatLog((prev) => [...logs, ...prev].slice(0, 30));

    // Kiểm tra kết quả chương sau lượt địch
    const outcome = evaluateChapterOutcome(phaseUnits.map((u) => u.unit), chapterObjective, false, currentChapter.lordUnitId);
    if (outcome !== 'ongoing') setChapterOutcome(outcome);

    // Chuyển lại về Player Phase
    if (outcome === 'ongoing') {
      soundManager.playSfx('player_phase');
      turnManager.switchPhase('player_phase');
      phaseUnits = healUnitsOnTerrain(phaseUnits, 'player', mapData, defaultTerrainRegistry);
      phaseUnits = phaseUnits.map((u) => u.unit.faction === 'player' && !u.unit.isDead ? { ...u, unit: { ...u.unit, hasActed: false } } : u);
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
    setShowPreparation(false);
    turnManager.restoreState(data.turnState, data.extendedUnits.map((item) => item.unit));
    defaultRNG.setSeed(data.rngSeed);
    setChapterOutcome(data.chapterOutcome);
    setShowStoryIntro(data.showStoryIntro);
    setCombatLog(data.combatLog);
    setGold(data.gold);
    setVillageStates(data.villageStates);
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
      rngSeed: defaultRNG.getSeed(),
      chapterOutcome,
      showStoryIntro,
      combatLog,
      gold,
      villageStates,
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
              dangerZoneKeys={dangerZoneKeys}
              selectedPos={pendingMovePos || (selectedExtUnit ? selectedExtUnit.unit.position : null)}
              attackTargetKeys={attackTargetKeys}
              onTileClick={handleTileClick}
              onTileHover={handleTileHover}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', width: 'max-content', minWidth: '100%', minHeight: '100%', boxSizing: 'border-box', padding: `8px ${HUD_CLEAR}px ${HUD_CLEAR}px 8px` }}>
            <Grid2D
              board={boardView}
              movementPath={plannedPath}
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
        combatLog={combatLog}
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
          onCancel={() => { setCombatForecast(null); setSelectedTarget(null); }}
        />
      )}

      <ActionMenuWindow
        anchorTile={pendingMovePos ?? selectedExtUnit?.unit.position ?? null}
        mountLabel={
          selectedExtUnit && !pendingMovePos && !combatForecast && !activeMovingUnit
            && (selectedExtUnit.unit.mountedClassId || getClassDefinition(selectedExtUnit.unit.classId)?.mountKind === 'ground')
            ? (selectedExtUnit.unit.mountedClassId ? 'Mount' : 'Dismount')
            : null
        }
        actions={pendingMovePos && !combatForecast && !activeMovingUnit ? {
          unitName: selectedExtUnit?.unit.name,
          canSeize: chapterObjective.type === 'seize' && selectedExtUnit?.unit.id === currentChapter.lordUnitId
            && pendingMovePos.x === chapterObjective.seizeTargetTile?.x
            && pendingMovePos.y === chapterObjective.seizeTargetTile?.y,
          talkTargetName: talkTarget?.unit.name ?? null,
          canUseVulnerary: Boolean(selectedExtUnit && selectedExtUnit.stats.hp < selectedExtUnit.stats.maxHp
            && selectedExtUnit.inventory.some((i) => i.itemId === 'vulnerary' && i.uses > 0)),
          promotions: selectedExtUnit && selectedExtUnit.level >= 10
            && selectedExtUnit.inventory.some((i) => i.itemId === 'master_seal' && i.uses > 0)
            ? (getClassDefinition(selectedExtUnit.unit.classId)?.promotions ?? []).map((id) => ({ id, name: getClassDefinition(id)?.name ?? id })) : [],
          villageName: currentVillageAtPendingPos?.name ?? null,
          hasAttackTargets: attackableTargets.length > 0,
          targetPositions: attackableTargets.map((t) => t.unit.position),
        } : null}
        onToggleMount={handleToggleMounted}
        onSeize={handleSeize}
        onTalk={handleTalk}
        onUseVulnerary={handleUseVulnerary}
        onPromote={handlePromote}
        onVisitVillage={handleVisitVillage}
        onWait={handleConfirmWait}
        onCancelMove={handleCancelMove}
      />

      <CombatResultPopup entry={popupQueue[0] ?? null} onDismiss={() => setPopupQueue((queue) => queue.slice(1))} />
      {activeSummaryUnit && activeSummaryTile && !combatForecast && !inspectedUnit && (
        <UnitHoverWindow
          unit={activeSummaryUnit}
          tile={activeSummaryTile}
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
