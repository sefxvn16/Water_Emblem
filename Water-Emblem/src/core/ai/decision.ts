import balanceConfig from '../../../data/balance.json' with { type: 'json' };
import classesJson from '../../../data/classes.json' with { type: 'json' };
import { calculateMovementRange } from '../grid/pathfinding';
import { getElevation, TerrainRegistry } from '../grid/terrain';
import { GridUnit, MapData, Position } from '../grid/types';
import { calculateCombatForecast, getManhattanDistance } from '../combat/calculator';
import { CombatForecast, ItemDefinition, UnitCombatStats } from '../combat/types';
import { hitProbability } from '../combat/rng';
import { getAttackRange, isWeaponUsable } from '../class/classRules';
import { isHealStaff } from '../combat/staff';
import { getSkillModifiers } from '../combat/skills';
import type { ExtendedUnitState } from '../data/chapterData';

export type AIRole = 'stationary' | 'pursue' | 'pillage' | 'patrol' | 'retreat' | 'thief' | 'flee';

export interface AIActionAttack {
  readonly type: 'attack';
  readonly movePosition: Position;
  readonly targetUnit: GridUnit;
  readonly weapon: ItemDefinition;
  readonly forecast: CombatForecast;
  readonly score: number;
}

export interface AIActionStaff {
  readonly type: 'staff';
  readonly movePosition: Position;
  readonly targetUnit: GridUnit;
  readonly staff: ItemDefinition;
  readonly healAmount: number;
  readonly score: number;
}

export interface AIActionItemUse {
  readonly type: 'item_use';
  readonly movePosition: Position;
  readonly item: ItemDefinition;
  readonly healAmount: number;
  readonly score: number;
}

export interface AIActionMove {
  readonly type: 'move_only';
  readonly movePosition: Position;
}

export interface AIActionWait {
  readonly type: 'wait';
}

export type AIDecision = AIActionAttack | AIActionStaff | AIActionItemUse | AIActionMove | AIActionWait;

interface AIWeights {
  readonly counterDamagePenalty: number;
  readonly damageMultiplier: number;
  readonly fleeDistanceWeight: number;
  readonly killBonus: number;
  readonly lowHpTargetBonus: number;
  readonly lowHpThreshold: number;
  readonly retreatHpFraction: number;
  readonly triangleAdvantageBonus: number;
  readonly counterFreeBonus: number;
  readonly healStaffBaseScore: number;
  readonly healPerHpWeight: number;
  readonly antiSuicideThreshold: number;
  readonly selfHealHpThreshold: number;
  readonly selfHealScore: number;
  readonly maxRangeKitingBonus: number;
  readonly antiSuicidePenalty: number;
  readonly lethalCounterPenalty: number;
  readonly bossHealBonus: number;
  readonly threatScanDistance: number;
  readonly targetRoleBonus: Readonly<Record<'healer' | 'ranged' | 'leader', number>>;
}

/** Target-priority role per class, declared as `aiTargetRole` in data/classes.json. */
const targetRoleByClass = new Map<string, string | undefined>(
  classesJson.classes.map((entry) => [entry.id, entry.aiTargetRole]),
);

/** Ids of units flagged `isBoss` in chapter data; feed this into AIContext.bossUnitIds. */
export function collectBossUnitIds(entries: readonly ExtendedUnitState[]): Set<string> {
  return new Set(entries.filter((entry) => entry.isBoss === true).map((entry) => entry.unit.id));
}

export interface AIContext {
  readonly map: MapData;
  readonly terrains: TerrainRegistry;
  readonly units: readonly GridUnit[];
  readonly unitStatsMap: Map<string, UnitCombatStats>;
  readonly unitWeaponsMap: Map<string, ItemDefinition | undefined>;
  readonly unitSkillsMap?: ReadonlyMap<string, readonly string[]>;
  readonly unitLevelsMap?: ReadonlyMap<string, number>;
  readonly sphereHolders?: { readonly light: ReadonlySet<string>; readonly dark: ReadonlySet<string> };
  readonly villageTargets?: readonly Position[];
  readonly chestTargets?: readonly Position[];
  readonly patrolTargets?: readonly Position[];
  readonly turnNumber?: number;
  readonly openedDoors?: ReadonlySet<string>;
  readonly unitInventoriesMap?: ReadonlyMap<string, readonly { itemId: string; uses: number }[]>;
  readonly itemsCatalog?: ReadonlyMap<string, ItemDefinition>;
  /** Units flagged `isBoss` in chapter data (see collectBossUnitIds). */
  readonly bossUnitIds?: ReadonlySet<string>;
}

export function sortEnemyTurnOrder(enemies: readonly ExtendedUnitState[], context: AIContext): ExtendedUnitState[] {
  const getPriority = (entry: ExtendedUnitState): number => {
    const unit = entry.unit;
    const stats = context.unitStatsMap.get(unit.id);
    if (!stats || unit.isDead) return -1;
    const inv = context.unitInventoriesMap?.get(unit.id) ?? entry.inventory;
    const hasHealStaff = inv.some((i) => {
      const def = context.itemsCatalog?.get(i.itemId);
      return def && isHealStaff(def) && isWeaponUsable(unit, def);
    });
    if (hasHealStaff && context.units.some((u) => u.faction === unit.faction && !u.isDead && (context.unitStatsMap.get(u.id)?.hp ?? 999) < (context.unitStatsMap.get(u.id)?.maxHp ?? 999))) {
      return 1000;
    }
    const players = context.units.filter((u) => u.faction === 'player' && !u.isDead);
    for (const p of players) {
      const pStats = context.unitStatsMap.get(p.id);
      if (pStats && getManhattanDistance(unit.position, p.position) <= (balanceConfig.aiWeights as AIWeights).threatScanDistance && (Math.max(stats.str, stats.mag) - pStats.def) * 2 >= pStats.hp) {
        return 900;
      }
    }
    if (inv.some((i) => { const def = context.itemsCatalog?.get(i.itemId); return def && isWeaponUsable(unit, def) && (def.maxRange ?? 1) > 1; })) {
      return 800;
    }
    return (entry.aiRole === 'pursue' || !entry.aiRole) ? 600 : 400;
  };
  return [...enemies].sort((a, b) => getPriority(b) - getPriority(a));
}

export function evaluateAITurn(enemyUnit: GridUnit, role: AIRole, context: AIContext): AIDecision {
  const { map, terrains, units, unitStatsMap, unitWeaponsMap } = context;
  const enemyStats = unitStatsMap.get(enemyUnit.id);
  const enemyWeapon = unitWeaponsMap.get(enemyUnit.id);
  if (!enemyStats) return { type: 'wait' };

  const weights = balanceConfig.aiWeights as AIWeights;
  const availableWeapons: ItemDefinition[] = [];
  const availableStaves: ItemDefinition[] = [];
  const availableConsumables: ItemDefinition[] = [];

  const invEntries = context.unitInventoriesMap?.get(enemyUnit.id);
  if (invEntries && context.itemsCatalog) {
    for (const entry of invEntries) {
      if (entry.uses <= 0) continue;
      const def = context.itemsCatalog.get(entry.itemId);
      if (!def) continue;
      if (isHealStaff(def) && isWeaponUsable(enemyUnit, def)) availableStaves.push(def);
      else if (def.type === 'consumable' && def.itemRole === 'healing' && (def.healAmount ?? 0) > 0) availableConsumables.push(def);
      else if (def.type !== 'staff' && def.type !== 'consumable' && isWeaponUsable(enemyUnit, def)) availableWeapons.push(def);
    }
  }
  if (availableWeapons.length === 0 && enemyWeapon && enemyWeapon.type !== 'staff') availableWeapons.push(enemyWeapon);
  if (availableStaves.length === 0 && enemyWeapon && isHealStaff(enemyWeapon)) availableStaves.push(enemyWeapon);

  const reachableTiles = calculateMovementRange(enemyUnit, { map, terrains, units, openedDoors: context.openedDoors });
  const playerUnitsForRoles = units.filter((u) => u.faction === 'player' && !u.isDead && !u.hasEscaped);

  const fleeDecision = (): AIDecision => {
    let best: Position | undefined;
    let bestScore = -Infinity;
    for (const { position } of reachableTiles.values()) {
      const minDist = playerUnitsForRoles.length === 0 ? 0 : Math.min(...playerUnitsForRoles.map((p) => getManhattanDistance(position, p.position)));
      const terrainId = map.grid[position.y]?.[position.x] ?? 'plains';
      const score = minDist * weights.fleeDistanceWeight + terrains.getAvoidBonus(terrainId, enemyUnit.moveType);
      if (score > bestScore) { bestScore = score; best = position; }
    }
    return best && (best.x !== enemyUnit.position.x || best.y !== enemyUnit.position.y)
      ? { type: 'move_only', movePosition: best } : { type: 'wait' };
  };

  if (role === 'flee') return fleeDecision();
  if (role === 'retreat' && enemyStats.hp < enemyStats.maxHp * weights.retreatHpFraction) return fleeDecision();
  if (role === 'thief') {
    const targets = [...(context.chestTargets ?? []), ...(context.villageTargets ?? [])];
    if (targets.length === 0) return fleeDecision();
    const target = targets.reduce((best, tile) => getManhattanDistance(enemyUnit.position, tile) < getManhattanDistance(enemyUnit.position, best) ? tile : best);
    const destination = Array.from(reachableTiles.values()).map(({ position }) => position).sort((a, b) => getManhattanDistance(a, target) - getManhattanDistance(b, target))[0];
    return destination ? { type: 'move_only', movePosition: destination } : { type: 'wait' };
  }
  if (role === 'pillage' && context.villageTargets?.length) {
    const target = context.villageTargets.reduce((best, v) => getManhattanDistance(enemyUnit.position, v) < getManhattanDistance(enemyUnit.position, best) ? v : best);
    const destination = Array.from(reachableTiles.values()).map(({ position }) => position).sort((a, b) => getManhattanDistance(a, target) - getManhattanDistance(b, target))[0];
    return destination ? { type: 'move_only', movePosition: destination } : { type: 'wait' };
  }

  const candidateTiles = role === 'stationary' ? [enemyUnit.position] : Array.from(reachableTiles.values()).map((r) => r.position);

  // 1. Staff Healing
  const potentialStaffActions: AIActionStaff[] = [];
  if (availableStaves.length > 0) {
    const allyUnits = units.filter((u) => u.faction === enemyUnit.faction && !u.isDead);
    for (const tile of candidateTiles) {
      for (const ally of allyUnits) {
        const allyStats = unitStatsMap.get(ally.id);
        if (!allyStats || allyStats.hp >= allyStats.maxHp) continue;
        const dist = getManhattanDistance(tile, ally.position);
        for (const staff of availableStaves) {
          const minR = staff.minRange ?? 1;
          const maxR = staff.maxRange ?? 1;
          if (dist >= minR && dist <= maxR) {
            const healAmount = Math.min((staff.healBase ?? 10) + Math.floor((enemyStats.mag ?? 0) / (staff.healMagDivisor ?? 1)), allyStats.maxHp - allyStats.hp);
            if (healAmount <= 0) continue;
            let score = weights.healStaffBaseScore + healAmount * weights.healPerHpWeight;
            if (allyStats.hp <= allyStats.maxHp * weights.lowHpThreshold) score += weights.lowHpTargetBonus * 2;
            if (context.bossUnitIds?.has(ally.id)) score += weights.bossHealBonus;
            potentialStaffActions.push({ type: 'staff', movePosition: tile, targetUnit: ally, staff, healAmount, score });
          }
        }
      }
    }
  }

  // 2. Self-Preservation: Vulnerary / healing consumable
  const potentialItemUses: AIActionItemUse[] = [];
  if (availableConsumables.length > 0 && enemyStats.hp <= enemyStats.maxHp * weights.selfHealHpThreshold) {
    const consumable = availableConsumables[0]!;
    const healAmount = consumable.healAmount ?? 10;
    for (const tile of candidateTiles) {
      const terrainId = map.grid[tile.y]?.[tile.x] ?? 'plains';
      const score = weights.selfHealScore + terrains.getAvoidBonus(terrainId, enemyUnit.moveType) * 0.5
        + terrains.getDefenseBonus(terrainId, enemyUnit.moveType) * 2 + Math.min(healAmount, enemyStats.maxHp - enemyStats.hp);
      potentialItemUses.push({ type: 'item_use', movePosition: tile, item: consumable, healAmount, score });
    }
    potentialItemUses.sort((a, b) => b.score - a.score);
  }

  // 3. Attack Actions
  const playerUnits = units.filter((u) => u.faction === 'player' && !u.isDead && !u.hasEscaped);
  const potentialAttacks: AIActionAttack[] = [];

  if (playerUnits.length > 0 && availableWeapons.length > 0) {
    for (const tile of candidateTiles) {
      const attackerTerrainId = map.grid[tile.y]?.[tile.x] ?? 'plains';
      const projectedAttacker = { ...enemyUnit, position: tile };
      const projectedUnits = units.map((u) => u.id === enemyUnit.id ? projectedAttacker : u);

      for (const target of playerUnits) {
        const distance = getManhattanDistance(tile, target.position);
        const targetStats = unitStatsMap.get(target.id);
        const targetWeapon = unitWeaponsMap.get(target.id);
        if (!targetStats) continue;

        const defenderTerrainId = map.grid[target.position.y]?.[target.position.x] ?? 'plains';

        for (const weapon of availableWeapons) {
          const attackRange = getAttackRange(enemyUnit, weapon, attackerTerrainId);
          if (distance < attackRange.min || distance > attackRange.max) continue;

          const forecast = calculateCombatForecast(
            projectedAttacker, enemyStats, weapon, target, targetStats, targetWeapon, distance,
            terrains, attackerTerrainId, defenderTerrainId, projectedUnits,
            { attacker: getElevation(map, tile), defender: getElevation(map, target.position) },
            context.unitSkillsMap ? {
              attacker: getSkillModifiers(context.unitSkillsMap.get(enemyUnit.id) ?? [], projectedAttacker, enemyStats, weapon, targetWeapon, true, projectedUnits, context.unitSkillsMap, context.unitLevelsMap?.get(enemyUnit.id) ?? 0),
              defender: getSkillModifiers(context.unitSkillsMap.get(target.id) ?? [], target, targetStats, targetWeapon, weapon, false, projectedUnits, context.unitSkillsMap, context.unitLevelsMap?.get(target.id) ?? 0),
            } : undefined,
            context.sphereHolders ? {
              attackerHasLight: context.sphereHolders.light.has(enemyUnit.id), attackerHasDark: context.sphereHolders.dark.has(enemyUnit.id),
              defenderHasLight: context.sphereHolders.light.has(target.id), defenderHasDark: context.sphereHolders.dark.has(target.id),
              attackerHasIoteShield: context.unitInventoriesMap?.get(enemyUnit.id)?.some((i) => i.itemId === 'iotes_shield' || i.itemId === 'iote_shield'),
              defenderHasIoteShield: context.unitInventoriesMap?.get(target.id)?.some((i) => i.itemId === 'iotes_shield' || i.itemId === 'iote_shield'),
            } : undefined
          );

          let score = 0;
          const rngMode = balanceConfig.rngMode as '1RN' | '2RN';
          const hitChance = hitProbability(forecast.attacker.hitRate, rngMode);
          const possibleDamage = forecast.attacker.damage * forecast.attacker.attackCount;
          score += possibleDamage * hitChance * weights.damageMultiplier;

          const isKillingBlow = possibleDamage >= targetStats.hp;
          if (isKillingBlow) score += weights.killBonus * hitChance;

          // Expected counter damage, weighted by the counter's hit chance.
          const counterDamage = forecast.defender.canCounter
            ? forecast.defender.damage * forecast.defender.attackCount * hitProbability(forecast.defender.hitRate, rngMode)
            : 0;
          if (!forecast.defender.canCounter) {
            score += weights.counterFreeBonus;
            if (distance > 1) score += weights.maxRangeKitingBonus;
          } else {
            score -= counterDamage * weights.counterDamagePenalty;
            if (counterDamage >= enemyStats.hp && !isKillingBlow) score -= weights.lethalCounterPenalty;
          }

          // Anti-suicide (Awakening / Three Houses): do NOT suicide into high def if counter is lethal.
          // A killing blow ends the fight, so it is never cancelled by this rule.
          if (!isKillingBlow && forecast.attacker.damage <= weights.antiSuicideThreshold && counterDamage >= enemyStats.hp) {
            score -= weights.antiSuicidePenalty;
          }

          // Focus fire: coordinate to eliminate wounded player units
          if (targetStats.hp < targetStats.maxHp) {
            score += (1 - (targetStats.hp / targetStats.maxHp)) * weights.lowHpTargetBonus * 2;
          }

          const targetRole = target.classId ? targetRoleByClass.get(target.classId) : undefined;
          if (targetRole === 'healer') score += weights.targetRoleBonus.healer;
          else if (targetRole === 'ranged' && distance === 1) score += weights.targetRoleBonus.ranged;
          else if (targetRole === 'leader') score += weights.targetRoleBonus.leader;

          score += terrains.getAvoidBonus(attackerTerrainId, enemyUnit.moveType) * 0.5;
          potentialAttacks.push({ type: 'attack', movePosition: tile, targetUnit: target, weapon, forecast, score });
        }
      }
    }
  }

  // 4. Action selection: Staff vs Attack vs Item Use
  potentialAttacks.sort((a, b) => b.score - a.score);
  potentialStaffActions.sort((a, b) => b.score - a.score);

  const validAttacks = potentialAttacks.filter((a) => a.score > 0);
  const bestAttack = validAttacks[0];
  const bestStaff = potentialStaffActions[0];
  const bestItemUse = potentialItemUses[0];

  const candidateActions: AIDecision[] = [];
  if (bestAttack) candidateActions.push(bestAttack);
  if (bestStaff) candidateActions.push(bestStaff);
  if (bestItemUse) candidateActions.push(bestItemUse);

  if (candidateActions.length > 0) {
    candidateActions.sort((a, b) => ('score' in b ? b.score : 0) - ('score' in a ? a.score : 0));
    return candidateActions[0]!;
  }

  if (role === 'stationary') return { type: 'wait' };

  if (role === 'patrol' && context.patrolTargets && context.patrolTargets.length > 0) {
    const waypoint = context.patrolTargets[(context.turnNumber ?? 1) % context.patrolTargets.length]!;
    const destination = Array.from(reachableTiles.values()).map(({ position }) => position)
      .sort((a, b) => getManhattanDistance(a, waypoint) - getManhattanDistance(b, waypoint))[0];
    return destination && (destination.x !== enemyUnit.position.x || destination.y !== enemyUnit.position.y)
      ? { type: 'move_only', movePosition: destination } : { type: 'wait' };
  }

  if (playerUnits.length === 0) return { type: 'wait' };

  let bestMoveTile: Position = enemyUnit.position;
  let bestMoveScore = -Infinity;

  for (const tile of candidateTiles) {
    const minDist = Math.min(...playerUnits.map((p) => getManhattanDistance(tile, p.position)));
    const terrainId = map.grid[tile.y]?.[tile.x] ?? 'plains';
    const moveScore = -minDist * 10 + terrains.getDefenseBonus(terrainId, enemyUnit.moveType) * 4 + terrains.getAvoidBonus(terrainId, enemyUnit.moveType) * 0.5;
    if (moveScore > bestMoveScore) { bestMoveScore = moveScore; bestMoveTile = tile; }
  }

  return (bestMoveTile.x !== enemyUnit.position.x || bestMoveTile.y !== enemyUnit.position.y)
    ? { type: 'move_only', movePosition: bestMoveTile } : { type: 'wait' };
}
