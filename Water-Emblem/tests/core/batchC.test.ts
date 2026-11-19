import { describe, expect, it } from 'vitest';
import { evaluateChapterOutcome, type ChapterObjective } from '../../src/core/chapter/types';
import { applyDifficulty } from '../../src/core/chapter/difficulty';
import { testChapter01Data, type ExtendedUnitState } from '../../src/core/data/chapterData';
import type { GridUnit } from '../../src/core/grid/types';

function unit(id: string, faction: 'player' | 'enemy' | 'ally', x = 0, y = 0, extra: Partial<GridUnit> = {}): GridUnit {
  return { id, name: id, faction, position: { x, y }, mov: 5, moveType: 'foot', ...extra };
}

describe('protect objective (PLAN item 108, B05)', () => {
  const objective: ChapterObjective = { type: 'protect', protectUnitId: 'npc', surviveTurns: 3 };

  it('loses when the protected unit dies', () => {
    const units = [unit('marth', 'player'), unit('npc', 'ally', 1, 1, { isDead: true }), unit('e1', 'enemy', 2, 2)];
    expect(evaluateChapterOutcome(units, objective, false, 'marth', { turnNumber: 1 })).toBe('defeat');
  });

  it('wins after surviving the required turns', () => {
    const units = [unit('marth', 'player'), unit('npc', 'ally', 1, 1), unit('e1', 'enemy', 2, 2)];
    expect(evaluateChapterOutcome(units, objective, false, 'marth', { turnNumber: 3 })).toBe('ongoing');
    expect(evaluateChapterOutcome(units, objective, false, 'marth', { turnNumber: 4 })).toBe('victory');
  });

  it('wins early by routing the enemy', () => {
    const units = [unit('marth', 'player'), unit('npc', 'ally', 1, 1), unit('e1', 'enemy', 2, 2, { isDead: true })];
    expect(evaluateChapterOutcome(units, objective, false, 'marth', { turnNumber: 1 })).toBe('victory');
  });
});

describe('escape objective (PLAN item 109, B06)', () => {
  const objective: ChapterObjective = { type: 'escape', escapeTiles: [{ x: 0, y: 0 }] };

  it('wins when the lord escapes', () => {
    const units = [unit('marth', 'player', 0, 0, { hasEscaped: true }), unit('e1', 'enemy', 2, 2)];
    expect(evaluateChapterOutcome(units, objective, false, 'marth')).toBe('victory');
  });

  it('stays ongoing while the lord is on the map', () => {
    const units = [unit('marth', 'player', 5, 5), unit('e1', 'enemy', 2, 2)];
    expect(evaluateChapterOutcome(units, objective, false, 'marth')).toBe('ongoing');
  });
});

describe('puzzle objective (PLAN item 118, Q10)', () => {
  it('reach_tile: wins on reaching, loses after the turn limit', () => {
    const objective: ChapterObjective = { type: 'puzzle', puzzle: { kind: 'reach_tile', tile: { x: 3, y: 3 }, maxTurns: 5 } };
    const away = [unit('marth', 'player', 0, 0), unit('e1', 'enemy', 2, 2)];
    expect(evaluateChapterOutcome(away, objective, false, 'marth', { turnNumber: 5 })).toBe('ongoing');
    expect(evaluateChapterOutcome(away, objective, false, 'marth', { turnNumber: 6 })).toBe('defeat');
    const there = [unit('marth', 'player', 3, 3), unit('e1', 'enemy', 2, 2)];
    expect(evaluateChapterOutcome(there, objective, false, 'marth', { turnNumber: 2 })).toBe('victory');
  });

  it('defeat_targets: wins when all targets fall in time', () => {
    const objective: ChapterObjective = { type: 'puzzle', puzzle: { kind: 'defeat_targets', targetUnitIds: ['e1', 'e2'], maxTurns: 4 } };
    const units = [unit('marth', 'player'), unit('e1', 'enemy', 2, 2, { isDead: true }), unit('e2', 'enemy', 3, 3)];
    expect(evaluateChapterOutcome(units, objective, false, 'marth', { turnNumber: 2 })).toBe('ongoing');
    units[2] = unit('e2', 'enemy', 3, 3, { isDead: true });
    expect(evaluateChapterOutcome(units, objective, false, 'marth', { turnNumber: 3 })).toBe('victory');
  });
});

describe('difficulty (PLAN item 115, Q04)', () => {
  it('boosts enemies only, scaled by level', () => {
    const units = structuredClone(testChapter01Data.units) as ExtendedUnitState[];
    const enemyBefore = units.find((u) => u.unit.faction === 'enemy')!;
    const playerBefore = units.find((u) => u.unit.faction === 'player')!;
    const hard = applyDifficulty(units, 'hard');
    expect(hard.find((u) => u.unit.id === enemyBefore.unit.id)?.stats.str).toBe(enemyBefore.stats.str + 2);
    expect(hard.find((u) => u.unit.id === enemyBefore.unit.id)?.stats.maxHp).toBe(enemyBefore.stats.maxHp + 4);
    expect(hard.find((u) => u.unit.id === playerBefore.unit.id)?.stats.str).toBe(playerBefore.stats.str);
    const lunatic = applyDifficulty(units, 'lunatic');
    expect(lunatic.find((u) => u.unit.id === enemyBefore.unit.id)?.stats.def).toBe(enemyBefore.stats.def + 4);
    const normal = applyDifficulty(units, 'normal');
    expect(normal.find((u) => u.unit.id === enemyBefore.unit.id)?.stats.str).toBe(enemyBefore.stats.str);
  });
});

