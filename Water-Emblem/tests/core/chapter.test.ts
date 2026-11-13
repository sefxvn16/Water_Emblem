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

  it('kết quả là ongoing khi Marth và Boss còn sống', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: false },
    ];
    expect(evaluateChapterOutcome(units, objectiveBoss)).toBe('ongoing');
  });

  it('thua cuộc (defeat) ngay khi Marth tử trận', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: true },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: false },
    ];
    expect(evaluateChapterOutcome(units, objectiveBoss)).toBe('defeat');
  });

  it('chiến thắng (victory) khi hạ gục đúng Boss chỉ định', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: true },
    ];
    expect(evaluateChapterOutcome(units, objectiveBoss)).toBe('victory');
  });

  it('chiến thắng theo mục tiêu Rout khi quét sạch mọi quân địch', () => {
    const units: GridUnit[] = [
      { id: 'marth', name: 'Marth', faction: 'player', position: { x: 0, y: 0 }, mov: 4, moveType: 'foot', isDead: false },
      { id: 'enemy_1', name: 'Pirate A', faction: 'enemy', position: { x: 1, y: 1 }, mov: 4, moveType: 'bandit', isDead: true },
      { id: 'enemy_pirate_2', name: 'Boss', faction: 'enemy', position: { x: 4, y: 7 }, mov: 0, moveType: 'armor', isDead: true },
    ];
    expect(evaluateChapterOutcome(units, objectiveRout)).toBe('victory');
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
    expect(evaluateChapterOutcome(units, objective)).toBe('ongoing');
    expect(evaluateChapterOutcome(units, objective, true)).toBe('victory');
    Object.assign(units[0]!, { position: { x: 1, y: 2 } });
    expect(evaluateChapterOutcome(units, objective, true)).toBe('ongoing');
  });
});
