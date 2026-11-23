import { useState, useRef, useMemo } from 'react';
import type { ExtendedUnitState, ChapterData, InventoryEntry } from '../../core/data/chapterData';
import type { Position, MapData } from '../../core/grid/types';
import type { TurnManager } from '../../core/turn/turnManager';
import { depositToConvoy, withdrawFromConvoy, CONVOY_SLOTS } from '../../core/data/convoy';
import { buyItem, getShopStock, sellItem, sellValue } from '../../core/data/shop';
import { hasRoomFor } from '../../core/data/inventory';
import { ARENA_TIERS, canEnterArena, generateArenaOpponent, runArenaFight, type ArenaFightOutcome, type ArenaTier } from '../../core/combat/arena';
import { defaultRNG } from '../../core/combat/rng';
import { reclassUnit } from '../../core/class/classRules';
import { soundManager } from '../../audio/soundManager';
import { tradeMove, tradeSwap } from '../../core/data/trade';
import { ITEM_BY_ID } from './itemCatalog';
import { buildTradeSide } from './actionTargetingHelpers';

export interface UseShopArenaParams {
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly pendingMovePos: Position | null;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly reserveUnits: readonly ExtendedUnitState[];
  readonly setReserveUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly convoy: readonly InventoryEntry[];
  readonly setConvoy: React.Dispatch<React.SetStateAction<InventoryEntry[]>>;
  readonly gold: number;
  readonly setGold: React.Dispatch<React.SetStateAction<number>>;
  readonly currentChapter: ChapterData;
  readonly currentChapterId: string;
  readonly mapData: MapData;
  readonly turnManager: TurnManager;
  readonly syncState: () => void;
  readonly executeWithMove: (actionFn: () => void) => void;
  readonly endUnitTurn: () => void;
  readonly setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useShopArena({
  selectedExtUnit, pendingMovePos, extendedUnits, setExtendedUnits, reserveUnits, setReserveUnits,
  convoy, setConvoy, gold, setGold, currentChapter, currentChapterId, mapData, turnManager,
  syncState, executeWithMove, endUnitTurn, setCombatLog,
}: UseShopArenaParams) {
  const [storageOpen, setStorageOpen] = useState(false);
  const storageChangedRef = useRef(false);
  const [shopOpen, setShopOpen] = useState(false);
  const shopChangedRef = useRef(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [arenaTier, setArenaTier] = useState<ArenaTier | null>(null);
  const [arenaOpponent, setArenaOpponent] = useState<ExtendedUnitState | null>(null);
  const [arenaOutcome, setArenaOutcome] = useState<ArenaFightOutcome | null>(null);
  const [prepConvoyUnitId, setPrepConvoyUnitId] = useState<string | null>(null);
  const [prepTrade, setPrepTrade] = useState<{ unitId: string; partnerId: string | null } | null>(null);

  const lordEntry = extendedUnits.find((u) => u.unit.id === currentChapter.lordUnitId && !u.unit.isDead);
  const canStorage = Boolean(selectedExtUnit && pendingMovePos && lordEntry && (
    selectedExtUnit.unit.id === lordEntry.unit.id
    || Math.abs(lordEntry.unit.position.x - pendingMovePos.x)
      + Math.abs(lordEntry.unit.position.y - pendingMovePos.y) === 1
  ));

  const canShop = Boolean(selectedExtUnit && pendingMovePos
    && (mapData.grid[pendingMovePos.y]?.[pendingMovePos.x] ?? 'plains') === 'shop');

  const activeShopGoods = (currentChapter.shops ?? []).find((shop) =>
    (pendingMovePos && shop.position.x === pendingMovePos.x && shop.position.y === pendingMovePos.y)
    || (selectedExtUnit && shop.position.x === selectedExtUnit.unit.position.x
      && shop.position.y === selectedExtUnit.unit.position.y))?.goods;

  const canArena = Boolean(selectedExtUnit && pendingMovePos
    && (mapData.grid[pendingMovePos.y]?.[pendingMovePos.x] ?? 'plains') === 'arena'
    && canEnterArena(selectedExtUnit) && gold >= ARENA_TIERS[0]!.wager);

  const convoyRows = useMemo(() => convoy.flatMap((item) => {
    const def = ITEM_BY_ID.get(item.itemId);
    return def
      ? [{ itemId: item.itemId, name: def.name, uses: item.uses, maxUses: def.maxUses, type: def.type, equipped: false }]
      : [];
  }), [convoy]);

  const handleDeposit = (index: number) => {
    if (!selectedExtUnit) return;
    const result = depositToConvoy(extendedUnits, convoy as InventoryEntry[], selectedExtUnit.unit.id, index, ITEM_BY_ID);
    if (result) {
      storageChangedRef.current = true;
      setExtendedUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  const handleWithdraw = (index: number) => {
    if (!selectedExtUnit) return;
    const result = withdrawFromConvoy(extendedUnits, convoy as InventoryEntry[], selectedExtUnit.unit.id, index, ITEM_BY_ID);
    if (result) {
      storageChangedRef.current = true;
      setExtendedUnits(result.units);
      setConvoy(result.convoy);
    }
  };

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
    const result = buyItem(extendedUnits, convoy as InventoryEntry[], gold, selectedExtUnit.unit.id, itemId, ITEM_BY_ID);
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

  const handleShopClose = () => {
    setShopOpen(false);
    if (shopChangedRef.current) {
      executeWithMove(() => {
        endUnitTurn();
        syncState();
      });
    }
  };

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

  const handlePrepDeposit = (index: number) => {
    if (!prepConvoyUnitId) return;
    const inDeployed = extendedUnits.some((u) => u.unit.id === prepConvoyUnitId);
    const source = inDeployed ? extendedUnits : (reserveUnits as ExtendedUnitState[]);
    const result = depositToConvoy(source, convoy as InventoryEntry[], prepConvoyUnitId, index, ITEM_BY_ID);
    if (result) {
      if (inDeployed) setExtendedUnits(result.units);
      else setReserveUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  const handlePrepWithdraw = (index: number) => {
    if (!prepConvoyUnitId) return;
    const inDeployed = extendedUnits.some((u) => u.unit.id === prepConvoyUnitId);
    const source = inDeployed ? extendedUnits : (reserveUnits as ExtendedUnitState[]);
    const result = withdrawFromConvoy(source, convoy as InventoryEntry[], prepConvoyUnitId, index, ITEM_BY_ID);
    if (result) {
      if (inDeployed) setExtendedUnits(result.units);
      else setReserveUnits(result.units);
      setConvoy(result.convoy);
    }
  };

  const applyPrepTrade = (fn: (units: ExtendedUnitState[]) => ExtendedUnitState[]) => {
    const deployedIds = new Set(extendedUnits.map((u) => u.unit.id));
    const next = fn([...extendedUnits, ...reserveUnits]);
    setExtendedUnits(next.filter((u) => deployedIds.has(u.unit.id)));
    setReserveUnits(next.filter((u) => !deployedIds.has(u.unit.id)));
  };

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
      const next = applyTo([...extendedUnits]);
      setExtendedUnits(next);
      turnManager.replaceUnits(next.map((u) => u.unit));
    } else {
      setReserveUnits(applyTo([...reserveUnits]));
    }
    soundManager.playSfx('accept');
  };

  const prepConvoyProps = useMemo(() => {
    if (!prepConvoyUnitId) return null;
    const entry = [...extendedUnits, ...reserveUnits].find((u) => u.unit.id === prepConvoyUnitId);
    if (!entry) return null;
    return {
      unitName: entry.unit.name,
      unitAvatarUrl: entry.avatarUrl,
      unitItems: buildTradeSide(entry, ITEM_BY_ID).items,
      convoyItems: convoyRows,
      convoyCount: convoy.length,
      convoyCapacity: CONVOY_SLOTS,
      onDeposit: handlePrepDeposit,
      onWithdraw: handlePrepWithdraw,
      onClose: () => setPrepConvoyUnitId(null),
    };
  }, [prepConvoyUnitId, extendedUnits, reserveUnits, convoyRows, convoy.length]);

  const prepTradeProps = useMemo(() => {
    if (!prepTrade) return null;
    const all = [...extendedUnits, ...reserveUnits];
    const left = all.find((u) => u.unit.id === prepTrade.unitId);
    if (!left) return null;
    const partner = prepTrade.partnerId ? all.find((u) => u.unit.id === prepTrade.partnerId) : undefined;
    const partners = all.filter((u) => u.unit.faction === 'player' && !u.unit.isDead && u.unit.id !== left.unit.id);
    return {
      left: buildTradeSide(left, ITEM_BY_ID),
      right: partner ? buildTradeSide(partner, ITEM_BY_ID) : null,
      partnerChoices: partners.map((p) => ({ unitId: p.unit.id, unitName: p.unit.name, avatarUrl: p.avatarUrl })),
      onPickPartner: (unitId: string) => setPrepTrade({ unitId: left.unit.id, partnerId: unitId }),
      onSwap: (leftIndex: number, rightIndex: number) => {
        if (prepTrade.partnerId) applyPrepTrade((units) => tradeSwap(units, left.unit.id, prepTrade.partnerId!, leftIndex, rightIndex, ITEM_BY_ID));
      },
      onMove: (fromSide: 'left' | 'right', index: number) => {
        if (!prepTrade.partnerId) return;
        const fromId = fromSide === 'left' ? left.unit.id : prepTrade.partnerId;
        const toId = fromSide === 'left' ? prepTrade.partnerId : left.unit.id;
        applyPrepTrade((units) => tradeMove(units, fromId, toId, index, ITEM_BY_ID));
      },
      onClose: () => setPrepTrade(null),
    };
  }, [prepTrade, extendedUnits, reserveUnits]);

  const storageProps = useMemo(() => {
    if (!storageOpen || !selectedExtUnit) return null;
    return {
      unitName: selectedExtUnit.unit.name,
      unitAvatarUrl: selectedExtUnit.avatarUrl,
      unitItems: buildTradeSide(selectedExtUnit, ITEM_BY_ID).items,
      convoyItems: convoyRows,
      convoyCount: convoy.length,
      convoyCapacity: CONVOY_SLOTS,
      onDeposit: handleDeposit,
      onWithdraw: handleWithdraw,
      onClose: handleStorageClose,
    };
  }, [storageOpen, selectedExtUnit, convoyRows, convoy.length]);

  const shopProps = useMemo(() => {
    if (!shopOpen || !selectedExtUnit) return null;
    return {
      unitName: selectedExtUnit.unit.name,
      gold,
      stock: getShopStock(ITEM_BY_ID, activeShopGoods).map((def) => ({
        itemId: def.id, name: def.name, type: def.type, price: def.price ?? 0, maxUses: def.maxUses,
        canBuy: gold >= (def.price ?? 0) && (hasRoomFor(selectedExtUnit, def.id, ITEM_BY_ID) || convoy.length < CONVOY_SLOTS),
      })),
      sellItems: selectedExtUnit.inventory.flatMap((item) => {
        const def = ITEM_BY_ID.get(item.itemId);
        return def ? [{
          itemId: item.itemId, name: def.name, type: def.type, uses: item.uses, maxUses: def.maxUses,
          equipped: selectedExtUnit.weapon?.id === item.itemId, sellValue: sellValue(def, item.uses),
        }] : [];
      }),
      onBuy: handleBuy,
      onSell: handleSell,
      onClose: handleShopClose,
    };
  }, [shopOpen, selectedExtUnit, gold, activeShopGoods, convoy.length]);

  const arenaProps = useMemo(() => {
    if (!arenaOpen || !selectedExtUnit) return null;
    return {
      unitName: selectedExtUnit.unit.name,
      gold,
      tier: arenaTier,
      opponent: arenaOpponent,
      outcome: arenaOutcome,
      onSelectTier: handleArenaTier,
      onFight: handleArenaFight,
      onFightAgain: handleArenaAgain,
      onLeave: handleArenaLeave,
    };
  }, [arenaOpen, selectedExtUnit, gold, arenaTier, arenaOpponent, arenaOutcome]);

  return {
    storageOpen,
    setStorageOpen,
    storageChangedRef,
    shopOpen,
    setShopOpen,
    shopChangedRef,
    arenaOpen,
    setArenaOpen,
    arenaTier,
    arenaOpponent,
    arenaOutcome,
    prepConvoyUnitId,
    setPrepConvoyUnitId,
    prepTrade,
    setPrepTrade,
    canStorage,
    canShop,
    canArena,
    activeShopGoods,
    convoyRows,
    handleDeposit,
    handleWithdraw,
    handleStorageClose,
    handleBuy,
    handleSell,
    handleShopClose,
    handleArenaTier,
    handleArenaFight,
    handleArenaAgain,
    handleArenaLeave,
    reclassAvailable,
    handlePrepReclass,
    prepConvoyProps,
    prepTradeProps,
    storageProps,
    shopProps,
    arenaProps,
  };
}
