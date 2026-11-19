import balanceConfig from '../../../data/balance.json';
import { calculateMovementRange } from '../grid/pathfinding';
import { getElevation, TerrainRegistry } from '../grid/terrain';
import { GridUnit, MapData, Position } from '../grid/types';
import {
  calculateCombatForecast,
  getManhattanDistance,
} from '../combat/calculator';
import { CombatForecast, ItemDefinition, UnitCombatStats } from '../combat/types';
import { hitProbability } from '../combat/rng';
import { getAttackRange } from '../class/classRules';
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

export interface AIActionMove {
  readonly type: 'move_only';
  readonly movePosition: Position;
}

export interface AIActionWait {
  readonly type: 'wait';
}

export type AIDecision = AIActionAttack | AIActionMove | AIActionWait;

export interface AIContext {
  readonly map: MapData;
  readonly terrains: TerrainRegistry;
  readonly units: readonly GridUnit[];
  readonly unitStatsMap: Map<string, UnitCombatStats>;
  readonly unitWeaponsMap: Map<string, ItemDefinition | undefined>;
  /** Skill ids per unit (PLAN items 112/113). */
  readonly unitSkillsMap?: ReadonlyMap<string, readonly string[]>;
  readonly villageTargets?: readonly Position[];
  /** Unopened chest tiles for the thief role (PLAN item 110). */
  readonly chestTargets?: readonly Position[];
  /** Waypoints for the patrol role (PLAN item 110). */
  readonly patrolTargets?: readonly Position[];
  /** Current turn number; patrol picks waypoint turnNumber % count. */
  readonly turnNumber?: number;
  /** Opened door tiles as "x,y" keys (PLAN item 92). */
  readonly openedDoors?: ReadonlySet<string>;
  /** Destroyed destructible-object tiles as "x,y" keys (PLAN item 101). */
  readonly destroyedObjects?: ReadonlySet<string>;
}

export function evaluateAITurn(
  enemyUnit: GridUnit,
  role: AIRole,
  context: AIContext
): AIDecision {
  const { map, terrains, units, unitStatsMap, unitWeaponsMap } = context;

  const enemyStats = unitStatsMap.get(enemyUnit.id);
  const enemyWeapon = unitWeaponsMap.get(enemyUnit.id);

  if (!enemyStats || !enemyWeapon) {
    return { type: 'wait' };
  }

  // Quét tầm di chuyển của AI
  const reachableTiles = calculateMovementRange(enemyUnit, {
    map,
    terrains,
    units,
    openedDoors: context.openedDoors,
    destroyedObjects: context.destroyedObjects,
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
      const score = minDist * 10 + terrains.getAvoidBonus(terrainId, enemyUnit.moveType);
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
  // Retreat: fall back when below half HP [Giả định], otherwise pursue.
  if (role === 'retreat' && enemyStats.hp * 2 < enemyStats.maxHp) return fleeDecision();
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

  // Tìm danh sách mục tiêu người chơi còn sống
  const playerUnits = units.filter((u) => u.faction === 'player' && !u.isDead && !u.hasEscaped);
  if (playerUnits.length === 0) {
    return { type: 'wait' };
  }

  const potentialAttacks: AIActionAttack[] = [];

  // Duyệt qua từng ô AI có thể đi tới (hoặc ô hiện tại nếu là stationary)
  const candidateTiles =
    role === 'stationary'
      ? [enemyUnit.position]
      : Array.from(reachableTiles.values()).map((r) => r.position);

  for (const tile of candidateTiles) {
    const attackerTerrainId = map.grid[tile.y]?.[tile.x] ?? 'plains';
    const projectedAttacker = { ...enemyUnit, position: tile };
    const projectedUnits = units.map((unit) => unit.id === enemyUnit.id ? projectedAttacker : unit);

    for (const target of playerUnits) {
      const distance = getManhattanDistance(tile, target.position);
      // Kiểm tra xem khoảng cách có nằm trong tầm bắn của vũ khí không
      const attackRange = getAttackRange(enemyUnit, enemyWeapon);
      if (distance >= attackRange.min && distance <= attackRange.max) {
        const targetStats = unitStatsMap.get(target.id);
        const targetWeapon = unitWeaponsMap.get(target.id);
        if (!targetStats) continue;

        const defenderTerrainId = map.grid[target.position.y]?.[target.position.x] ?? 'plains';

        const forecast = calculateCombatForecast(
          projectedAttacker,
          enemyStats,
          enemyWeapon,
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
            attacker: getSkillModifiers(context.unitSkillsMap.get(enemyUnit.id) ?? [], projectedAttacker, enemyStats, enemyWeapon, targetWeapon, true, projectedUnits, context.unitSkillsMap),
            defender: getSkillModifiers(context.unitSkillsMap.get(target.id) ?? [], target, targetStats, targetWeapon, enemyWeapon, false, projectedUnits, context.unitSkillsMap),
          } : undefined
        );

        // Chấm điểm theo trọng số cấu hình trong data/balance.json
        const weights = balanceConfig.aiWeights;
        let score = 0;

        // Dự tính sát thương gây ra
        const rngMode = balanceConfig.rngMode as '1RN' | '2RN';
        const hitChance = hitProbability(forecast.attacker.hitRate, rngMode);
        const possibleDamage = forecast.attacker.damage * forecast.attacker.attackCount;
        const expectedDamage = possibleDamage * hitChance;
        score += expectedDamage * weights.damageMultiplier;

        // Điểm thưởng kết liễu
        if (possibleDamage >= targetStats.hp) {
          score += weights.killBonus * hitChance;
        }

        // Điểm trừ sát thương phản lại
        if (forecast.defender.canCounter) {
          const counterDamage = forecast.defender.damage * forecast.defender.attackCount
            * hitProbability(forecast.defender.hitRate, rngMode);
          score -= counterDamage * weights.counterDamagePenalty;
        }

        // Ưu tiên mục tiêu đang thấp máu
        if (targetStats.hp <= targetStats.maxHp * 0.4) {
          score += weights.lowHpTargetBonus;
        }

        potentialAttacks.push({
          type: 'attack',
          movePosition: tile,
          targetUnit: target,
          weapon: enemyWeapon,
          forecast,
          score,
        });
      }
    }
  }

  // Nếu tìm thấy đòn tấn công: chọn đòn có điểm cao nhất
  if (potentialAttacks.length > 0) {
    potentialAttacks.sort((a, b) => b.score - a.score);
    const bestAttack = potentialAttacks[0];
    if (bestAttack) {
      return bestAttack;
    }
  }

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

  // Nếu là vai trò Pursue: di chuyển tới ô gần người chơi gần nhất nhất
  let bestMoveTile: Position = enemyUnit.position;
  let minDistanceToClosestPlayer = Infinity;

  for (const tile of candidateTiles) {
    for (const player of playerUnits) {
      const dist = getManhattanDistance(tile, player.position);
      if (dist < minDistanceToClosestPlayer) {
        minDistanceToClosestPlayer = dist;
        bestMoveTile = tile;
      }
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
