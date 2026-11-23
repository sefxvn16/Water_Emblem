import { useState, useRef, useEffect, useMemo } from 'react';
import balanceConfig from '../../../data/balance.json' with { type: 'json' };
import type { GameEvent } from '../../core/chapter/events';
import type { LevelUpEvent } from '../../core/combat/combatResolution';
import type { ExtendedUnitState, InventoryEntry } from '../../core/data/chapterData';
import type { CombatPopupData } from '../combatPopupData';
import type { RewardPopupData } from '../RewardPopup';
import { getItemIcon } from '../itemIcon';
import { resolveOverflow, slotKind } from '../../core/data/inventory';
import { CONVOY_SLOTS, sendToConvoy } from '../../core/data/convoy';
import { soundManager } from '../../audio/soundManager';
import { ITEM_BY_ID } from './itemCatalog';

export interface UseGameFeedbackParams {
  readonly activeScreen: 'none' | 'title' | 'book_select' | 'save_slots' | 'world_map';
  readonly showStoryIntro: boolean;
  readonly showPreparation: boolean;
  readonly chapterOutcome: 'ongoing' | 'victory' | 'defeat';
  readonly activePhase: string;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly convoy: readonly InventoryEntry[];
  readonly setConvoy: React.Dispatch<React.SetStateAction<InventoryEntry[]>>;
  readonly syncState: () => void;
}

export function useGameFeedback({
  activeScreen,
  showStoryIntro,
  showPreparation,
  chapterOutcome,
  activePhase,
  extendedUnits,
  setExtendedUnits,
  convoy,
  setConvoy,
  syncState,
}: UseGameFeedbackParams) {
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [popupQueue, setPopupQueue] = useState<CombatPopupData[]>([]);
  const popupQueueRef = useRef<CombatPopupData[]>([]);
  useEffect(() => { popupQueueRef.current = popupQueue; }, [popupQueue]);
  const popupIdRef = useRef(0);

  const [rewardPopups, setRewardPopups] = useState<RewardPopupData[]>([]);
  const [levelUpQueue, setLevelUpQueue] = useState<LevelUpEvent[]>([]);
  const levelUpQueueRef = useRef<LevelUpEvent[]>([]);
  useEffect(() => { levelUpQueueRef.current = levelUpQueue; }, [levelUpQueue]);
  const pendingLevelUp = levelUpQueue[0] ?? null;

  const setPendingLevelUp = (lu: LevelUpEvent | null) => {
    if (lu) setLevelUpQueue((prev) => [...prev, lu]);
    else setLevelUpQueue((prev) => prev.slice(1));
  };
  const queueLevelUps = (events: readonly LevelUpEvent[]) => {
    if (events.length > 0) setLevelUpQueue((prev) => [...prev, ...events]);
  };
  const dismissCurrentLevelUp = () => {
    setLevelUpQueue((prev) => prev.slice(1));
  };

  const [pendingOverflows, setPendingOverflows] = useState<{ unitId: string; itemId: string; itemName: string }[]>([]);

  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const showNotice = (msg: string, duration?: number) => {
    const effectiveDuration = duration ?? balanceConfig.durations?.statusNoticeMs ?? 3000;
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setStatusNotice(msg);
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusNotice(null);
      noticeTimerRef.current = null;
    }, effectiveDuration);
  };

  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setIsMuted(next);
  };

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
    if (activePhase === 'player_phase') {
      soundManager.playBgm('player_phase');
    } else if (activePhase === 'enemy_phase') {
      soundManager.playBgm('enemy_phase');
    }
  }, [activeScreen, showStoryIntro, showPreparation, chapterOutcome, activePhase]);

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
      const nextConvoy = sendToConvoy(convoy as InventoryEntry[], pending.itemId, newUses);
      if (nextConvoy) setConvoy(nextConvoy);
    } else {
      setExtendedUnits((prev) =>
        resolveOverflow(prev, pending.unitId, pending.itemId, newUses, discardItemId, ITEM_BY_ID));
    }
    setPendingOverflows((prev) => prev.slice(1));
    syncState();
  };

  const overflowProps = useMemo(() => {
    const pending = pendingOverflows[0];
    if (!pending) return null;
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
    return {
      unitName: entry.unit.name,
      newItemName: pending.itemName,
      choices,
      onDiscard: (itemId: string) => resolvePendingOverflow(itemId),
      onDiscardNew: () => resolvePendingOverflow(null),
      onSendToConvoy: convoy.length < CONVOY_SLOTS ? () => resolvePendingOverflow('convoy') : undefined,
    };
  }, [pendingOverflows, extendedUnits, convoy.length]);

  return {
    combatLog,
    setCombatLog,
    popupQueue,
    setPopupQueue,
    popupQueueRef,
    popupIdRef,
    rewardPopups,
    setRewardPopups,
    pendingLevelUp,
    setPendingLevelUp,
    levelUpQueue,
    levelUpQueueRef,
    queueLevelUps,
    dismissCurrentLevelUp,
    pendingOverflows,
    setPendingOverflows,
    statusNotice,
    showNotice,
    isMuted,
    volume,
    handleToggleMute,
    handleVolume,
    queueOverflows,
    resolvePendingOverflow,
    overflowProps,
  };
}
