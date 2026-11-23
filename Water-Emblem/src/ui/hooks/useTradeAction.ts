import { useState, useRef, useMemo } from 'react';
import type { ExtendedUnitState } from '../../core/data/chapterData';
import type { Position } from '../../core/grid/types';
import type { TurnManager } from '../../core/turn/turnManager';
import { getTradePartners, tradeMove, tradeSwap } from '../../core/data/trade';
import { ITEM_BY_ID } from './itemCatalog';
import { buildTradeSide } from './actionTargetingHelpers';

export interface UseTradeActionParams {
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly pendingMovePos: Position | null;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly turnManager: TurnManager;
  readonly syncState: () => void;
  readonly showNotice: (msg: string) => void;
}

export function useTradeAction({
  selectedExtUnit,
  pendingMovePos,
  extendedUnits,
  setExtendedUnits,
  turnManager,
  syncState,
  showNotice,
}: UseTradeActionParams) {
  const [tradeTargeting, setTradeTargeting] = useState(false);
  const [tradeState, setTradeState] = useState<{ partnerId: string | null } | null>(null);
  const tradeChangedRef = useRef(false);

  const tradePartners = selectedExtUnit && pendingMovePos && !selectedExtUnit.unit.hasTraded
    ? getTradePartners(extendedUnits, selectedExtUnit, pendingMovePos)
    : [];

  const tradeTargetKeys = useMemo(
    () => new Set(tradePartners.map((t) => `${t.unit.position.x},${t.unit.position.y}`)),
    [tradePartners],
  );

  const handleTrade = () => {
    if (tradePartners.length === 0) return;
    if (tradePartners.length === 1) {
      tradeChangedRef.current = false;
      setTradeState({ partnerId: tradePartners[0]!.unit.id });
    } else {
      setTradeTargeting(true);
      showNotice('🔁 Trade: choose a partner on the map.');
    }
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
    if (selectedExtUnit && tradeState?.partnerId && tradeChangedRef.current) {
      const next = extendedUnits.map((entry) =>
        entry.unit.id === selectedExtUnit.unit.id ? { ...entry, unit: { ...entry.unit, hasTraded: true } } : entry);
      setExtendedUnits(next);
      turnManager.replaceUnits(next.map((entry) => entry.unit));
    }
    setTradeState(null);
    syncState();
  };

  const tradeProps = useMemo(() => {
    if (!tradeState || !selectedExtUnit || !pendingMovePos) return null;
    const partner = tradeState.partnerId ? extendedUnits.find((u) => u.unit.id === tradeState.partnerId) : undefined;
    return {
      left: buildTradeSide(selectedExtUnit, ITEM_BY_ID),
      right: partner ? buildTradeSide(partner, ITEM_BY_ID) : null,
      partnerChoices: tradePartners.map((p) => ({ unitId: p.unit.id, unitName: p.unit.name, avatarUrl: p.avatarUrl })),
      onPickPartner: (unitId: string) => { tradeChangedRef.current = false; setTradeState({ partnerId: unitId }); },
      onSwap: handleTradeSwap,
      onMove: handleTradeMove,
      onClose: handleTradeClose,
    };
  }, [tradeState, selectedExtUnit, pendingMovePos, extendedUnits, tradePartners]);

  return {
    tradeTargeting,
    setTradeTargeting,
    tradeState,
    setTradeState,
    tradeChangedRef,
    tradePartners,
    tradeTargetKeys,
    handleTrade,
    handleTradeSwap,
    handleTradeMove,
    handleTradeClose,
    tradeProps,
  };
}
