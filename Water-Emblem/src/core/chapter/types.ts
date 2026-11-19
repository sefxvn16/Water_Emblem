import { GridUnit } from '../grid/types';

export type ChapterOutcome = 'ongoing' | 'victory' | 'defeat';

export interface ChapterObjective {
  readonly type: 'defeat_boss' | 'rout' | 'seize' | 'protect' | 'escape';
  readonly bossUnitId?: string;
  readonly seizeTargetTile?: { x: number; y: number };
  /** Protect (PLAN item 108): unit that must survive. */
  readonly protectUnitId?: string;
  /** Protect: survive this many turns to win. */
  readonly surviveTurns?: number;
  /** Escape (PLAN item 109): tiles units can escape from. */
  readonly escapeTiles?: readonly { x: number; y: number }[];
  readonly description?: string;
  readonly descriptionVi?: string;
}

export interface OutcomeContext {
  readonly turnNumber?: number;
}

export function evaluateChapterOutcome(
  units: readonly GridUnit[],
  objective: ChapterObjective,
  seizeCommandUsed: boolean,
  lordUnitId: string,
  context: OutcomeContext = {},
): ChapterOutcome {
  const lord = units.find((u) => u.id === lordUnitId);

  // Escape (PLAN item 109): the lord escaping wins the chapter.
  if (objective.type === 'escape' && lord?.hasEscaped) {
    return 'victory';
  }

  // Defeat when the lord falls.
  if (!lord || lord.isDead) {
    return 'defeat';
  }

  // Protect (PLAN item 108): defeat when the protected unit falls;
  // victory after surviving the required turns (or routing the enemy).
  if (objective.type === 'protect') {
    const protectedUnit = objective.protectUnitId
      ? units.find((u) => u.id === objective.protectUnitId)
      : undefined;
    if (objective.protectUnitId && (!protectedUnit || protectedUnit.isDead)) {
      return 'defeat';
    }
    const aliveEnemies = units.filter((u) => u.faction === 'enemy' && !u.isDead);
    if (aliveEnemies.length === 0) return 'victory';
    if (objective.surviveTurns !== undefined
      && (context.turnNumber ?? 1) > objective.surviveTurns) {
      return 'victory';
    }
    return 'ongoing';
  }

  // Kiểm tra điều kiện thắng
  if (objective.type === 'defeat_boss' && objective.bossUnitId) {
    const boss = units.find((u) => u.id === objective.bossUnitId);
    if (!boss || boss.isDead) {
      return 'victory';
    }
  } else if (objective.type === 'rout') {
    const aliveEnemies = units.filter((u) => u.faction === 'enemy' && !u.isDead);
    if (aliveEnemies.length === 0) {
      return 'victory';
    }
  } else if (objective.type === 'seize' && seizeCommandUsed && objective.seizeTargetTile
    && lord.position.x === objective.seizeTargetTile.x
    && lord.position.y === objective.seizeTargetTile.y) {
    return 'victory';
  }

  return 'ongoing';
}
