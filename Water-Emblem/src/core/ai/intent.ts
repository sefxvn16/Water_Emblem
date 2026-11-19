import { evaluateAITurn, type AIContext, type AIRole } from './decision';
import { calculateMovementRange } from '../grid/pathfinding';
import type { ExtendedUnitState } from '../data/chapterData';
import type { Position } from '../grid/types';

/**
 * Enemy intent preview (PLAN items 106/107, B02/B03): runs the same AI
 * evaluation the enemy phase will use, against the current board, so the
 * player can see where each enemy plans to move and whom it plans to
 * attack. It is a prediction — moving units can change it — and it uses
 * no hidden information (same inputs as the real AI).
 */

export interface EnemyIntent {
  enemyId: string;
  movePosition: Position;
  path: readonly Position[];
  targetUnitId?: string;
}

export function computeEnemyIntents(
  enemies: readonly ExtendedUnitState[],
  context: AIContext,
): EnemyIntent[] {
  const intents: EnemyIntent[] = [];
  for (const enemy of enemies) {
    if (enemy.unit.isDead) continue;
    const role: AIRole = enemy.aiRole ?? 'pursue';
    const decision = evaluateAITurn(enemy.unit, role, {
      ...context,
      patrolTargets: enemy.patrolPoints,
    });
    if (decision.type === 'wait') continue;
    const range = calculateMovementRange(enemy.unit, {
      map: context.map,
      terrains: context.terrains,
      units: context.units,
      openedDoors: context.openedDoors,
      destroyedObjects: context.destroyedObjects,
    });
    const path = range.get(`${decision.movePosition.x},${decision.movePosition.y}`)?.path
      ?? [enemy.unit.position, decision.movePosition];
    intents.push({
      enemyId: enemy.unit.id,
      movePosition: decision.movePosition,
      path,
      ...(decision.type === 'attack' ? { targetUnitId: decision.targetUnit.id } : {}),
    });
  }
  return intents;
}
