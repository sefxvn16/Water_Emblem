import balanceConfig from '../../../data/balance.json' with { type: 'json' };
import { calculateMovementRange } from '../grid/pathfinding';
import { getElevation, TerrainRegistry } from '../grid/terrain';
import { GridUnit, MapData, Position } from '../grid/types';
import {
  calculateCombatForecast,
  getManhattanDistance,
} from '../combat/calculator';
import { CombatForecast, ItemDefinition, UnitCombatStats } from '../combat/types';
import { hitProbability } from '../combat/rng';
import { getAttackRange, isWeaponUsable } from '../class/classRules';
import { isHealStaff } from '../combat/staff';
import { getSkillModifiers } from '../combat/skills';

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

export interface AIActionMove {
  readonly type: 'move_only';
  readonly movePosition: Position;
}

export interface AIActionWait {
  readonly type: 'wait';
}

export type AIDecision = AIActionAttack | AIActionStaff | AIActionMove | AIActionWait;

export interface AIContext {
  readonly map: MapData;
  readonly terrains: TerrainRegistry;
  readonly units: readonly GridUnit[];
  readonly unitStatsMap: Map<string, UnitCombatStats>;
  readonly unitWeaponsMap: Map<string, ItemDefinition | undefined>;
  /** Skill ids per unit (PLAN items 112/113). */
  readonly unitSkillsMap?: ReadonlyMap<string, readonly string[]>;
  /** Unit levels for level-based skills (PLAN item 152, Sure Strike). */
  readonly unitLevelsMap?: ReadonlyMap<string, number>;
  /** Sphere holders by unit id (PLAN item 120). */
  readonly sphereHolders?: { readonly light: ReadonlySet<string>; readonly dark: ReadonlySet<string> };
  readonly villageTargets?: readonly Position[];
  /** Unopened chest tiles for the thief role (PLAN item 110). */
  readonly chestTargets?: readonly Position[];
  /** Waypoints for the patrol role (PLAN item 110). */
  readonly patrolTargets?: readonly Position[];
  /** Current turn number; patrol picks waypoint turnNumber % count. */
  readonly turnNumber?: number;
  /** Opened door tiles as "x,y" keys (PLAN item 92). */
  readonly openedDoors?: ReadonlySet<string>;
  /** Full inventory per unit (PLAN item 177). */
  readonly unitInventoriesMap?: ReadonlyMap<string, readonly { itemId: string; uses: number }[]>;
  /** Item definitions catalog (PLAN item 177). */
  readonly itemsCatalog?: ReadonlyMap<string, ItemDefinition>;
}

export function evaluateAITurn(
  enemyUnit: GridUnit,
  role: AIRole,
  context: AIContext
): AIDecision {
  const { map, terrains, units, unitStatsMap, unitWeaponsMap } = context;

  const enemyStats = unitStatsMap.get(enemyUnit.id);
  const enemyWeapon = unitWeaponsMap.get(enemyUnit.id);

  if (!enemyStats) {
    return { type: 'wait' };
  }

  // Thu thập danh sách vũ khí và gậy khả dụng của đơn vị
  const availableWeapons: ItemDefinition[] = [];
  const availableStaves: ItemDefinition[] = [];

  const invEntries = context.unitInventoriesMap?.get(enemyUnit.id);
  if (invEntries && context.itemsCatalog) {
    for (const entry of invEntries) {
      if (entry.uses <= 0) continue;
      const def = context.itemsCatalog.get(entry.itemId);
      if (!def) continue;
      if (isHealStaff(def) && isWeaponUsable(enemyUnit, def)) {
        availableStaves.push(def);
      } else if (def.type !== 'staff' && def.type !== 'consumable' && isWeaponUsable(enemyUnit, def)) {
        availableWeapons.push(def);
      }
    }
  }

  if (availableWeapons.length === 0 && enemyWeapon && enemyWeapon.type !== 'staff') {
    availableWeapons.push(enemyWeapon);
  }
  if (availableStaves.length === 0 && enemyWeapon && isHealStaff(enemyWeapon)) {
    availableStaves.push(enemyWeapon);
  }

  // Quét tầm di chuyển của AI
  const reachableTiles = calculateMovementRange(enemyUnit, {
    map,
    terrains,
    units,
    openedDoors: context.openedDoors,
  });

  // PLAN item 110 (B10): flee/retreat/thief/patrol roles.
  const playerUnitsForRoles = units.filter((u) => u.faction === 'player' && !u.isDead && !u.hasEscaped);
  const bestFleeTile = (): Position | undefined => {
    let best: Position | undefined;
    let bestScore = -Infinity;
    for (const { position } of reachableTiles.values()) {
      const minDist = playerUnitsForRoles.length === 0
        ? 0
        : Math.min(...playerUnitsForRoles.map((p) => getManhattanDistance(position, p.position)));
      const terrainId = map.grid[position.y]?.[position.x] ?? 'plains';
      const score = minDist * balanceConfig.aiWeights.fleeDistanceWeight + terrains.getAvoidBonus(terrainId, enemyUnit.moveType);
      if (score > bestScore) {
        bestScore = score;
        best = position;
      }
    }
    return best;
  };
  const fleeDecision = (): AIDecision => {
    const tile = bestFleeTile();
    return tile && (tile.x !== enemyUnit.position.x || tile.y !== enemyUnit.position.y)
      ? { type: 'move_only', movePosition: tile }
      : { type: 'wait' };
  };

  if (role === 'flee') return fleeDecision();
  // Retreat: fall back below the HP fraction in data/balance.json [Giả định], otherwise pursue.
  if (role === 'retreat' && enemyStats.hp < enemyStats.maxHp * balanceConfig.aiWeights.retreatHpFraction) return fleeDecision();
  if (role === 'thief') {
    const lootTargets = [...(context.chestTargets ?? []), ...(context.villageTargets ?? [])];
    if (lootTargets.length === 0) return fleeDecision();
    const target = lootTargets.reduce((best, tile) =>
      getManhattanDistance(enemyUnit.position, tile) < getManhattanDistance(enemyUnit.position, best)
        ? tile : best);
    const destination = Array.from(reachableTiles.values())
      .map(({ position }) => position)
      .sort((a, b) => getManhattanDistance(a, target) - getManhattanDistance(b, target))[0];
    return destination ? { type: 'move_only', movePosition: destination } : { type: 'wait' };
  }

  // FE3 thieves head for unvisited villages before seeking combat.
  if (role === 'pillage' && context.villageTargets?.length) {
    const target = context.villageTargets.reduce((best, village) =>
      getManhattanDistance(enemyUnit.position, village) < getManhattanDistance(enemyUnit.position, best)
        ? village : best);
    const destination = Array.from(reachableTiles.values())
      .map(({ position }) => position)
      .sort((a, b) => getManhattanDistance(a, target) - getManhattanDistance(b, target))[0];
    return destination ? { type: 'move_only', movePosition: destination } : { type: 'wait' };
  }

  // Ô ứng viên di chuyển: stationary chỉ xét ô hiện tại
  const candidateTiles =
    role === 'stationary'
      ? [enemyUnit.position]
      : Array.from(reachableTiles.values()).map((r) => r.position);

  // 1. Đánh giá hành động dùng gậy chữa trị (Staff Healing)
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
            const baseHeal = staff.healBase ?? 10;
            const magDiv = staff.healMagDivisor ?? 1;
            const rawHeal = baseHeal + Math.floor((enemyStats.mag ?? 0) / magDiv);
            const healAmount = Math.min(rawHeal, allyStats.maxHp - allyStats.hp);
            if (healAmount <= 0) continue;

            const weights = balanceConfig.aiWeights as any;
            let staffScore = (weights.healStaffBaseScore ?? 40) + healAmount * (weights.healPerHpWeight ?? 2);
            if (allyStats.hp <= allyStats.maxHp * (weights.lowHpThreshold ?? 0.4)) {
              staffScore += (weights.lowHpTargetBonus ?? 15) * 2;
            }
            if (ally.id.includes('boss') || ally.id === 'gazzak') {
              staffScore += 30;
            }

            potentialStaffActions.push({
              type: 'staff',
              movePosition: tile,
              targetUnit: ally,
              staff,
              healAmount,
              score: staffScore,
            });
          }
        }
      }
    }
  }

  // 2. Đánh giá hành động tấn công (Attack Actions) kèm TỰ ĐỔI VŨ KHÍ
  const playerUnits = units.filter((u) => u.faction === 'player' && !u.isDead && !u.hasEscaped);
  const potentialAttacks: AIActionAttack[] = [];

  if (playerUnits.length > 0 && availableWeapons.length > 0) {
    for (const tile of candidateTiles) {
      const attackerTerrainId = map.grid[tile.y]?.[tile.x] ?? 'plains';
      const projectedAttacker = { ...enemyUnit, position: tile };
      const projectedUnits = units.map((unit) => unit.id === enemyUnit.id ? projectedAttacker : unit);

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
            projectedAttacker,
            enemyStats,
            weapon,
            target,
            targetStats,
            targetWeapon,
            distance,
            terrains,
            attackerTerrainId,
            defenderTerrainId,
            projectedUnits,
            { attacker: getElevation(map, tile), defender: getElevation(map, target.position) },
            context.unitSkillsMap ? {
              attacker: getSkillModifiers(context.unitSkillsMap.get(enemyUnit.id) ?? [], projectedAttacker, enemyStats, weapon, targetWeapon, true, projectedUnits, context.unitSkillsMap, context.unitLevelsMap?.get(enemyUnit.id) ?? 0),
              defender: getSkillModifiers(context.unitSkillsMap.get(target.id) ?? [], target, targetStats, targetWeapon, weapon, false, projectedUnits, context.unitSkillsMap, context.unitLevelsMap?.get(target.id) ?? 0),
            } : undefined,
            context.sphereHolders ? {
              attackerHasLight: context.sphereHolders.light.has(enemyUnit.id),
              attackerHasDark: context.sphereHolders.dark.has(enemyUnit.id),
              defenderHasLight: context.sphereHolders.light.has(target.id),
              defenderHasDark: context.sphereHolders.dark.has(target.id),
            } : undefined
          );

          const weights = balanceConfig.aiWeights as any;
          let score = 0;

          const rngMode = balanceConfig.rngMode as '1RN' | '2RN';
          const hitChance = hitProbability(forecast.attacker.hitRate, rngMode);
          const possibleDamage = forecast.attacker.damage * forecast.attacker.attackCount;
          const expectedDamage = possibleDamage * hitChance;
          score += expectedDamage * weights.damageMultiplier;

          // Điểm thưởng kết liễu
          if (possibleDamage >= targetStats.hp) {
            score += weights.killBonus * hitChance;
          }

          // Né phản đòn (Counter-free bonus)
          if (!forecast.defender.canCounter) {
            score += (weights.counterFreeBonus ?? 25);
          } else {
            const counterDamage = forecast.defender.damage * forecast.defender.attackCount
              * hitProbability(forecast.defender.hitRate, rngMode);
            score -= counterDamage * weights.counterDamagePenalty;
            if (counterDamage >= enemyStats.hp && possibleDamage < targetStats.hp) {
              score -= 100;
            }
          }

          // Ưu tiên mục tiêu thấp máu
          if (targetStats.hp <= targetStats.maxHp * weights.lowHpThreshold) {
            score += weights.lowHpTargetBonus;
          }

          // Ưu tiên mục tiêu giá trị cao / mỏng manh
          if (target.classId === 'curate' || target.classId === 'cleric' || target.classId === 'priest') {
            score += 20;
          } else if ((target.classId === 'archer' || target.classId === 'sniper') && distance === 1) {
            score += 15;
          } else if (target.id === 'marth') {
            score += 10;
          }

          // Thưởng vị trí địa hình phòng thủ tốt
          score += terrains.getAvoidBonus(attackerTerrainId, enemyUnit.moveType) * 0.5;

          potentialAttacks.push({
            type: 'attack',
            movePosition: tile,
            targetUnit: target,
            weapon,
            forecast,
            score,
          });
        }
      }
    }
  }

  // 3. Lựa chọn hành động tốt nhất giữa Đánh và Hồi máu
  potentialAttacks.sort((a, b) => b.score - a.score);
  potentialStaffActions.sort((a, b) => b.score - a.score);

  const bestAttack = potentialAttacks[0];
  const bestStaff = potentialStaffActions[0];

  if (bestAttack && bestStaff) {
    return bestStaff.score > bestAttack.score ? bestStaff : bestAttack;
  }
  if (bestStaff) return bestStaff;
  if (bestAttack) return bestAttack;

  // Nếu là vai trò Stationary (đứng giữ vị trí) và không có ai trong tầm -> đứng yên
  if (role === 'stationary') {
    return { type: 'wait' };
  }

  // PLAN item 110: patrol moves toward its current waypoint.
  if (role === 'patrol' && context.patrolTargets && context.patrolTargets.length > 0) {
    const waypoint = context.patrolTargets[(context.turnNumber ?? 1) % context.patrolTargets.length]!;
    const destination = Array.from(reachableTiles.values())
      .map(({ position }) => position)
      .sort((a, b) => getManhattanDistance(a, waypoint) - getManhattanDistance(b, waypoint))[0];
    if (destination && (destination.x !== enemyUnit.position.x || destination.y !== enemyUnit.position.y)) {
      return { type: 'move_only', movePosition: destination };
    }
    return { type: 'wait' };
  }

  // Nếu là vai trò Pursue: di chuyển thông minh về phía người chơi kề cận có địa hình tốt
  if (playerUnits.length === 0) {
    return { type: 'wait' };
  }

  let bestMoveTile: Position = enemyUnit.position;
  let bestMoveScore = -Infinity;

  for (const tile of candidateTiles) {
    let minDistance = Infinity;
    for (const player of playerUnits) {
      const dist = getManhattanDistance(tile, player.position);
      if (dist < minDistance) minDistance = dist;
    }
    const terrainId = map.grid[tile.y]?.[tile.x] ?? 'plains';
    const avoidBonus = terrains.getAvoidBonus(terrainId, enemyUnit.moveType);
    const defBonus = terrains.getDefenseBonus(terrainId, enemyUnit.moveType);
    const moveScore = -minDistance * 10 + defBonus * 4 + avoidBonus * 0.5;
    if (moveScore > bestMoveScore) {
      bestMoveScore = moveScore;
      bestMoveTile = tile;
    }
  }

  if (
    bestMoveTile.x !== enemyUnit.position.x ||
    bestMoveTile.y !== enemyUnit.position.y
  ) {
    return {
      type: 'move_only',
      movePosition: bestMoveTile,
    };
  }

  return { type: 'wait' };
}
