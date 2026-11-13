import { GridUnit } from '../grid/types';

export type ChapterOutcome = 'ongoing' | 'victory' | 'defeat';

export interface ChapterObjective {
  readonly type: 'defeat_boss' | 'rout' | 'seize';
  readonly bossUnitId?: string;
  readonly seizeTargetTile?: { x: number; y: number };
  readonly descriptionVi: string;
}

export function evaluateChapterOutcome(
  units: readonly GridUnit[],
  objective: ChapterObjective,
  seizeCommandUsed = false,
): ChapterOutcome {
  // Kiểm tra điều kiện thua: Nhân vật chính (Marth) tử trận
  const marth = units.find((u) => u.id === 'marth');
  if (!marth || marth.isDead) {
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
    && marth.position.x === objective.seizeTargetTile.x
    && marth.position.y === objective.seizeTargetTile.y) {
    return 'victory';
  }

  return 'ongoing';
}
