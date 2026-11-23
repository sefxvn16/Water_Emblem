import React from 'react';
import { CombatForecastWindow } from '../CombatForecastWindow';
import { StaffForecastWindow } from '../StaffForecastWindow';
import { ActionMenuWindow, type PendingActions } from '../ActionMenuWindow';
import { WeaponPickerWindow } from '../WeaponPickerWindow';
import { OverflowWindow } from '../OverflowWindow';
import { RewardPopup } from '../RewardPopup';
import { TradeWindow } from '../TradeWindow';
import { ConvoyWindow } from '../ConvoyWindow';
import { ShopWindow } from '../ShopWindow';
import { ArenaWindow } from '../ArenaWindow';
import { UnitInspectorWindow } from '../UnitInspectorWindow';
import { UnitHoverWindow } from '../UnitHoverWindow';
import { TerrainInfoWindow } from '../TerrainInfoWindow';
import { CombatResultPopup } from '../CombatResultPopup';
import { PhaseBanner } from '../PhaseBanner';
import { getAttackWeapons } from '../../core/combat/equip';
import { ITEM_BY_ID } from './itemCatalog';
import type { useSelection } from './useSelection';
import type { useActionTargeting } from './useActionTargeting';
import type { useMapActions } from './useMapActions';
import type { useShopArena } from './useShopArena';
import type { useGameFeedback } from './useGameFeedback';
import type { useTurnFlow } from './useTurnFlow';
import type { useChapterState } from './useChapterState';

export interface BattleWindowsProps {
  readonly selection: ReturnType<typeof useSelection>;
  readonly targeting: ReturnType<typeof useActionTargeting>;
  readonly mapActions: ReturnType<typeof useMapActions>;
  readonly shopArena: ReturnType<typeof useShopArena>;
  readonly feedback: ReturnType<typeof useGameFeedback>;
  readonly turn: ReturnType<typeof useTurnFlow>;
  readonly chapter: ReturnType<typeof useChapterState>;
  readonly actionMenuProps: PendingActions | null;
  readonly mountLabel: string | null;
}

export const BattleWindows: React.FC<BattleWindowsProps> = ({
  selection,
  targeting,
  mapActions,
  shopArena,
  feedback,
  turn,
  chapter,
  actionMenuProps,
  mountLabel,
}) => {
  return (
    <>
      {targeting.combatForecast && selection.selectedExtUnit && targeting.selectedTarget && !selection.activeMovingUnit && (
        <CombatForecastWindow
          forecast={targeting.combatForecast} attacker={selection.selectedExtUnit} defender={targeting.selectedTarget}
          onConfirm={targeting.handleConfirmAttack}
          onCancel={() => { targeting.setCombatForecast(null); targeting.setWeaponPickerOpen(true); }}
        />
      )}

      {targeting.staffForecast && !selection.activeMovingUnit && (
        <StaffForecastWindow forecast={targeting.staffForecast} onConfirm={targeting.handleConfirmStaff} onCancel={targeting.handleCancelStaff} />
      )}

      <ActionMenuWindow
        anchorTile={selection.pendingMovePos ?? selection.selectedExtUnit?.unit.position ?? null}
        mountLabel={mountLabel} actions={actionMenuProps} onToggleMount={mapActions.handleToggleMounted}
        onAttack={targeting.handleAttack} onEquip={targeting.handleEquip} onTrade={targeting.handleTrade}
        onStorage={() => { shopArena.storageChangedRef.current = false; shopArena.setStorageOpen(true); }}
        onShop={() => { shopArena.shopChangedRef.current = false; shopArena.setShopOpen(true); }}
        onOpenChest={mapActions.handleOpenChest} onOpenDoor={mapActions.handleOpenDoor} onArena={() => shopArena.setArenaOpen(true)}
        onStaff={targeting.handleStaff} onSeize={mapActions.handleSeize} onEscape={mapActions.handleEscape} onTransform={mapActions.handleTransform}
        onDance={mapActions.handleDance} onImitate={mapActions.handleImitate} onTalk={mapActions.handleTalk} onUseVulnerary={mapActions.handleUseVulnerary}
        onPromote={mapActions.handlePromote} onVisitVillage={mapActions.handleVisitVillage} onWait={mapActions.handleConfirmWait} onCancelMove={selection.handleCancelMove}
      />

      {targeting.weaponPickerOpen && selection.selectedExtUnit && selection.pendingMovePos && (
        <WeaponPickerWindow
          anchorTile={selection.pendingMovePos} unit={selection.selectedExtUnit.unit}
          weapons={targeting.selectedTarget ? targeting.attackableTargets && getAttackWeapons(selection.selectedExtUnit, ITEM_BY_ID) : getAttackWeapons(selection.selectedExtUnit, ITEM_BY_ID)}
          title="Choose weapon" onPick={targeting.handlePickWeapon}
          onCancel={() => { targeting.setWeaponPickerOpen(false); targeting.setSelectedTarget(null); }}
        />
      )}

      {targeting.staffPickerOpen && selection.selectedExtUnit && selection.pendingMovePos && targeting.selectedStaffTarget && (
        <WeaponPickerWindow
          anchorTile={selection.pendingMovePos} unit={selection.selectedExtUnit.unit}
          weapons={targeting.usableStavesForSelectedTarget} title="Choose staff"
          onPick={targeting.handlePickStaff} onCancel={targeting.handleCancelStaffPicker}
        />
      )}

      {feedback.overflowProps && <OverflowWindow {...feedback.overflowProps} />}

      {feedback.rewardPopups.length > 0 && (
        <RewardPopup data={feedback.rewardPopups[0]!} onClose={() => feedback.setRewardPopups((prev) => prev.slice(1))} />
      )}

      {targeting.tradeProps && <TradeWindow {...targeting.tradeProps} />}
      {shopArena.storageProps && <ConvoyWindow {...shopArena.storageProps} />}
      {shopArena.shopProps && <ShopWindow {...shopArena.shopProps} />}
      {shopArena.arenaProps && <ArenaWindow {...shopArena.arenaProps} />}
      {shopArena.prepConvoyProps && <ConvoyWindow {...shopArena.prepConvoyProps} />}
      {shopArena.prepTradeProps && <TradeWindow {...shopArena.prepTradeProps} />}

      <CombatResultPopup entry={feedback.popupQueue[0] ?? null} onDismiss={() => feedback.setPopupQueue((q) => q.slice(1))} />

      {selection.activeSummaryUnit && selection.activeSummaryTile && !targeting.combatForecast && !selection.inspectedUnit && (
        <UnitHoverWindow
          unit={selection.activeSummaryUnit} tile={selection.activeSummaryTile}
          hasActionBar={Boolean(selection.pendingMovePos && selection.moveCommitted)}
          onInspect={() => selection.setInspectedTile(selection.activeSummaryTile)}
          onMouseEnter={() => {
            selection.isHoveringSummaryRef.current = true;
            if (selection.summaryGraceTimerRef.current) {
              clearTimeout(selection.summaryGraceTimerRef.current);
              selection.summaryGraceTimerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            selection.isHoveringSummaryRef.current = false;
            selection.summaryGraceTimerRef.current = window.setTimeout(() => {
              selection.summaryGraceTimerRef.current = null;
              if (!selection.isHoveringSummaryRef.current) selection.setHoveredUnitSummary(null);
            }, 300);
          }}
        />
      )}

      {!selection.activeSummaryUnit && selection.hoveredTile && selection.hoveredTerrainId && !targeting.combatForecast && !selection.inspectedUnit && (
        <TerrainInfoWindow terrainId={selection.hoveredTerrainId} tile={selection.hoveredTile} />
      )}

      {selection.inspectedUnit && selection.inspectedTile && (
        <UnitInspectorWindow
          unit={selection.inspectedUnit} allUnits={chapter.extendedUnits}
          terrainId={chapter.mapData.grid[selection.inspectedTile.y]?.[selection.inspectedTile.x] ?? 'plains'}
          tile={selection.inspectedTile} onClose={() => selection.setInspectedTile(null)}
        />
      )}

      {feedback.statusNotice && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2e7d32', color: '#fff', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', zIndex: 9999 }}>
          {feedback.statusNotice}
        </div>
      )}

      <PhaseBanner phase={turn.activePhaseBanner} turnNumber={turn.turnState.turnNumber} />
    </>
  );
};
