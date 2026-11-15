import React, { useState, useMemo, useEffect } from 'react';
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
import { calculateCombatForecast, calculateDisplayedCombatStats, executeCombat, getManhattanDistance } from './core/combat/calculator';
import { calculateSupportBonus } from './core/combat/support';
import { defaultRNG } from './core/combat/rng';
import { evaluateAITurn } from './core/ai/decision';
import { ThreeScene } from './renderer/ThreeScene';
import { evaluateChapterOutcome } from './core/chapter/types';
import { carryUnitsToChapter } from './core/chapter/transition';
import { saveGameState, loadGameState, type SaveGameData } from './storage/saveLoad';
import { chapters, chapter01Data, ExtendedUnitState, InventoryEntry } from './core/data/chapterData';
import { changeMountedState, getAttackRange, getClassDefinition, promoteWithMasterSeal, useVulnerary } from './core/class/classRules';
import { applyCombatExperience, getEffectiveGrowthRates } from './core/progression/experience';
import { soundManager } from './audio/soundManager';
import { TitleScreen } from './ui/TitleScreen';
import { BookSelectModal } from './ui/BookSelectModal';
import { SaveSlotsModal } from './ui/SaveSlotsModal';
import { WorldMapModal } from './ui/WorldMapModal';

const chapterMaps: Record<string, MapData> = {
  chapter_01: talysMapRaw as MapData,
  chapter_02: galderMapRaw as MapData,
  chapter_03: devilMountainMapRaw as MapData,
  test_chapter_01: testMapRaw as MapData,
};

interface DialogueLine {
  speaker: string;
  avatarUrl: string;
  text: string;
}

interface ChapterDialogueData {
  chapterId: string;
  opening: DialogueLine[];
  recruit_castor?: DialogueLine[];
  recruit_navarre?: DialogueLine[];
  villages?: Record<string, DialogueLine[]>;
  boss_gazzak?: { startCombat: string; death: string };
  boss_gomer?: { startCombat: string; death: string };
  boss_hyman?: { startCombat: string; death: string };
  ending: DialogueLine[];
}

const chapterDialogues: Record<string, ChapterDialogueData> = {
  chapter_01: ch01Dialogues as ChapterDialogueData,
  chapter_02: ch02Dialogues as ChapterDialogueData,
  chapter_03: ch03Dialogues as ChapterDialogueData,
};

const TERRAIN_COLORS: Record<string, { bg: string; label: string; icon: string }> = {
  plains: { bg: '#4a7c59', label: 'Plains', icon: '🌿' },
  forest: { bg: '#2d5a3f', label: 'Forest', icon: '🌲' },
  mountain: { bg: '#8b7355', label: 'Mountain', icon: '⛰️' },
  peak: { bg: '#5c4d3c', label: 'Peak', icon: '🏔️' },
  fort: { bg: '#607d8b', label: 'Fort', icon: '🏰' },
  bridge: { bg: '#a08260', label: 'Bridge', icon: '🪵' },
  river: { bg: '#2b5876', label: 'River', icon: '🌊' },
  sea: { bg: '#1e3c72', label: 'Sea', icon: '🌊' },
  gate: { bg: '#c0392b', label: 'Gate', icon: '⛩️' },
  village: { bg: '#d97706', label: 'Village', icon: '🏡' },
  wall: { bg: '#474747', label: 'Stone Wall', icon: '🧱' },
};

interface DialogueCutsceneModalProps {
  dialogues: DialogueLine[];
  title: string;
  themeColor?: 'blue' | 'amber' | 'green';
  actionButtonText: string;
  summaryBox?: React.ReactNode;
  onConfirm: () => void;
}

const DialogueCutsceneModal: React.FC<DialogueCutsceneModalProps> = ({
  dialogues,
  title,
  themeColor = 'blue',
  actionButtonText,
  summaryBox,
  onConfirm,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedLength, setDisplayedLength] = useState(0);

  const safeDialogues = dialogues.length > 0 ? dialogues : [{ speaker: 'Narrator', text: '...', avatarUrl: '' }];
  const currentLine = safeDialogues[Math.min(currentStep, safeDialogues.length - 1)]!;
  const fullText = currentLine.text || '';
  const isTyping = displayedLength < fullText.length;
  const isLast = currentStep >= safeDialogues.length - 1;

  useEffect(() => {
    setDisplayedLength(0);
    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= fullText.length) {
          clearInterval(timer);
          return prev;
        }
        return Math.min(prev + 4, fullText.length);
      });
    }, 15);
    return () => clearInterval(timer);
  }, [currentStep, fullText]);

  const handleAdvance = () => {
    if (isTyping) {
      setDisplayedLength(fullText.length);
    } else if (!isLast) {
      soundManager.playSfx('cursor');
      setCurrentStep((prev) => prev + 1);
    } else {
      soundManager.playSfx('select');
      onConfirm();
    }
  };

  const theme = {
    blue: {
      border: '#3b82f6',
      cardBg: '#0f172a',
      balloonBg: '#1e293b',
      balloonBorder: '#334155',
      nameColor: '#60a5fa',
      nameTagBg: '#1e3a8a',
      btnBg: '#2563eb',
      btnBorder: '#3b82f6',
      btnShadow: 'rgba(37,99,235,0.4)',
    },
    amber: {
      border: '#f59e0b',
      cardBg: '#1c1917',
      balloonBg: '#292524',
      balloonBorder: '#44403c',
      nameColor: '#fbbf24',
      nameTagBg: '#78350f',
      btnBg: '#d97706',
      btnBorder: '#f59e0b',
      btnShadow: 'rgba(217,119,6,0.4)',
    },
    green: {
      border: '#22c55e',
      cardBg: '#052e16',
      balloonBg: '#064e3b',
      balloonBorder: '#047857',
      nameColor: '#86efac',
      nameTagBg: '#022c22',
      btnBg: '#16a34a',
      btnBorder: '#22c55e',
      btnShadow: 'rgba(22,163,74,0.4)',
    },
  }[themeColor];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1200,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(720px, 95vw)',
          backgroundColor: theme.cardBg,
          border: `2px solid ${theme.border}`,
          borderRadius: '14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderBottom: `1px solid ${theme.border}44`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, color: theme.nameColor, fontSize: '17px', fontWeight: 'bold' }}>
              {title}
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '12px' }}>
              {currentStep + 1}/{safeDialogues.length}
            </span>
          </div>

          {/* Quick Action / Confirm Button */}
          <button
            onClick={onConfirm}
            title={actionButtonText}
            style={{
              padding: '7px 15px',
              backgroundColor: theme.btnBg,
              border: `1px solid ${theme.btnBorder}`,
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 2px 8px ${theme.btnShadow}`,
            }}
          >
            {actionButtonText}
          </button>
        </div>

        {/* Dialogue Interaction Body (Fire Emblem visual novel style) */}
        <div
          onClick={handleAdvance}
          style={{
            padding: '20px',
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'relative',
          }}
        >
          {/* Visually hidden full cutscene transcript for screen readers and accessibility */}
          <div
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {safeDialogues.map((line, idx) => (
              <p key={idx}>{line.speaker}: {line.text}</p>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {/* Character Portrait */}
            {currentLine.avatarUrl ? (
              <img
                src={currentLine.avatarUrl}
                alt={currentLine.speaker}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '10px',
                  border: `3px solid ${theme.border}`,
                  objectFit: 'cover',
                  objectPosition: 'top',
                  backgroundColor: '#020617',
                  flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '10px',
                  border: `3px solid ${theme.border}`,
                  backgroundColor: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  flexShrink: 0,
                }}
              >
                👤
              </div>
            )}

            {/* Speaker Name Tag & Dialogue Balloon */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.nameTagBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  padding: '4px 12px',
                  color: theme.nameColor,
                  fontWeight: 'bold',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                {currentLine.speaker}
              </div>

              <div
                style={{
                  backgroundColor: theme.balloonBg,
                  border: `1px solid ${theme.balloonBorder}`,
                  borderRadius: '10px',
                  padding: '14px 18px',
                  minHeight: '84px',
                  boxSizing: 'border-box',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '15px', lineHeight: '1.65', color: '#f8fafc', position: 'relative' }}>
                  {/* Visually hidden full text for screen readers and accessibility */}
                  <span
                    style={{
                      position: 'absolute',
                      width: '1px',
                      height: '1px',
                      padding: 0,
                      margin: '-1px',
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  >
                    {fullText}
                  </span>
                  <span aria-hidden="true">
                    "{fullText.slice(0, displayedLength)}"
                    {isTyping && <span style={{ opacity: 0.7, marginLeft: '2px', color: theme.nameColor }}>▌</span>}
                  </span>
                </div>

                {!isTyping && !isLast && (
                  <div
                    style={{
                      alignSelf: 'flex-end',
                      color: theme.nameColor,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginTop: '6px',
                    }}
                  >
                    ▼ Click to advance...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Extra summary content (Objective info or reward text) */}
          {summaryBox && (
            <div style={{ marginTop: '4px' }}>
              {summaryBox}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
            {isLast ? '✨ Dialogue complete. Click the button above to proceed.' : '💡 Click anywhere on the box to advance, or click the button above to skip.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [currentChapterId, setCurrentChapterId] = useState<string>('chapter_01');
  const currentChapter = chapters[currentChapterId] ?? chapter01Data;
  const mapData = chapterMaps[currentChapterId] ?? (talysMapRaw as MapData);
  const currentDialogues = chapterDialogues[currentChapterId] ?? (ch01Dialogues as ChapterDialogueData);
  const chapterObjective = currentChapter.objective;

  const [extendedUnits, setExtendedUnits] = useState<ExtendedUnitState[]>(() => structuredClone(currentChapter.units));
  const [reserveUnits, setReserveUnits] = useState<ExtendedUnitState[]>([]);
  const [turnManager] = useState<TurnManager>(() => new TurnManager(extendedUnits.map((u) => u.unit)));
  const [turnState, setTurnState] = useState(turnManager.getState());

  // Giao tranh & Hành động
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [showStoryIntro, setShowStoryIntro] = useState<boolean>(true);
  const [showPreparation, setShowPreparation] = useState<boolean>(false);
  const [chapterOutcome, setChapterOutcome] = useState<'ongoing' | 'victory' | 'defeat'>('ongoing');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [pendingMovePos, setPendingMovePos] = useState<Position | null>(null);
  const [originalPos, setOriginalPos] = useState<Position | null>(null);
  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<ExtendedUnitState | null>(null);
  const [combatForecast, setCombatForecast] = useState<CombatForecast | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [gold, setGold] = useState<number>(0);
  const [villageStates, setVillageStates] = useState<Record<string, 'intact' | 'visited' | 'destroyed'>>({});
  const [activeVillageDialogue, setActiveVillageDialogue] = useState<{
    villageName: string;
    lines: DialogueLine[];
    rewardText: string;
  } | null>(null);

  // Màn hình tổng thể & Bản lưu
  const [activeScreen, setActiveScreen] = useState<'none' | 'title' | 'book_select' | 'save_slots' | 'world_map'>('none');
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
    setStatusNotice(`Switched to ${targetChapter.name}`);
    setTimeout(() => setStatusNotice(null), 3000);
    setCombatLog([`📜 Started ${targetChapter.name}`]);
  };

  const toggleDeployment = (unitId: string) => {
    if (unitId === 'marth') return;
    const active = extendedUnits.find(({ unit }) => unit.id === unitId && unit.faction === 'player');
    if (active) {
      const nextActive = extendedUnits.filter(({ unit }) => unit.id !== unitId);
      setExtendedUnits(nextActive);
      setReserveUnits([...reserveUnits, active]);
      turnManager.replaceUnits(nextActive.map(({ unit }) => unit));
      syncState();
      return;
    }
    const reserve = reserveUnits.find(({ unit }) => unit.id === unitId);
    const deploymentLimit = currentChapter.units.filter(({ unit }) => unit.faction === 'player').length;
    if (!reserve || extendedUnits.filter(({ unit }) => unit.faction === 'player').length >= deploymentLimit) return;
    const nextActive = [...extendedUnits, reserve];
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

  const talkTarget = selectedExtUnit && pendingMovePos
    ? extendedUnits.find(({ unit }) => currentChapter.recruitments.some((rule) =>
      rule.speakerUnitId === selectedExtUnit.unit.id
      && rule.targetUnitId === unit.id
      && unit.faction === 'enemy' && !unit.isDead
      && getManhattanDistance(pendingMovePos, unit.position) <= rule.maxDistance))
    : undefined;

  const currentVillageAtPendingPos = useMemo(() => {
    if (!pendingMovePos || !selectedExtUnit) return null;
    if (selectedExtUnit.unit.id !== 'marth') return null;
    const village = currentChapter.villages?.find(
      (v) => v.position.x === pendingMovePos.x && v.position.y === pendingMovePos.y
    );
    if (!village) return null;
    const state = villageStates[village.id] ?? 'intact';
    return state === 'intact' ? village : null;
  }, [pendingMovePos, selectedExtUnit, currentChapter.villages, villageStates]);

  // Click vào ô trên bản đồ
  const handleTileClick = (x: number, y: number) => {
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

    // Nếu đã chọn 1 quân ta và click vào ô di chuyển
    if (selectedExtUnit && reachableKeys.has(`${x},${y}`) && !pendingMovePos) {
      setOriginalPos({ ...selectedExtUnit.unit.position });
      const success = turnManager.moveSelectedUnit({ x, y });
      if (success) {
        soundManager.playMoveStep(selectedExtUnit.unit.moveType);
        setPendingMovePos({ x, y });
        setExtendedUnits([...extendedUnits]);
        syncState();

      }
      return;
    }

    // Chọn đơn vị quân ta chưa đi
    if (clickedExt && clickedExt.unit.faction === 'player' && !clickedExt.unit.hasActed && !pendingMovePos) {
      soundManager.playSfx('select');
      const range = calculateMovementRange(clickedExt.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: extendedUnits.map((u) => u.unit),
      });
      turnManager.selectUnit(clickedExt.unit.id, range);
      setPendingMovePos(null);
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
      return;
    }

    // Bỏ chọn
    if (!pendingMovePos) {
      soundManager.playSfx('cancel');
      turnManager.cancelSelect();
      setSelectedTarget(null);
      setCombatForecast(null);
      syncState();
    }
  };

  // Xác nhận Tấn công
  const handleConfirmAttack = () => {
    if (!combatForecast || !selectedExtUnit || !selectedTarget) return;

    const result = executeCombat(combatForecast, defaultRNG);

    // Cập nhật log trận đánh
    const logs: string[] = [];
    if (selectedTarget.unit.id === 'gazzak' && currentDialogues.boss_gazzak) {
      logs.push(`🗣️ Gazzak: "${currentDialogues.boss_gazzak.startCombat}"`);
    } else if (selectedTarget.unit.id === 'gomer' && currentDialogues.boss_gomer) {
      logs.push(`🗣️ Gomer: "${currentDialogues.boss_gomer.startCombat}"`);
    } else if (selectedTarget.unit.id === 'hyman' && currentDialogues.boss_hyman) {
      logs.push(`🗣️ Hyman: "${currentDialogues.boss_hyman.startCombat}"`);
    }
    logs.push(`⚔️ ENGAGEMENT: ${selectedExtUnit.unit.name} vs ${selectedTarget.unit.name}`);
    for (const ev of result.events) {
      const atk = extendedUnits.find((u) => u.unit.id === ev.attackerId)?.unit.name || 'Unknown';
      const def = extendedUnits.find((u) => u.unit.id === ev.defenderId)?.unit.name || 'Unknown';
      if (!ev.isHit) {
        soundManager.playSfx('miss');
        logs.push(`${atk} attacked ${def} but MISSED!`);
      } else {
        if (ev.isCrit) {
          soundManager.playSfx('crit');
        } else if (ev.damageDealt === 0) {
          soundManager.playSfx('nodamage');
        } else {
          const attackerUnit = extendedUnits.find((u) => u.unit.id === ev.attackerId);
          soundManager.playWeaponHit(attackerUnit?.weapon.type ?? 'sword');
        }
        const critText = ev.isCrit ? ' [CRITICAL HIT!]' : '';
        logs.push(`${atk} hit ${def} for ${ev.damageDealt} damage!${critText} (${def} remaining HP: ${ev.defenderHpAfter})`);
      }
    }

    let lootItemId: string | undefined;
    let lootRecipientId: string | undefined;
    if (result.unitDefeatedId) {
      soundManager.playSfx('death');
      const deadExt = extendedUnits.find((u) => u.unit.id === result.unitDefeatedId);
      const deadName = deadExt?.unit.name;
      logs.push(`💀 ${deadName} was defeated!`);
      const bossData = (currentDialogues as Record<string, any>)[`boss_${result.unitDefeatedId}`];
      if (bossData?.death) {
        logs.push(`🗣️ ${deadName}: "${bossData.death}"`);
      }
      if (deadExt?.dropItemId) {
        lootItemId = deadExt.dropItemId;
        const itemDef = itemsJson.items.find(({ id }) => id === lootItemId);
        const itemName = itemDef?.name ?? lootItemId;
        const killerExt = result.unitDefeatedId === selectedExtUnit.unit.id ? selectedTarget : selectedExtUnit;
        if (killerExt && killerExt.unit.faction === 'player') {
          lootRecipientId = killerExt.unit.id;
          logs.push(`🎁 ${killerExt.unit.name} obtained loot: ${itemName} from ${deadName}!`);
        }
      }
    }

    // Cập nhật trạng thái sống/chết và HP
    let updatedUnits: ExtendedUnitState[] = extendedUnits.map((item) => {
        if (item.unit.id === selectedExtUnit.unit.id) {
          const nextInventory: InventoryEntry[] = lootItemId && lootRecipientId === item.unit.id && combatForecast.attacker.stats.hp > 0
            ? [...item.inventory, { itemId: lootItemId, uses: itemsJson.items.find(({ id }) => id === lootItemId)?.maxUses ?? 1 }]
            : item.inventory;
          return {
            ...item,
            stats: { ...combatForecast.attacker.stats },
            unit: { ...item.unit, isDead: combatForecast.attacker.stats.hp <= 0 },
            inventory: nextInventory,
          };
        }
        if (item.unit.id === selectedTarget.unit.id) {
          const nextInventory: InventoryEntry[] = lootItemId && lootRecipientId === item.unit.id && combatForecast.defender.stats.hp > 0
            ? [...item.inventory, { itemId: lootItemId, uses: itemsJson.items.find(({ id }) => id === lootItemId)?.maxUses ?? 1 }]
            : item.inventory;
          return {
            ...item,
            stats: { ...combatForecast.defender.stats },
            unit: { ...item.unit, isDead: combatForecast.defender.stats.hp <= 0 },
            inventory: nextInventory,
          };
        }
        return item;
      });
    const experience = applyCombatExperience(updatedUnits, result, defaultRNG);
    updatedUnits = experience.entries;
    logs.push(...experience.messages);
    setCombatLog((prev) => [...logs, ...prev].slice(0, 20));
    turnManager.replaceUnits(updatedUnits.map((item) => item.unit));
    setExtendedUnits(updatedUnits);

    // Kiểm tra kết quả chương
    const outcome = evaluateChapterOutcome(updatedUnits.map((u) => u.unit), chapterObjective);
    if (outcome !== 'ongoing') setChapterOutcome(outcome);

    // Đánh dấu hành động hoàn thành
    turnManager.waitSelectedUnit();
    setPendingMovePos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  // Xác nhận Chờ
  const handleConfirmWait = () => {
    soundManager.playSfx('accept');
    turnManager.waitSelectedUnit();
    setPendingMovePos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  const handleUseVulnerary = () => {
    if (!selectedExtUnit || !pendingMovePos) return;
    const item = itemsJson.items.find(({ id }) => id === 'vulnerary') as ItemDefinition | undefined;
    if (!item) return;
    const changed = useVulnerary(selectedExtUnit, item);
    if (!changed) return;
    soundManager.playSfx('heal');
    const nextUnits = extendedUnits.map((entry) => entry.unit.id === changed.unit.id ? changed : entry);
    turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
    turnManager.waitSelectedUnit();
    setExtendedUnits(nextUnits);
    setPendingMovePos(null);
    setCombatLog((previous) => [`${changed.unit.name} used ${item.name}: HP ${changed.stats.hp}/${changed.stats.maxHp}`, ...previous].slice(0, 20));
    syncState();
  };

  const handlePromote = (targetClassId: string) => {
    if (!selectedExtUnit || !pendingMovePos) return;
    const changed = promoteWithMasterSeal(selectedExtUnit, targetClassId);
    if (!changed) return;
    soundManager.playSfx('levelup');
    const nextUnits = extendedUnits.map((entry) => entry.unit.id === changed.unit.id ? changed : entry);
    turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
    turnManager.waitSelectedUnit();
    setExtendedUnits(nextUnits);
    setPendingMovePos(null);
    setCombatLog((previous) => [`${changed.unit.name} promoted to ${getClassDefinition(targetClassId)?.name ?? targetClassId}`, ...previous].slice(0, 20));
    syncState();
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

  const handleSeize = () => {
    if (!selectedExtUnit || selectedExtUnit.unit.id !== 'marth' || !pendingMovePos) return;
    const outcome = evaluateChapterOutcome(extendedUnits.map(({ unit }) => unit), chapterObjective, true);
    if (outcome !== 'victory') return;
    soundManager.playSfx('stage_clear');
    if (currentChapter.seizeReward) {
      if (currentChapter.seizeReward.type === 'gold' && currentChapter.seizeReward.amount) {
        setGold((prev) => prev + currentChapter.seizeReward!.amount!);
        setCombatLog((prev) => [
          `💰 Seized castle gate! Received ${currentChapter.seizeReward!.amount!.toLocaleString()} Gold!`,
          ...prev,
        ]);
      } else if (currentChapter.seizeReward.type === 'item' && currentChapter.seizeReward.itemId) {
        const itemDef = itemsJson.items.find(({ id }) => id === currentChapter.seizeReward!.itemId);
        if (itemDef) {
          setExtendedUnits((prev) => prev.map((entry) => entry.unit.id === 'marth'
            ? { ...entry, inventory: [...entry.inventory, { itemId: itemDef.id, uses: itemDef.maxUses }] }
            : entry));
          setCombatLog((prev) => [
            `🎁 Seized castle gate! Marth obtained: ${itemDef.name}!`,
            ...prev,
          ]);
        }
      }
    }
    turnManager.waitSelectedUnit();
    setPendingMovePos(null);
    setChapterOutcome('victory');
    syncState();
  };

  const handleTalk = () => {
    if (!talkTarget || !selectedExtUnit) return;
    soundManager.playSfx('item_get');
    const nextUnits = extendedUnits.map((entry) => entry.unit.id === talkTarget.unit.id
      ? { ...entry, unit: { ...entry.unit, faction: 'player' as const }, aiRole: undefined }
      : entry);
    turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
    turnManager.waitSelectedUnit();
    setExtendedUnits(nextUnits);
    setPendingMovePos(null);
    const dialogueLines = talkTarget.unit.id === 'castor'
      ? (currentDialogues.recruit_castor ?? [])
      : talkTarget.unit.id === 'navarre'
      ? (currentDialogues.recruit_navarre ?? [])
      : [];
    setCombatLog((prev) => [
      ...dialogueLines.map(({ speaker, text }) => `${speaker}: ${text}`),
      ...prev,
    ]);
    syncState();
  };

  const handleVisitVillage = () => {
    if (!currentVillageAtPendingPos || !selectedExtUnit || !pendingMovePos) return;
    soundManager.playSfx('item_get');

    const village = currentVillageAtPendingPos;
    setVillageStates((prev) => ({ ...prev, [village.id]: 'visited' }));

    let rewardText = '';
    let rewardItem: { itemId: string; uses: number } | undefined;
    if (village.reward.type === 'gold') {
      const amount = village.reward.amount ?? 0;
      setGold((prev) => prev + amount);
      rewardText = `Received ${amount.toLocaleString()} Gold from the villagers!`;
    } else if (village.reward.type === 'item') {
      const itemId = village.reward.itemId;
      const itemDef = itemsJson.items.find((it) => it.id === itemId);
      if (!itemId || !itemDef) return;
      const itemName = itemDef?.name ?? itemId;
      rewardItem = { itemId, uses: itemDef.maxUses };
      rewardText = `Received item: ${itemName}!`;
    }

    const lines = currentDialogues.villages?.[village.id] ?? [
      {
        speaker: 'Villager',
        avatarUrl: '/avatars/village_man.png',
        text: 'Thank you Prince Marth for protecting our village!',
      },
    ];

    setActiveVillageDialogue({
      villageName: village.name,
      lines,
      rewardText,
    });

    setCombatLog((prev) => [
      `🏡 Marth visited ${village.name}: ${rewardText}`,
      ...prev,
    ]);

    const nextUnits = rewardItem
      ? extendedUnits.map((entry) => entry.unit.id === selectedExtUnit.unit.id
        ? { ...entry, inventory: [...entry.inventory, rewardItem] }
        : entry)
      : extendedUnits;
    turnManager.replaceUnits(nextUnits.map(({ unit }) => unit));
    turnManager.waitSelectedUnit();
    setExtendedUnits(nextUnits);
    setPendingMovePos(null);
    setOriginalPos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  // Hủy bước di chuyển
  const handleCancelMove = () => {
    soundManager.playSfx('cancel');
    if (selectedExtUnit && originalPos) {
      selectedExtUnit.unit.position = { ...originalPos };
    }
    turnManager.cancelSelect();
    setExtendedUnits([...extendedUnits]);
    setPendingMovePos(null);
    setOriginalPos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
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
    const nextVillageStates = { ...villageStates };

    const logs: string[] = [`🔴 ENEMY PHASE (Turn ${turnState.turnNumber})`];

    for (const enemy of activeEnemies) {
      const decision = evaluateAITurn(enemy.unit,
        enemy.unit.classId === 'thief' ? 'pillage' : (enemy.aiRole || 'pursue'), {
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

        const result = executeCombat(decision.forecast, defaultRNG);
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
          const defeated = defeatedUnit?.unit.name;
          logs.push(`  💀 ${defeated} has fallen!`);
          const bossData = (currentDialogues as Record<string, any>)[`boss_${result.unitDefeatedId}`];
          if (bossData?.death) {
            logs.push(`  🗣️ ${defeated}: "${bossData.death}"`);
          }
          if (defeatedUnit?.dropItemId) {
            const dropId = defeatedUnit.dropItemId;
            const itemDef = itemsJson.items.find(({ id }) => id === dropId);
            const itemName = itemDef?.name ?? dropId;
            const killerUnit = phaseUnits.find((u) => u.unit.id === (result.unitDefeatedId === enemy.unit.id ? decision.targetUnit.id : enemy.unit.id));
            if (killerUnit && killerUnit.unit.faction === 'player' && !killerUnit.unit.isDead) {
              killerUnit.inventory = [...killerUnit.inventory, { itemId: dropId, uses: itemDef?.maxUses ?? 1 }];
              logs.push(`  🎁 ${killerUnit.unit.name} obtained loot: ${itemName} from ${defeated}!`);
            }
          }
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
        const raidedVillage = currentChapter.villages?.find(
          (v) => v.position.x === decision.movePosition.x && v.position.y === decision.movePosition.y
        );
        if (enemy.unit.classId === 'thief' && raidedVillage
          && (nextVillageStates[raidedVillage.id] ?? 'intact') === 'intact') {
          nextVillageStates[raidedVillage.id] = 'destroyed';
          logs.push(`🔥 The thief raided ${raidedVillage.name.toUpperCase()}! The village was destroyed!`);
        }
      }

      enemy.unit.hasActed = true;
      if (evaluateChapterOutcome(phaseUnits.map((u) => u.unit), chapterObjective) !== 'ongoing') break;
    }

    setVillageStates(nextVillageStates);

    setCombatLog((prev) => [...logs, ...prev].slice(0, 30));

    // Kiểm tra kết quả chương sau lượt địch
    const outcome = evaluateChapterOutcome(
      phaseUnits.map((u) => u.unit),
      chapterObjective
    );
    if (outcome !== 'ongoing') {
      setChapterOutcome(outcome);
    }

    // Chuyển lại về Player Phase
    if (outcome === 'ongoing') {
      soundManager.playSfx('player_phase');
      turnManager.switchPhase('player_phase');
      phaseUnits = healUnitsOnTerrain(phaseUnits, 'player', mapData, defaultTerrainRegistry);
      phaseUnits = phaseUnits.map((u) => {
        if (u.unit.faction === 'player' && !u.unit.isDead) {
          return {
            ...u,
            unit: {
              ...u.unit,
              hasActed: false,
            },
          };
        }
        return u;
      });
    }
    turnManager.replaceUnits(phaseUnits.map(({ unit }) => unit));
    setExtendedUnits(phaseUnits);
    setIsProcessingAI(false);
    syncState();
  };

  const applyLoadedSnapshot = (data: SaveGameData) => {
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
    setOriginalPos(null);
    setSelectedTarget(null);
    setCombatForecast(null);
    syncState();
  };

  const handleSave = async (slotId: string = 'slot1') => {
    if (pendingMovePos || combatForecast || isProcessingAI || turnState.activePhase !== 'player_phase') {
      setStatusNotice('Please complete your current action before saving.');
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
      setStatusNotice(`✓ Game progress saved to ${slotId.toUpperCase()} successfully!`);
      setTimeout(() => setStatusNotice(null), 2500);
    } else {
      setStatusNotice('Failed to save progress.');
    }
  };

  const handleLoad = async (slotId: string = 'slot1') => {
    const data = await loadGameState(slotId);
    if (data) {
      applyLoadedSnapshot(data);
      setStatusNotice(`✓ Save file loaded from ${slotId.toUpperCase()}!`);
      setTimeout(() => setStatusNotice(null), 2500);
    } else {
      alert('No valid save data found.');
    }
  };

  const handleRestartChapter = () => {
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

  const hoveredTerrainId = hoveredTile ? mapData.grid[hoveredTile.y]?.[hoveredTile.x] : null;
  const hoveredTerrain = hoveredTerrainId ? defaultTerrainRegistry.get(hoveredTerrainId) : null;
  const hoveredUnit = hoveredTile
    ? extendedUnits.find(
        (u) => !u.unit.isDead && u.unit.position.x === hoveredTile.x && u.unit.position.y === hoveredTile.y
      )
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box' }}>
      {/* Header bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          backgroundColor: '#262626',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#64B5F6' }}>
              Water Emblem - Mystery of Nothing
            </h1>
            <select
              value={currentChapterId}
              onChange={(e) => loadChapter(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              <option value="chapter_01">🗺️ Chapter 1: Marth Embarks (30x13)</option>
              <option value="chapter_02">🗺️ Chapter 2: The Pirates of Galder (30x15)</option>
              <option value="chapter_03">🗺️ Chapter 3: The Devil Mountain (30x20)</option>
              <option value="test_chapter_01">🧪 Test Map (8x8)</option>
            </select>
          </div>
          <span style={{ fontSize: '13px', color: '#aaa', marginTop: '4px', display: 'block' }}>
            {currentChapter.name} (Objective: {chapterObjective.description})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '7px 13px',
              backgroundColor: '#451a03',
              border: '1px solid #d97706',
              borderRadius: '6px',
              color: '#fef08a',
              fontSize: '13px',
              fontWeight: 'bold',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            💰 {gold.toLocaleString()} G
          </div>

          {/* Navigation to Title and World Map */}
          <button
            onClick={() => setActiveScreen('title')}
            title="Title Screen & Main Menu"
            style={{
              padding: '7px 13px',
              backgroundColor: '#1e293b',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              color: '#93c5fd',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🏰 Title
          </button>

          <button
            onClick={() => setActiveScreen('world_map')}
            title="View Continent of Archanea World Map"
            style={{
              padding: '7px 13px',
              backgroundColor: '#1e293b',
              border: '1px solid #0891b2',
              borderRadius: '6px',
              color: '#67e8f9',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🗺️ World Map
          </button>

          <button
            onClick={() => {
              setSaveSlotsMode('load');
              setActiveScreen('save_slots');
            }}
            title="Open Save Files Manager"
            style={{
              padding: '7px 13px',
              backgroundColor: '#1e293b',
              border: '1px solid #8b5cf6',
              borderRadius: '6px',
              color: '#c4b5fd',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📁 Save Files
          </button>

          {/* Quick Save / Load buttons */}
          <button
            onClick={() => handleSave()}
            style={{
              padding: '7px 13px',
              backgroundColor: '#2e7d32',
              border: '1px solid #4caf50',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            💾 Save Game
          </button>
          <button
            onClick={() => handleLoad()}
            style={{
              padding: '7px 13px',
              backgroundColor: '#1565c0',
              border: '1px solid #42a5f5',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            📂 Load Game
          </button>

          {/* View mode toggle */}
          <div style={{ display: 'flex', backgroundColor: '#1e1e1e', borderRadius: '6px', padding: '2px', border: '1px solid #444', minHeight: '36px' }}>
            <button
              onClick={() => setViewMode('3d')}
              style={{
                padding: '6px 13px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === '3d' ? '#1976D2' : 'transparent',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🎮 3D View
            </button>
            <button
              onClick={() => setViewMode('2d')}
              style={{
                padding: '6px 13px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: viewMode === '2d' ? '#1976D2' : 'transparent',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              🗺️ 2D Grid
            </button>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            style={{
              padding: '7px 12px',
              border: '1px solid #444',
              borderRadius: '6px',
              backgroundColor: isMuted ? '#C62828' : '#263238',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isMuted ? '🔇 Muted' : '🔊 Sound: On'}
          </button>

          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            Turn: <span style={{ color: '#FFD54F' }}>{turnState.turnNumber}</span>
          </div>
          <div
            style={{
              padding: '7px 15px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '13px',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: turnState.activePhase === 'player_phase' ? '#1976D2' : '#C62828',
            }}
          >
            {turnState.activePhase === 'player_phase' ? '🛡️ PLAYER PHASE' : '⚔️ ENEMY PHASE'}
          </div>
          {turnState.activePhase === 'player_phase' && (
            <button
              onClick={handleEndTurn}
              disabled={isProcessingAI || pendingMovePos !== null || combatForecast !== null}
              style={{
                padding: '8px 16px',
                backgroundColor: '#37474F',
                border: '1px solid #607D8B',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              End Turn
            </button>
          )}
        </div>
      </header>

      {/* Main workspace: Map + Side panel */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Map Grid Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#111',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {viewMode === '3d' ? (
            <ThreeScene
              mapData={mapData}
              units={extendedUnits}
              reachableKeys={reachableKeys}
              dangerZoneKeys={dangerZoneKeys}
              selectedPos={pendingMovePos || (selectedExtUnit ? selectedExtUnit.unit.position : null)}
              attackTargetKeys={attackTargetKeys}
              onTileClick={handleTileClick}
              onTileHover={(x, y) => setHoveredTile({ x, y })}
            />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${mapData.width}, 64px)`,
                gridTemplateRows: `repeat(${mapData.height}, 64px)`,
                gap: '2px',
                backgroundColor: '#000',
                padding: '4px',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              {mapData.grid.map((row, y) =>
                row.map((terrainId, x) => {
                  const key = `${x},${y}`;
                  const terrain = TERRAIN_COLORS[terrainId] || { bg: '#333', label: terrainId, icon: '' };
                  const isReachable = reachableKeys.has(key);
                  const isDanger = dangerZoneKeys.has(key);
                  const extUnit = extendedUnits.find(
                    (u) => !u.unit.isDead && u.unit.position.x === x && u.unit.position.y === y
                  );
                  const isSelected = selectedUnit && selectedUnit.position.x === x && selectedUnit.position.y === y;
                  const isAttackTarget = attackableTargets.some((t) => t.unit.position.x === x && t.unit.position.y === y);

                  return (
                    <div
                      key={key}
                      onClick={() => handleTileClick(x, y)}
                      onMouseEnter={() => setHoveredTile({ x, y })}
                      style={{
                        position: 'relative',
                        width: '64px',
                        height: '64px',
                        backgroundColor: terrain.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid #FFEB3B'
                          : isAttackTarget
                          ? '2px solid #FF1744'
                          : '1px solid rgba(255,255,255,0.05)',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Danger zone overlay */}
                      {isDanger && !isReachable && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(239, 83, 80, 0.25)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* Reachable tile overlay */}
                      {isReachable && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(33, 150, 243, 0.45)',
                            border: '1px dashed #90CAF9',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {/* Attack target indicator */}
                      {isAttackTarget && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(255, 23, 68, 0.35)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      <span style={{ fontSize: '18px', opacity: 0.7, zIndex: 1 }}>{terrain.icon}</span>

                      {/* Unit display */}
                      {extUnit && (
                        <div
                          style={{
                            zIndex: 2,
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#fff',
                            backgroundColor: extUnit.unit.hasActed
                              ? '#616161'
                              : extUnit.unit.faction === 'player'
                              ? '#1E88E5'
                              : '#E53935',
                            border: isSelected ? '2px solid #FFEB3B' : '2px solid rgba(0,0,0,0.4)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                          }}
                        >
                          <div>{extUnit.unit.name.substring(0, 3)}</div>
                          <div style={{ fontSize: '9px', opacity: 0.9 }}>
                            HP:{extUnit.stats.hp}
                          </div>
                        </div>
                      )}

                      <span
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          right: '3px',
                          fontSize: '9px',
                          color: 'rgba(255,255,255,0.4)',
                          zIndex: 1,
                        }}
                      >
                        {x},{y}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Side Panel: Combat Forecast, Actions & Inspector */}
        <div
          style={{
            width: '320px',
            backgroundColor: '#212121',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            border: '1px solid #333',
            overflowY: 'auto',
          }}
        >
          {/* Combat Forecast Window (Q05) */}
          {combatForecast && selectedExtUnit && selectedTarget && (
            <div
              style={{
                backgroundColor: '#1b2a47',
                padding: '14px',
                borderRadius: '8px',
                border: '2px solid #42a5f5',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#90caf9', marginBottom: '8px', fontSize: '15px' }}>
                ⚔️ COMBAT FORECAST
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '12px' }}>
                {/* Attacker */}
                <div style={{ backgroundColor: '#0d47a1', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {selectedExtUnit.avatarUrl && (
                      <img
                        src={selectedExtUnit.avatarUrl}
                        alt={selectedExtUnit.unit.name}
                        style={{ width: '54px', height: '54px', borderRadius: '6px', border: '2px solid #90caf9', objectFit: 'cover', flexShrink: 0, backgroundColor: '#0f172a' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedExtUnit.unit.name}</div>
                      <div style={{ color: '#90caf9', fontSize: '11px' }}>{selectedExtUnit.weapon.name}</div>
                    </div>
                  </div>
                  <div>HP: <strong>{selectedExtUnit.stats.hp}</strong></div>
                  <div>Damage: <strong style={{ color: '#ffca28' }}>{combatForecast.attacker.damage} {combatForecast.attacker.attackCount > 1 ? `x${combatForecast.attacker.attackCount}` : ''}</strong></div>
                  <div>Hit: <strong>{combatForecast.attacker.hitRate}%</strong></div>
                  <div>Crit: <strong>{combatForecast.attacker.critRate}%</strong></div>
                </div>

                {/* Defender */}
                <div style={{ backgroundColor: '#b71c1c', padding: '8px', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {selectedTarget.avatarUrl && (
                      <img
                        src={selectedTarget.avatarUrl}
                        alt={selectedTarget.unit.name}
                        style={{ width: '54px', height: '54px', borderRadius: '6px', border: '2px solid #ef9a9a', objectFit: 'cover', flexShrink: 0, backgroundColor: '#450a0a' }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedTarget.unit.name}</div>
                      <div style={{ color: '#ef9a9a', fontSize: '11px' }}>{selectedTarget.weapon.name}</div>
                    </div>
                  </div>
                  <div>HP: <strong>{selectedTarget.stats.hp}</strong></div>
                  {combatForecast.defender.canCounter ? (
                    <>
                      <div>Damage: <strong style={{ color: '#ffca28' }}>{combatForecast.defender.damage} {combatForecast.defender.attackCount > 1 ? `x${combatForecast.defender.attackCount}` : ''}</strong></div>
                      <div>Hit: <strong>{combatForecast.defender.hitRate}%</strong></div>
                      <div>Crit: <strong>{combatForecast.defender.critRate}%</strong></div>
                    </>
                  ) : (
                    <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: '6px' }}>Cannot counter</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleConfirmAttack}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#e53935',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚔️ Attack!
                </button>
                <button
                  onClick={() => { setCombatForecast(null); setSelectedTarget(null); }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#555',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Menu when unit moved */}
          {selectedExtUnit && !pendingMovePos && !combatForecast
            && (selectedExtUnit.unit.mountedClassId || getClassDefinition(selectedExtUnit.unit.classId)?.mountKind === 'ground') && (
              <button
                onClick={handleToggleMounted}
                title="Toggle mount status before moving"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#b45309',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                <span aria-hidden="true">🏇 </span>
                {selectedExtUnit.unit.mountedClassId ? 'Mount' : 'Dismount'}
              </button>
            )}
          {pendingMovePos && !combatForecast && (
            <div
              style={{
                backgroundColor: '#2c3e50',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #3498db',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#64B5F6', fontSize: '14px', marginBottom: '2px' }}>
                Actions ({selectedExtUnit?.unit.name})
              </div>
              {chapterObjective.type === 'seize' && selectedExtUnit?.unit.id === 'marth'
                && pendingMovePos.x === chapterObjective.seizeTargetTile?.x
                && pendingMovePos.y === chapterObjective.seizeTargetTile?.y && (
                  <button
                    onClick={handleSeize}
                    style={{
                      width: '100%',
                      padding: '11px 16px',
                      backgroundColor: '#d97706',
                      border: '2px solid #fbbf24',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 3px 10px rgba(217,119,6,0.5)',
                    }}
                  >
                    <span aria-hidden="true">👑 </span>Seize Gate
                  </button>
                )}
              {talkTarget && (
                <button
                  onClick={handleTalk}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#0284c7',
                    border: '1px solid #38bdf8',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(2,132,199,0.4)',
                  }}
                >
                  <span aria-hidden="true">💬 </span>Talk: {talkTarget.unit.name}
                </button>
              )}
              {selectedExtUnit && selectedExtUnit.inventory.some((item) => item.itemId === 'vulnerary' && item.uses > 0)
                && selectedExtUnit.stats.hp < selectedExtUnit.stats.maxHp && (
                  <button
                    onClick={handleUseVulnerary}
                    title="Restores 10 HP, consumes one use"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#16a34a',
                      border: '1px solid #4ade80',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(22,163,74,0.4)',
                    }}
                  >
                    <span aria-hidden="true">🧪 </span>Use Vulnerary
                  </button>
                )}
              {selectedExtUnit && selectedExtUnit.level >= 10
                && selectedExtUnit.inventory.some((item) => item.itemId === 'master_seal' && item.uses > 0)
                && getClassDefinition(selectedExtUnit.unit.classId)?.promotions.map((classId) => (
                  <button
                    key={classId}
                    onClick={() => handlePromote(classId)}
                    title="Promote class using a Master Seal"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#7c3aed',
                      border: '1px solid #a78bfa',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                    }}
                  >
                    <span aria-hidden="true">🎖️ </span>Promote: {getClassDefinition(classId)?.name ?? classId}
                  </button>
                ))}
              {currentVillageAtPendingPos && (
                <button
                  onClick={handleVisitVillage}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: '#d97706',
                    border: '1px solid #fbbf24',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span aria-hidden="true">🏡 </span>Visit Village ({currentVillageAtPendingPos.name})
                </button>
              )}
              {attackableTargets.length > 0 && (
                <div style={{ fontSize: '12px', color: '#FFD54F', padding: '4px 0' }}>
                  🎯 Click red target tile to view combat forecast!
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={handleConfirmWait}
                  style={{
                    padding: '10px',
                    backgroundColor: '#27ae60',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    minHeight: '40px',
                  }}
                >
                  ✓ Wait
                </button>
                <button
                  onClick={handleCancelMove}
                  style={{
                    padding: '10px',
                    backgroundColor: '#c0392b',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    cursor: 'pointer',
                    minHeight: '40px',
                  }}
                >
                  ✕ Cancel Move
                </button>
              </div>
            </div>
          )}

          {/* Unit & Terrain Inspector */}
          <div
            style={{
              backgroundColor: '#2a2a2a',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #444',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#FFD54F' }}>
              👤 Unit & Terrain Info
            </h3>
            {hoveredUnit || selectedExtUnit ? (
              (() => {
                const u = (hoveredUnit || selectedExtUnit)!;
                return (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      {u.avatarUrl && (
                        <img
                          src={u.avatarUrl}
                          alt={u.unit.name}
                          style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '8px',
                            border: `2px solid ${u.unit.faction === 'player' ? '#42a5f5' : '#ef5350'}`,
                            boxShadow: '0 3px 10px rgba(0,0,0,0.6)',
                            objectFit: 'cover',
                            flexShrink: 0,
                            backgroundColor: '#0f172a',
                          }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{u.unit.name}</div>
                        {u.title && <div style={{ fontSize: '11px', color: '#aaa' }}>{u.title}</div>}
                        <div style={{ fontSize: '11px', color: u.unit.faction === 'player' ? '#64b5f6' : '#ef9a9a' }}>
                          {u.unit.faction === 'player' ? '🛡️ Player Faction' : '⚔️ Enemy Faction'}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', lineHeight: '1.55' }}>
                      <div><strong>Weapon:</strong> {u.weapon.name} ({u.weapon.type.toUpperCase()}, Mt:{u.weapon.might}, Wt:{u.weapon.weight})</div>
                      {u.inventory.length > 0 && <div><strong>Inventory:</strong> {u.inventory.map((entry) => `${itemsJson.items.find((item) => item.id === entry.itemId)?.name ?? entry.itemId} ×${entry.uses}`).join(' · ')}</div>}
                      <div><strong>HP:</strong> {u.stats.hp} / {u.stats.maxHp} | <strong>Mov:</strong> {u.unit.mov} ({u.unit.moveType})</div>
                      <div><strong>Class:</strong> {getClassDefinition(u.unit.classId)?.name ?? u.unit.classId ?? '—'} | <strong>Lv:</strong> {u.level} | <strong>EXP:</strong> {u.exp}/100</div>
                      {(() => {
                        const terrainId = mapData.grid[u.unit.position.y]?.[u.unit.position.x] ?? 'plains';
                        const combat = calculateDisplayedCombatStats(u.unit, u.stats, u.weapon, terrainId, defaultTerrainRegistry, extendedUnits.map(({ unit }) => unit));
                        return <div style={{ color: '#90caf9', fontWeight: 'bold' }}>Atk {combat.atk} · Hit {combat.hit} · Avo {combat.avoid} · Crit {combat.crit} · AS {combat.as}</div>;
                      })()}
                      <div style={{ backgroundColor: '#18181b', padding: '8px', borderRadius: '6px', margin: '6px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center', fontSize: '12px', border: '1px solid #3f3f46' }}>
                        <div>Str: <strong style={{ color: '#facc15' }}>{u.stats.str}</strong></div>
                        <div>Mag: <strong style={{ color: '#facc15' }}>{u.stats.mag}</strong></div>
                        <div>Skl: <strong style={{ color: '#facc15' }}>{u.stats.skill}</strong></div>
                        <div>Spd: <strong style={{ color: '#facc15' }}>{u.stats.spd}</strong></div>
                        <div>Lck: <strong style={{ color: '#facc15' }}>{u.stats.lck}</strong></div>
                        <div>Def: <strong style={{ color: '#facc15' }}>{u.stats.def}</strong></div>
                        <div>Res: <strong style={{ color: '#facc15' }}>{u.stats.res}</strong></div>
                        <div>Mov: <strong style={{ color: '#facc15' }}>{u.unit.mov}</strong></div>
                      </div>

                      {u.growths && (
                        <div style={{ fontSize: '12px', color: '#90caf9', marginTop: '6px' }}>
                          <strong>Effective Growths:</strong>
                          <div style={{ color: '#cbd5e1' }}>
                            HP {getEffectiveGrowthRates(u).hp}% | Str {getEffectiveGrowthRates(u).str}% | Skill {getEffectiveGrowthRates(u).skill}% | Spd {getEffectiveGrowthRates(u).spd}% | Def {getEffectiveGrowthRates(u).def}%
                          </div>
                        </div>
                      )}

                      {/* Support Relationship Bonus */}
                      {u.unit.faction === 'player' && (() => {
                        const sup = calculateSupportBonus(u.unit, extendedUnits.map((item) => item.unit));
                        if (sup.hit > 0 || sup.avoid > 0 || sup.crit > 0) {
                          return (
                            <div style={{ backgroundColor: '#1e3a8a', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', fontSize: '12px', color: '#bfdbfe', border: '1px solid #3b82f6' }}>
                              💙 <strong>Support Bonus:</strong>
                              <div style={{ marginTop: '2px' }}>+{sup.hit}% Hit | +{sup.avoid}% Avo | +{sup.crit}% Crit</div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Hover over a unit or tile to inspect
              </div>
            )}
            {hoveredTerrain && hoveredTile && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444', fontSize: '13px', color: '#86efac' }}>
                <div><strong>Tile ({hoveredTile.x}, {hoveredTile.y}):</strong> {hoveredTerrain.name}</div>
                <div>Avoid: +{hoveredTerrain.avoidBonus}% | Defense: +{hoveredTerrain.defenseBonus}</div>
              </div>
            )}
          </div>

          {/* Combat Battle Log */}
          <div
            style={{
              backgroundColor: '#1e1e1e',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #333',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '120px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#90caf9', marginBottom: '8px' }}>
              📜 Combat Log
            </div>
            <div style={{ overflowY: 'auto', flex: 1, fontSize: '12px', lineHeight: '1.5', color: '#e2e8f0' }}>
              {combatLog.length === 0 ? (
                <span style={{ color: '#777' }}>No battle engagements yet.</span>
              ) : (
                combatLog.map((log, idx) => <div key={idx} style={{ marginBottom: '4px' }}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Notification Toast */}
      {statusNotice && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#2e7d32',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '6px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 9999,
          }}
        >
          {statusNotice}
        </div>
      )}

      {showPreparation && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.85)', display: 'grid', placeItems: 'center' }}>
          <section style={{ width: 'min(680px, 92vw)', maxHeight: '85vh', overflowY: 'auto', background: '#172033', color: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#60a5fa', fontSize: '20px' }}>⚔️ Battle Preparation: {currentChapter.name}</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 8px 0' }}>Select units for deployment. Marth is required commander; unselected units remain in reserve.</p>
            <div style={{ backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>
              Deployed: {extendedUnits.filter(({ unit }) => unit.faction === 'player' && !unit.isDead).length}/{currentChapter.units.filter(({ unit }) => unit.faction === 'player').length} units
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[...extendedUnits, ...reserveUnits].filter(({ unit }) => unit.faction === 'player').map((entry) => (
                <label
                  key={entry.unit.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    cursor: entry.unit.id === 'marth' || entry.unit.isDead ? 'default' : 'pointer',
                    fontSize: '13px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={extendedUnits.some(({ unit }) => unit.id === entry.unit.id)}
                    disabled={entry.unit.id === 'marth' || entry.unit.isDead}
                    onChange={() => toggleDeployment(entry.unit.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ color: entry.unit.isDead ? '#94a3b8' : '#f8fafc', fontWeight: entry.unit.id === 'marth' ? 'bold' : 'normal' }}>
                    {entry.unit.name} — HP {entry.stats.hp}/{entry.stats.maxHp} — {entry.weapon.name}
                    {entry.unit.id === 'marth' ? ' (Commander - Required)' : ''}
                    {entry.unit.isDead ? ' (Fallen)' : ''}
                  </span>
                </label>
              ))}
            </div>
            <button
              onClick={() => setShowPreparation(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              }}
            >
              Start Chapter ➔
            </button>
          </section>
        </div>
      )}

      {/* Opening Story Dialogue Cutscene Modal (Fire Emblem Visual Novel Style) */}
      {showStoryIntro && (
        <DialogueCutsceneModal
          dialogues={currentDialogues.opening}
          title={`📜 ${currentChapter.name}`}
          themeColor="blue"
          actionButtonText="⚔️ Start Battle"
          summaryBox={
            <div style={{ backgroundColor: '#1e293b', padding: '10px 14px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', fontSize: '13px' }}>
              <strong style={{ color: '#fbbf24' }}>Victory Objective:</strong> {chapterObjective.description}.
              <br />
              <span style={{ color: '#ef4444' }}>Defeat if Marth falls in battle.</span>
            </div>
          }
          onConfirm={() => setShowStoryIntro(false)}
        />
      )}

      {/* Village Dialogue Modal (Fire Emblem Visual Novel Style) */}
      {activeVillageDialogue && (
        <DialogueCutsceneModal
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
        <DialogueCutsceneModal
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#7f1d1d',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
            }}
          >
            <h2 style={{ margin: '0 0 10px 0', color: '#fca5a5', fontSize: '24px' }}>
              💀 GAME OVER
            </h2>
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#fee2e2', marginBottom: '20px' }}>
              Prince Marth has fallen in battle...
              <br />
              The kingdom of Altea has lost all hope.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => handleLoad()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                📂 Load Last Save
              </button>
              <button
                onClick={handleRestartChapter}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#475569',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
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
          onNewGameAtSlot={(slotId) => {
            loadChapter('chapter_01');
            handleSave(slotId);
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
