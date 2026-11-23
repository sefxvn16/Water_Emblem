import type { ExtendedUnitState } from '../../core/data/chapterData';
import type { ItemDefinition, CombatForecast } from '../../core/combat/types';
import type { MapData, Position } from '../../core/grid/types';
import type { TradeSide } from '../TradeWindow';
import type { UsableWeapon } from '../../core/combat/equip';
import { getAttackWeapons } from '../../core/combat/equip';
import { getAttackRange, skillIdsOf } from '../../core/class/classRules';
import { getManhattanDistance, calculateCombatForecast } from '../../core/combat/calculator';
import { defaultTerrainRegistry, getElevation } from '../../core/grid/terrain';
import { getSkillModifiers } from '../../core/combat/skills';
import { applyWarpUse, calculateStaffForecast, getStaffTargets, getStavesForTarget, getUsableStaves, getWarpDestinations, isHealStaff, isWarpStaff, type StaffForecast } from '../../core/combat/staff';
import { soundManager } from '../../audio/soundManager';
import { defaultRNG } from '../../core/combat/rng';
import type { TurnManager } from '../../core/turn/turnManager';
import { getClassDefinition } from '../../core/class/classRules';
import { getUsableWeapons } from '../../core/combat/equip';
import { canTransform } from '../../core/combat/transform';
import type { ChapterObjective } from '../../core/chapter/types';
import type { PendingActions } from '../ActionMenuWindow';

export function buildTradeSide(entry: ExtendedUnitState, itemById: ReadonlyMap<string, ItemDefinition>): TradeSide {
  return {
    unitId: entry.unit.id,
    unitName: entry.unit.name,
    avatarUrl: entry.avatarUrl,
    items: entry.inventory.flatMap((item) => {
      const def = itemById.get(item.itemId);
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
  };
}

export function usableWeaponsForTarget(
  selectedExtUnit: ExtendedUnitState | undefined,
  target: ExtendedUnitState,
  itemById: ReadonlyMap<string, ItemDefinition>,
  fromPos?: Position,
): UsableWeapon[] {
  if (!selectedExtUnit) return [];
  const pos = fromPos ?? selectedExtUnit.unit.position;
  const dist = getManhattanDistance(pos, target.unit.position);
  return getAttackWeapons(selectedExtUnit, itemById).filter((weapon) => {
    const range = getAttackRange(selectedExtUnit.unit, weapon.definition);
    return range.max > 0 && dist >= range.min && dist <= range.max;
  });
}

export function computeCombatForecast(
  selectedExtUnit: ExtendedUnitState,
  target: ExtendedUnitState,
  attackWeapon: ItemDefinition | undefined,
  mapData: MapData,
  extendedUnits: readonly ExtendedUnitState[],
  pos: Position,
): CombatForecast {
  const dist = getManhattanDistance(pos, target.unit.position);
  const attackerTerrain = mapData.grid[pos.y]?.[pos.x] ?? 'plains';
  const defenderTerrain = mapData.grid[target.unit.position.y]?.[target.unit.position.x] ?? 'plains';
  const allySkillIds = new Map(extendedUnits.map((u) => [u.unit.id, skillIdsOf(u)]));
  const allGridUnits = extendedUnits.map((u) => u.unit);
  const attackerMods = getSkillModifiers(
    skillIdsOf(selectedExtUnit), selectedExtUnit.unit, selectedExtUnit.stats,
    attackWeapon ?? selectedExtUnit.weapon, target.weapon, true, allGridUnits, allySkillIds, selectedExtUnit.level,
  );
  const defenderMods = getSkillModifiers(
    skillIdsOf(target), target.unit, target.stats, target.weapon,
    attackWeapon ?? selectedExtUnit.weapon, false, allGridUnits, allySkillIds, target.level,
  );
  const holds = (entry: ExtendedUnitState, itemId: string) => entry.inventory.some((i) => i.itemId === itemId);
  return calculateCombatForecast(
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
      attackerHasIoteShield: holds(selectedExtUnit, 'iotes_shield') || holds(selectedExtUnit, 'iote_shield'),
      defenderHasIoteShield: holds(target, 'iotes_shield') || holds(target, 'iote_shield'),
    },
  );
}

export function computeUsableStavesForSelectedTarget(
  selectedExtUnit: ExtendedUnitState | undefined,
  selectedStaffTarget: ExtendedUnitState | null,
  extendedUnits: readonly ExtendedUnitState[],
  itemById: ReadonlyMap<string, ItemDefinition>,
  pos: Position,
): UsableWeapon[] {
  if (!selectedExtUnit || !selectedStaffTarget) return [];
  const staves = getStavesForTarget(extendedUnits, selectedExtUnit, selectedStaffTarget, itemById, pos);
  return staves.map((staff) => {
    const invItem = selectedExtUnit.inventory.find((i) => i.itemId === staff.id);
    return {
      itemId: staff.id,
      definition: staff,
      uses: invItem?.uses ?? 1,
      equipped: selectedExtUnit.weapon?.id === staff.id,
    };
  });
}

export function computeWarpDestinationKeys(
  warpTargeting: { staffId: string; targetId: string } | null,
  extendedUnits: readonly ExtendedUnitState[],
  mapData: MapData,
): Set<string> {
  if (!warpTargeting) return new Set<string>();
  const target = extendedUnits.find((u) => u.unit.id === warpTargeting.targetId);
  if (!target) return new Set<string>();
  return new Set(getWarpDestinations(extendedUnits, target, mapData, defaultTerrainRegistry)
    .map((p) => `${p.x},${p.y}`));
}

export interface TargetingTileClickCtx {
  readonly tradeTargeting: boolean;
  readonly setTradeTargeting: (val: boolean) => void;
  readonly tradePartners: readonly ExtendedUnitState[];
  readonly setTradeState: (val: { partnerId: string | null } | null) => void;
  readonly tradeChangedRef: React.MutableRefObject<boolean>;
  readonly warpTargeting: { staffId: string; targetId: string } | null;
  readonly setWarpTargeting: (val: { staffId: string; targetId: string } | null) => void;
  readonly warpDestinationKeys: ReadonlySet<string>;
  readonly staffTargeting: { staffId?: string } | null;
  readonly setStaffTargeting: (val: { staffId?: string } | null) => void;
  readonly staffTargets: readonly ExtendedUnitState[];
  readonly setSelectedStaffTarget: (u: ExtendedUnitState | null) => void;
  readonly setStaffPickerOpen: (val: boolean) => void;
  readonly setStaffForecast: (f: StaffForecast | null) => void;
  readonly attackTargeting: boolean;
  readonly setAttackTargeting: (val: boolean) => void;
  readonly attackableTargets: readonly ExtendedUnitState[];
  readonly selectAttackTarget: (target: ExtendedUnitState, fromPos?: Position) => void;
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly pendingMovePos: Position | null;
  readonly setPendingMovePos: (pos: Position | null) => void;
  readonly setPlannedPath: (path: readonly Position[] | null) => void;
  readonly setMoveOrigin: (pos: Position | null) => void;
  readonly setMoveCommitted: (val: boolean) => void;
  readonly turnManager: TurnManager;
  readonly executeWithMove: (actionFn: () => void) => void;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly setExtendedUnits: React.Dispatch<React.SetStateAction<ExtendedUnitState[]>>;
  readonly setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  readonly syncState: () => void;
  readonly endUnitTurn: () => void;
  readonly mapData: MapData;
  readonly itemById: ReadonlyMap<string, ItemDefinition>;
}

export function handleTargetingTileClick(
  x: number,
  y: number,
  clickedExt: ExtendedUnitState | undefined,
  ctx: TargetingTileClickCtx,
): boolean {
  if (ctx.tradeTargeting) {
    if (clickedExt && ctx.tradePartners.some((t) => t.unit.id === clickedExt.unit.id)) {
      ctx.setTradeTargeting(false);
      ctx.tradeChangedRef.current = false;
      ctx.setTradeState({ partnerId: clickedExt.unit.id });
    } else if (ctx.pendingMovePos && x === ctx.pendingMovePos.x && y === ctx.pendingMovePos.y) {
      ctx.setTradeTargeting(false);
    }
    return true;
  }
  if (ctx.warpTargeting) {
    if (ctx.warpDestinationKeys.has(`${x},${y}`)) {
      const { staffId, targetId } = ctx.warpTargeting;
      const destination = { x, y };
      ctx.setWarpTargeting(null);
      ctx.executeWithMove(() => {
        if (!ctx.selectedExtUnit) return;
        const result = applyWarpUse(ctx.extendedUnits, ctx.selectedExtUnit.unit.id, targetId, staffId, destination, ctx.itemById, defaultRNG, ctx.mapData, defaultTerrainRegistry);
        if (!result) return;
        ctx.turnManager.replaceUnits(result.units.map(({ unit }) => unit));
        ctx.endUnitTurn();
        ctx.setExtendedUnits(result.units);
        ctx.setCombatLog((prev) => [...result.messages, ...prev].slice(0, 20));
        ctx.syncState();
      });
    } else if (ctx.pendingMovePos && x === ctx.pendingMovePos.x && y === ctx.pendingMovePos.y) {
      ctx.setWarpTargeting(null);
    }
    return true;
  }
  if (ctx.staffTargeting) {
    if (clickedExt && ctx.staffTargets.some((t) => t.unit.id === clickedExt.unit.id)) {
      soundManager.playSfx('cursor');
      const chosenStaffId = ctx.staffTargeting.staffId;
      ctx.setStaffTargeting(null);
      ctx.setSelectedStaffTarget(clickedExt);
      const specifiedStaff = chosenStaffId ? ctx.itemById.get(chosenStaffId) : undefined;
      if (specifiedStaff && isWarpStaff(specifiedStaff)) {
        ctx.setWarpTargeting({ staffId: chosenStaffId!, targetId: clickedExt.unit.id });
        return true;
      }
      const pos = ctx.pendingMovePos ?? ctx.selectedExtUnit?.unit.position ?? clickedExt.unit.position;
      const usableStaves = ctx.selectedExtUnit ? computeUsableStavesForSelectedTarget(ctx.selectedExtUnit, clickedExt, ctx.extendedUnits, ctx.itemById, pos) : [];
      if (usableStaves.length > 1 && !chosenStaffId) {
        ctx.setStaffPickerOpen(true);
        return true;
      }
      const staffToUse = specifiedStaff ?? usableStaves[0]?.definition;
      if (staffToUse && ctx.selectedExtUnit) {
        if (isWarpStaff(staffToUse)) {
          ctx.setWarpTargeting({ staffId: staffToUse.id, targetId: clickedExt.unit.id });
          return true;
        }
        ctx.setStaffForecast(calculateStaffForecast(ctx.selectedExtUnit, clickedExt, staffToUse));
      }
    } else if (ctx.pendingMovePos && x === ctx.pendingMovePos.x && y === ctx.pendingMovePos.y) {
      ctx.setStaffTargeting(null);
    }
    return true;
  }
  if (ctx.attackTargeting) {
    if (clickedExt && clickedExt.unit.faction === 'enemy' && ctx.attackableTargets.some((t) => t.unit.id === clickedExt.unit.id)) {
      ctx.setAttackTargeting(false);
      ctx.selectAttackTarget(clickedExt);
    } else if (ctx.pendingMovePos && x === ctx.pendingMovePos.x && y === ctx.pendingMovePos.y) {
      ctx.setAttackTargeting(false);
    }
    return true;
  }
  if (ctx.selectedExtUnit && ctx.attackableTargets.length > 0 && clickedExt && clickedExt.unit.faction === 'enemy'
    && ctx.attackableTargets.some((t) => t.unit.id === clickedExt.unit.id)) {
    const pos = ctx.pendingMovePos ?? ctx.selectedExtUnit.unit.position;
    if (!ctx.pendingMovePos) {
      ctx.setMoveOrigin(pos);
      ctx.setPendingMovePos(pos);
      ctx.setPlannedPath([pos]);
      ctx.setMoveCommitted(true);
      ctx.turnManager.moveSelectedUnit(pos);
    }
    ctx.setAttackTargeting(false);
    ctx.selectAttackTarget(clickedExt, pos);
    return true;
  }
  return false;
}

export interface ActionMenuHelperContext {
  readonly pendingMovePos: Position | null;
  readonly moveCommitted: boolean;
  readonly selectedExtUnit: ExtendedUnitState | undefined;
  readonly activeMovingUnit: import('../../renderer/movementAnimation').ActiveMovingUnit | null;
  readonly combatForecast: CombatForecast | null;
  readonly staffForecast: StaffForecast | null;
  readonly attackTargeting: boolean;
  readonly tradeTargeting: boolean;
  readonly weaponPickerOpen: boolean;
  readonly staffPickerOpen: boolean;
  readonly tradeState: unknown;
  readonly storageOpen: boolean;
  readonly shopOpen: boolean;
  readonly arenaOpen: boolean;
  readonly staffTargeting: unknown;
  readonly warpTargeting: unknown;
  readonly chapterObjective: ChapterObjective;
  readonly lordUnitId: string;
  readonly talkTargetName: string | null;
  readonly currentVillageName: string | null;
  readonly attackableTargets: readonly ExtendedUnitState[];
  readonly tradePartners: readonly ExtendedUnitState[];
  readonly canStorage: boolean;
  readonly canShop: boolean;
  readonly canArena: boolean;
  readonly currentChestAtPendingPos: boolean;
  readonly currentDoorAtPendingPos: boolean;
  readonly danceTargetName: string | null;
  readonly imitateTargetName: string | null;
  readonly extendedUnits: readonly ExtendedUnitState[];
  readonly itemById: ReadonlyMap<string, ItemDefinition>;
}

export function buildActionMenuActions(ctx: ActionMenuHelperContext): PendingActions | null {
  const { pendingMovePos, moveCommitted, selectedExtUnit, activeMovingUnit, combatForecast, staffForecast, attackTargeting, tradeTargeting, weaponPickerOpen, staffPickerOpen, tradeState, storageOpen, shopOpen, arenaOpen, staffTargeting, warpTargeting, chapterObjective, lordUnitId, talkTargetName, currentVillageName, attackableTargets, tradePartners, canStorage, canShop, canArena, currentChestAtPendingPos, currentDoorAtPendingPos, danceTargetName, imitateTargetName, extendedUnits, itemById } = ctx;
  if (!pendingMovePos || !moveCommitted || combatForecast || staffForecast || attackTargeting || tradeTargeting || activeMovingUnit || weaponPickerOpen || staffPickerOpen || tradeState || storageOpen || shopOpen || arenaOpen || staffTargeting || warpTargeting) return null;
  return {
    unitName: selectedExtUnit?.unit.name,
    canSeize: chapterObjective.type === 'seize' && selectedExtUnit?.unit.id === lordUnitId
      && pendingMovePos.x === chapterObjective.seizeTargetTile?.x && pendingMovePos.y === chapterObjective.seizeTargetTile?.y,
    talkTargetName,
    canUseVulnerary: Boolean(selectedExtUnit && selectedExtUnit.stats.hp < selectedExtUnit.stats.maxHp && selectedExtUnit.inventory.some((i) => i.itemId === 'vulnerary' && i.uses > 0)),
    promotions: selectedExtUnit && selectedExtUnit.level >= 10
      ? (getClassDefinition(selectedExtUnit.unit.classId)?.promotions ?? []).map((id) => ({ id, name: getClassDefinition(id)?.name ?? id })) : [],
    villageName: currentVillageName,
    hasAttackTargets: attackableTargets.length > 0,
    targetPositions: attackableTargets.map((t) => t.unit.position),
    equipOptions: selectedExtUnit ? getUsableWeapons(selectedExtUnit, itemById).filter((w) => !w.equipped).map((w) => ({ itemId: w.itemId, name: w.definition.name })) : [],
    canTrade: tradePartners.length > 0,
    canCancelMove: !selectedExtUnit?.unit.hasTraded && !selectedExtUnit?.unit.hasStored,
    canStorage,
    canShop,
    canOpenChest: currentChestAtPendingPos,
    canOpenDoor: currentDoorAtPendingPos,
    canArena,
    canEscape: chapterObjective.type === 'escape' && Boolean(pendingMovePos && (chapterObjective.escapeTiles ?? []).some((t: Position) => t.x === pendingMovePos.x && t.y === pendingMovePos.y)),
    canTransform: Boolean(selectedExtUnit && canTransform(selectedExtUnit)),
    danceTargetName,
    imitateTargetName,
    staffOptions: selectedExtUnit ? getUsableStaves(selectedExtUnit, itemById).filter((s) => (isHealStaff(s) || isWarpStaff(s)) && getStaffTargets(extendedUnits, selectedExtUnit, s, pendingMovePos).length > 0).map((s) => ({ itemId: s.id, name: s.name })) : [],
  };
}

