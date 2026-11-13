import balanceConfig from '../../../data/balance.json';
import { calculateMovementRange } from '../grid/pathfinding';
import { TerrainRegistry } from '../grid/terrain';
import { GridUnit, MapData, Position } from '../grid/types';
import {
  calculateCombatForecast,
  getManhattanDistance,
} from '../combat/calculator';
import { CombatForecast, ItemDefinition, UnitCombatStats } from '../combat/types';

export type AIRole = 'stationary' | 'pursue';

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
  readonly unitWeaponsMap: Map<string, ItemDefinition>;
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
  });

  // Tìm danh sách mục tiêu người chơi còn sống
  const playerUnits = units.filter((u) => u.faction === 'player' && !u.isDead);
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

    for (const target of playerUnits) {
      const distance = getManhattanDistance(tile, target.position);
      // Kiểm tra xem khoảng cách có nằm trong tầm bắn của vũ khí không
      if (distance >= enemyWeapon.minRange && distance <= enemyWeapon.maxRange) {
        const targetStats = unitStatsMap.get(target.id);
        const targetWeapon = unitWeaponsMap.get(target.id);
        if (!targetStats) continue;

        const defenderTerrainId = map.grid[target.position.y]?.[target.position.x] ?? 'plains';

        const forecast = calculateCombatForecast(
          enemyUnit,
          enemyStats,
          enemyWeapon,
          target,
          targetStats,
          targetWeapon,
          distance,
          terrains,
          attackerTerrainId,
          defenderTerrainId,
          units
        );

        // Chấm điểm theo trọng số cấu hình trong data/balance.json
        const weights = balanceConfig.aiWeights;
        let score = 0;

        // Dự tính sát thương gây ra
        const expectedDamage = forecast.attacker.damage * forecast.attacker.attackCount;
        score += expectedDamage * weights.damageMultiplier;

        // Điểm thưởng kết liễu
        if (expectedDamage >= targetStats.hp) {
          score += weights.killBonus;
        }

        // Điểm trừ sát thương phản lại
        if (forecast.defender.canCounter) {
          const counterDamage = forecast.defender.damage * forecast.defender.attackCount;
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
