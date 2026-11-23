import { useState, useEffect, useRef } from 'react';
import { TurnManager, type TurnState } from '../../core/turn/turnManager';
import { runEnemyPhase } from '../../core/turn/enemyPhase';
import { healUnitsOnTerrain, defaultTerrainRegistry } from '../../core/grid/terrain';
import { calculateMovementRange } from '../../core/grid/pathfinding';
import { runMovementAnimation, isFastAnimation, type ActiveMovingUnit } from '../../renderer/movementAnimation';
import { buildCombatPopup, type CombatPopupData } from '../combatPopupData';
import { soundManager } from '../../audio/soundManager';
import { defaultRNG } from '../../core/combat/rng';
import { evaluateChapterOutcome, type ChapterObjective } from '../../core/chapter/types';
import type { ExtendedUnitState, ChapterData } from '../../core/data/chapterData';
import type { MapData, Position } from '../../core/grid/types';
import type { ItemDefinition } from '../../core/combat/types';
import type { DialogueTable, GameEvent, VillageState, ChestState, DoorState } from '../../core/chapter/events';
import type { LevelUpEvent } from '../../core/combat/combatResolution';
import itemsJson from '../../../data/items.json' with { type: 'json' };
import balanceConfig from '../../../data/balance.json' with { type: 'json' };
import { ITEM_BY_ID } from './itemCatalog';

export interface UseTurnFlowParams {
  readonly initialUnits: ExtendedUnitState[];
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly currentChapter: ChapterData;
  readonly chapterObjective: ChapterObjective;
  readonly currentDialogues: DialogueTable;
  readonly mapData: MapData;
  readonly openedDoorKeys: ReadonlySet<string>;
  readonly gold: number;
  readonly setGold: React.Dispatch<React.SetStateAction<number>>;
  readonly villageStates: Record<string, VillageState>;
  readonly setVillageStates: React.Dispatch<React.SetStateAction<Record<string, VillageState>>>;
  readonly chestStates: Record<string, ChestState>;
  readonly setChestStates: React.Dispatch<React.SetStateAction<Record<string, ChestState>>>;
  readonly doorStates: Record<string, DoorState>;
  readonly spawnedReinforcements: readonly string[];
  readonly setSpawnedReinforcements: React.Dispatch<React.SetStateAction<string[]>>;
  readonly chapterOutcome: 'ongoing' | 'victory' | 'defeat';
  readonly setChapterOutcome: React.Dispatch<React.SetStateAction<'ongoing' | 'victory' | 'defeat'>>;
  readonly queueOverflows: (events: readonly GameEvent[]) => void;
  readonly setPendingLevelUp: (lu: LevelUpEvent) => void;
  readonly queueLevelUps?: (events: readonly LevelUpEvent[]) => void;
  readonly levelUpQueueRef?: React.MutableRefObject<LevelUpEvent[]>;
  readonly setPopupQueue: React.Dispatch<React.SetStateAction<CombatPopupData[]>>;
  readonly popupQueueRef: React.MutableRefObject<CombatPopupData[]>;
  readonly popupIdRef: React.MutableRefObject<number>;
  readonly setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  readonly showNotice: (msg: string) => void;
  readonly setActiveMovingUnit: (amu: ActiveMovingUnit | null) => void;
}

export function useTurnFlow({
  initialUnits,
  extendedUnits,
  setExtendedUnits,
  currentChapter,
  chapterObjective,
  currentDialogues,
  mapData,
  openedDoorKeys,
  gold,
  villageStates,
  setVillageStates,
  chestStates,
  setChestStates,
  spawnedReinforcements,
  setSpawnedReinforcements,
  chapterOutcome,
  setChapterOutcome,
  queueOverflows,
  setPendingLevelUp,
  queueLevelUps,
  levelUpQueueRef,
  setPopupQueue,
  popupQueueRef,
  popupIdRef,
  setCombatLog,
  showNotice,
  setActiveMovingUnit,
}: UseTurnFlowParams) {
  const [turnManager] = useState<TurnManager>(() => new TurnManager(initialUnits.map((u) => u.unit)));
  const [turnState, setTurnState] = useState<TurnState>(() => turnManager.getState());

  const [autoEndTurn, setAutoEndTurnState] = useState<boolean>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('water-emblem-auto-end-turn') : null;
    return saved === 'on';
  });

  useEffect(() => {
    turnManager.setAutoEndTurn(autoEndTurn);
    try { localStorage.setItem('water-emblem-auto-end-turn', autoEndTurn ? 'on' : 'off'); } catch { /* unavailable */ }
  }, [autoEndTurn, turnManager]);

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const skipEnemyPhaseRef = useRef(false);
  const skipEnemyPhase = () => {
    skipEnemyPhaseRef.current = true;
    setPopupQueue([]);
  };

  const [activeActingEnemyId, setActiveActingEnemyId] = useState<string | null>(null);
  const [activePhaseBanner, setActivePhaseBanner] = useState<'player' | 'enemy' | 'reinforcements' | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const showBanner = (banner: 'player' | 'enemy' | 'reinforcements' | null, durationMs = 0) => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setActivePhaseBanner(banner);
    if (banner && durationMs > 0) {
      bannerTimerRef.current = window.setTimeout(() => {
        setActivePhaseBanner(null);
        bannerTimerRef.current = null;
      }, durationMs);
    }
  };

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const syncState = () => {
    const state = turnManager.getState();
    setTurnState({ ...state });
    setExtendedUnits((prev) => prev.map((entry) => {
      const unit = state.units.find((u) => u.id === entry.unit.id);
      return unit && unit !== entry.unit ? { ...entry, unit } : entry;
    }));
  };

  const adoptTurnUnitsInPlace = () => {
    const turnUnits = turnManager.getState().units;
    for (const entry of extendedUnits) {
      const unit = turnUnits.find((u) => u.id === entry.unit.id);
      if (unit && unit !== entry.unit) entry.unit = unit;
    }
  };

  const handleEndTurn = () => {
    soundManager.playSfx('enemy_phase');
    showBanner('enemy', balanceConfig.durations?.phaseBannerMs ?? 1000);
    turnManager.switchPhase('enemy_phase');
    syncState();
  };

  const checkChapterOutcome = (units: readonly ExtendedUnitState[]) => {
    const outcome = evaluateChapterOutcome(
      units.map((u) => u.unit),
      chapterObjective,
      false,
      currentChapter.lordUnitId,
      { turnNumber: turnState.turnNumber },
    );
    if (outcome !== 'ongoing') {
      setChapterOutcome(outcome);
    }
  };

  const runAITurn = async () => {
    setIsProcessingAI(true);
    skipEnemyPhaseRef.current = false;
    const fastPlayback = isFastAnimation();
    const sleep = (ms: number) => new Promise<void>((resolve) => {
      if (fastPlayback || skipEnemyPhaseRef.current) {
        resolve();
        return;
      }
      window.setTimeout(resolve, ms);
    });

    const onSkipKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape' || e.key === 'Enter') {
        skipEnemyPhase();
      }
    };
    window.addEventListener('keydown', onSkipKeyDown);

    try {
      const scrollToTile = (pos: Position) => {
        if (skipEnemyPhaseRef.current) return;
        document.querySelector(`[data-testid="tile-${pos.x}-${pos.y}"]`)?.scrollIntoView({
          behavior: fastPlayback ? 'auto' : 'smooth', block: 'center', inline: 'center',
        });
      };

      const animateEnemyMove = async (enemy: ExtendedUnitState, dest: Position) => {
        if (enemy.unit.position.x === dest.x && enemy.unit.position.y === dest.y) return;
        if (skipEnemyPhaseRef.current) {
          phaseUnits = phaseUnits.map((u) => u.unit.id === enemy.unit.id ? { ...u, unit: { ...u.unit, position: { ...dest } } } : u);
          setExtendedUnits([...phaseUnits]);
          return;
        }
        const range = calculateMovementRange(enemy.unit, {
          map: mapData,
          terrains: defaultTerrainRegistry,
          units: phaseUnits.map((u) => u.unit),
          openedDoors: openedDoorKeys,
        });
        const path = range.get(`${dest.x},${dest.y}`)?.path;
        if (path && path.length > 1) {
          await new Promise<void>((resolve) => {
            runMovementAnimation(path, enemy.unit.moveType, soundManager, (pos) => {
              setActiveMovingUnit({ unitId: enemy.unit.id, pos });
              if (!fastPlayback && !skipEnemyPhaseRef.current) scrollToTile(pos);
            }, () => {
              phaseUnits = phaseUnits.map((u) => u.unit.id === enemy.unit.id ? { ...u, unit: { ...u.unit, position: { ...dest } } } : u);
              setExtendedUnits([...phaseUnits]);
              setActiveMovingUnit(null);
              resolve();
            });
          });
        } else {
          phaseUnits = phaseUnits.map((u) => u.unit.id === enemy.unit.id ? { ...u, unit: { ...u.unit, position: { ...dest } } } : u);
          setExtendedUnits([...phaseUnits]);
        }
      };

      const phaseResult = runEnemyPhase({
        mapData,
        chapter: currentChapter,
        chapterObjective,
        items: itemsJson.items as ItemDefinition[],
        itemById: ITEM_BY_ID,
        dialogues: currentDialogues,
        turnNumber: turnState.turnNumber,
        openedDoors: openedDoorKeys,
        gold,
        villageStates,
        chestStates,
        spawnedReinforcements: [...spawnedReinforcements],
        units: extendedUnits,
      }, defaultRNG);

      let phaseUnits = healUnitsOnTerrain(
        extendedUnits.map((entry) => ({ ...entry, unit: { ...entry.unit }, stats: { ...entry.stats } })),
        'enemy', mapData, defaultTerrainRegistry,
      );

      for (const step of phaseResult.steps) {
        const enemy = phaseUnits.find((u) => u.unit.id === step.enemy.unit.id) ?? step.enemy;
        const decision = step.decision;
        setActiveActingEnemyId(enemy.unit.id);
        scrollToTile(enemy.unit.position);
        if (!fastPlayback && !skipEnemyPhaseRef.current) await sleep(balanceConfig.durations?.aiFocusMs ?? 200);

        if (decision.type === 'attack') {
          if (decision.weapon.id !== enemy.weapon?.id) {
            phaseUnits = phaseUnits.map((u) => u.unit.id === enemy.unit.id ? { ...u, weapon: decision.weapon } : u);
          }
          scrollToTile(enemy.unit.position);
          await animateEnemyMove(enemy, step.movePosition);
          await sleep(balanceConfig.durations?.aiFocusMs ?? 200);

          if (step.rawCombatResult && step.hpBefore && !skipEnemyPhaseRef.current) {
            const targetEntry = phaseUnits.find((u) => u.unit.id === decision.targetUnit.id);
            if (targetEntry) {
              const popup = buildCombatPopup(++popupIdRef.current, enemy, targetEntry, step.hpBefore, step.rawCombatResult);
              setPopupQueue((queue) => [...queue, popup]);
              while (!fastPlayback && !skipEnemyPhaseRef.current && popupQueueRef.current.some((entry) => entry.id === popup.id)) {
                await sleep(100);
              }
              await sleep(balanceConfig.durations?.aiActionPauseMs ?? 150);
            }
          }

          if (step.combatResult) {
            if (!skipEnemyPhaseRef.current) {
              for (const cue of step.combatResult.soundCues) {
                if (cue.type === 'weapon') soundManager.playWeaponHit(cue.weaponType ?? 'axe');
                else soundManager.playSfx(cue.type);
              }
            }
            if (step.combatResult.defeatEvents.length > 0) {
              queueOverflows(step.combatResult.defeatEvents);
            }
            if (step.combatResult.levelUps && step.combatResult.levelUps.length > 0) {
              const playerLevelUps = step.combatResult.levelUps.filter((lu) => lu.unit.unit.faction === 'player');
              if (playerLevelUps.length > 0) {
                if (queueLevelUps) {
                  queueLevelUps(playerLevelUps);
                } else {
                  setPendingLevelUp(playerLevelUps[0]!);
                }
                while (levelUpQueueRef?.current && levelUpQueueRef.current.length > 0 && !skipEnemyPhaseRef.current) {
                  await sleep(100);
                }
              }
            }
          }
        } else if (step.decision.type === 'staff') {
          scrollToTile(enemy.unit.position);
          await animateEnemyMove(enemy, step.movePosition);
          await sleep(200);
          if (!skipEnemyPhaseRef.current) soundManager.playSfx('heal');
          await sleep(200);
        } else if (step.decision.type === 'item_use') {
          scrollToTile(enemy.unit.position);
          await animateEnemyMove(enemy, step.movePosition);
          if (!skipEnemyPhaseRef.current) soundManager.playSfx('heal');
          await sleep(200);
        } else if (step.decision.type === 'move_only') {
          scrollToTile(enemy.unit.position);
          await animateEnemyMove(enemy, step.movePosition);
          await sleep(100);
        }

        if (step.lootedChestId) {
          setChestStates((prev) => ({ ...prev, [step.lootedChestId!]: 'opened' }));
        }

        if (step.unitsAfter) {
          phaseUnits = step.unitsAfter.map((u) => ({ ...u, unit: { ...u.unit }, stats: { ...u.stats } }));
        } else {
          phaseUnits = phaseUnits.map((u) => u.unit.id === enemy.unit.id ? { ...u, unit: { ...u.unit, hasActed: true } } : u);
        }
        setActiveActingEnemyId(null);
        setExtendedUnits([...phaseUnits]);

        if (step.events.some((e) => e.type === 'chapter_outcome')) break;
      }

      setActiveActingEnemyId(null);
      setVillageStates(phaseResult.state.villageStates);
      setChestStates(phaseResult.state.chestStates);

      const reinforcementsSpawned = phaseResult.state.spawnedReinforcements.length > spawnedReinforcements.length;
      if (reinforcementsSpawned) {
        setSpawnedReinforcements([...phaseResult.state.spawnedReinforcements]);
        const rDuration = balanceConfig.durations?.reinforcementBannerMs ?? 1200;
        showBanner('reinforcements', rDuration);
        await sleep(rDuration);
        showBanner(null, 0);
      }

      setCombatLog((prev) => [...phaseResult.state.logs, ...prev].slice(0, 30));

      if (phaseResult.state.chapterOutcome !== 'ongoing') {
        setChapterOutcome(phaseResult.state.chapterOutcome as 'victory' | 'defeat');
      } else {
        if (!skipEnemyPhaseRef.current) soundManager.playSfx('player_phase');
        const pDuration = balanceConfig.durations?.phaseBannerMs ?? 1000;
        showBanner('player', pDuration);
        await sleep(pDuration);
        showBanner(null, 0);
        turnManager.switchPhase('player_phase');
        if (phaseResult.state.announcements.length > 0) {
          showNotice(phaseResult.state.announcements[0]!);
          setCombatLog((prev) => [phaseResult.state.announcements[0]!, ...prev]);
        }
      }

      turnManager.replaceUnits(phaseResult.state.units.map(({ unit }) => unit));
      setExtendedUnits(phaseResult.state.units);
    } finally {
      window.removeEventListener('keydown', onSkipKeyDown);
      setIsProcessingAI(false);
      syncState();
    }
  };

  useEffect(() => {
    if (turnState.activePhase !== 'enemy_phase' || chapterOutcome !== 'ongoing') return;
    const timer = window.setTimeout(runAITurn, 400);
    return () => window.clearTimeout(timer);
  }, [turnState.activePhase, chapterOutcome]);

  return {
    turnManager,
    turnState,
    setTurnState,
    autoEndTurn,
    setAutoEndTurnState,
    isProcessingAI,
    skipEnemyPhase,
    activeActingEnemyId,
    activePhaseBanner,
    setActivePhaseBanner,
    syncState,
    adoptTurnUnitsInPlace,
    handleEndTurn,
    checkChapterOutcome,
  };
}
