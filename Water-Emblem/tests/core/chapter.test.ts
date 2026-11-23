import { describe, it, expect } from 'vitest';
import { ChapterObjective, evaluateChapterOutcome } from '../../src/core/chapter/types';
import { GridUnit } from '../../src/core/grid/types';

describe('Chapter Win/Loss Conditions', () => {
  const objectiveBoss: ChapterObjective = {
    type: 'defeat_boss',
    bossUnitId: 'enemy_pirate_2',
    descriptionVi: 'Hạ gục Boss Pirate B',
  };

  const objectiveRout: ChapterObjective = {
    type: 'rout',
    descriptionVi: 'Quét sạch toàn bộ quân địch',
  };

  /**
   * PLAN mục 210. FE3 có đúng một chương đòi cả hai: chuỗi mục tiêu của Book 2
   * Endgame phần 3 là "Defeat Medeus / Seize throne" (`statusObjectives_03`,
   * $f0b056). Chương khai `requiresDefeatOf`, lõi không nhắc tên nhân vật nào.
   */
  it('không cho thắng khi chiếm ngai mà quân phải hạ vẫn còn sống (PLAN mục 210)', () => {
    const objective: ChapterObjective = {
      type: 'seize',
      seizeTargetTile: { x: 15, y: 2 },
      requiresDefeatOf: ['medeus'],
      description: 'Defeat Medeus / Seize throne',
    };
    const onThrone = (medeusDead: boolean): GridUnit[] => [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 15, y: 2 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'medeus', name: 'Medeus', faction: 'enemy', position: { x: 15, y: 5 }, mov: 0, moveType: 'armor', isDead: medeusDead },
    ];

    // Marth đứng đúng ô ngai và đã bấm Seize, nhưng Medeus còn sống.
    expect(evaluateChapterOutcome(onThrone(false), objective, true, 'marth')).toBe('ongoing');
    // Hạ Medeus rồi chiếm mới thắng.
    expect(evaluateChapterOutcome(onThrone(true), objective, true, 'marth')).toBe('victory');
    // Hạ Medeus nhưng chưa chiếm ngai thì chưa thắng.
    expect(evaluateChapterOutcome(onThrone(true), objective, false, 'marth')).toBe('ongoing');
    // Chương không khai requiresDefeatOf vẫn thắng chỉ bằng chiếm ngai.
    const plain: ChapterObjective = { type: 'seize', seizeTargetTile: { x: 15, y: 2 } };
    expect(evaluateChapterOutcome(onThrone(false), plain, true, 'marth')).toBe('victory');
  });

  it('kết quả là ongoing khi Marth và Boss còn sống', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: false },
    ];
    expect(evaluateChapterOutcome(units, objectiveBoss, false, 'marth')).toBe('ongoing');
  });

  it('thua cuộc (defeat) ngay khi Marth tử trận', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: true },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: false },
    ];
    expect(evaluateChapterOutcome(units, objectiveBoss, false, 'marth')).toBe('defeat');
  });

  it('chiến thắng (victory) khi hạ gục đúng Boss chỉ định', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: true },
    ];
    expect(evaluateChapterOutcome(units, objectiveBoss, false, 'marth')).toBe('victory');
  });

  it('chiến thắng theo mục tiêu Rout khi quét sạch mọi quân địch', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'enemy_1', name: 'Pirate A', faction: 'enemy', position: { x: 1, y: 1 }, mov: 4, moveType: 'bandit', isDead: true },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: true },
    ];
    expect(evaluateChapterOutcome(units, objectiveRout, false, 'marth')).toBe('victory');
  });

  it('seize chỉ thắng khi Marth ở cổng và dùng lệnh chiếm', () => {
    const objective: ChapterObjective = {
      type: 'seize',
      seizeTargetTile: { x: 2, y: 2 },
      descriptionVi: 'Marth chiếm cổng',
    };
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 2, y: 2 }, mov: 7, moveType: 'foot', isDead: false },
    ];
    expect(evaluateChapterOutcome(units, objective, false, 'marth')).toBe('ongoing');
    expect(evaluateChapterOutcome(units, objective, true, 'marth')).toBe('victory');
    Object.assign(units[0]!, { position: { x: 1, y: 2 } });
    expect(evaluateChapterOutcome(units, objective, true, 'marth')).toBe('ongoing');
  });
});
