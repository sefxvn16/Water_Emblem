import { GridUnit } from '../grid/types';

export type ChapterOutcome = 'ongoing' | 'victory' | 'defeat';

export interface ChapterObjective {
  readonly type: 'defeat_boss' | 'rout' | 'seize';
  readonly bossUnitId?: string;
  readonly seizeTargetTile?: { x: number; y: number };
  readonly description?: string;
  readonly descriptionVi?: string;
}

export function evaluateChapterOutcome(
  units: readonly GridUnit[],
  objective: ChapterObjective,
  seizeCommandUsed = false,
  lordUnitId?: string,
): ChapterOutcome {
  // Defeat when the lord falls. Without an explicit lord id the first player unit is the lord.
  const lord = lordUnitId === undefined
    ? units.find((u) => u.faction === 'player')
    : units.find((u) => u.id === lordUnitId);
  if (!lord || lord.isDead) {
    return 'defeat';
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
