import { describe, expect, it } from 'vitest';
import { chapters } from '../../src/core/data/chapterData';
import { evaluateAITurn } from '../../src/core/ai/decision';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';
import { getAttackRange } from '../../src/core/class/classRules';
import { getManhattanDistance } from '../../src/core/combat/calculator';
import mapCh1 from '../../data/maps/chapter_01_talys.json';
import type { MapData } from '../../src/core/grid/types';

describe('AI Movement & Teleport Verification (PLAN item 168)', () => {
  const mapData = mapCh1 as unknown as MapData;
  const chapter01 = chapters.chapter_01!;

  it('no enemy in Chapter 1 can ever move beyond its valid reachable tiles in turn 1', () => {
    const units = chapter01.units.map((u) => ({ ...u, unit: { ...u.unit }, stats: { ...u.stats } }));
    const statsMap = new Map(units.map((u) => [u.unit.id, u.stats]));
    const weaponsMap = new Map(units.map((u) => [u.unit.id, u.weapon]));

    const enemies = units.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);

    for (const enemy of enemies) {
      const startPos = { ...enemy.unit.position };
      const range = calculateMovementRange(enemy.unit, {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: units.map((u) => u.unit),
      });

      const decision = evaluateAITurn(enemy.unit, enemy.aiRole ?? 'pursue', {
        map: mapData,
        terrains: defaultTerrainRegistry,
        units: units.map((u) => u.unit),
        unitStatsMap: statsMap,
        unitWeaponsMap: weaponsMap,
        turnNumber: 1,
      });

      if (decision.type === 'attack' || decision.type === 'move_only') {
        const destKey = `${decision.movePosition.x},${decision.movePosition.y}`;
        expect(range.has(destKey), `Enemy ${enemy.unit.name} decided to move to ${destKey} which is NOT in its reachable range!`).toBe(true);

        const moveResult = range.get(destKey)!;
        expect(moveResult.costRemaining).toBeGreaterThanOrEqual(0);
        expect(moveResult.path[0]).toEqual(startPos);
        expect(moveResult.path[moveResult.path.length - 1]).toEqual(decision.movePosition);
      }
    }
  });

  it('checks which enemy can target Gordin over multiple simulated turns', () => {
    let units = chapter01.units.map((u) => ({ ...u, unit: { ...u.unit }, stats: { ...u.stats } }));
    const gordin = units.find((u) => u.unit.id === 'gordin')!;
    expect(gordin).toBeDefined();

    // Run 5 turns of AI without player moving to observe who approaches Gordin
    for (let turn = 1; turn <= 5; turn++) {
      const statsMap = new Map(units.map((u) => [u.unit.id, u.stats]));
      const weaponsMap = new Map(units.map((u) => [u.unit.id, u.weapon]));
      const enemies = units.filter((u) => u.unit.faction === 'enemy' && !u.unit.isDead);

      for (const enemy of enemies) {
        const range = calculateMovementRange(enemy.unit, {
          map: mapData,
          terrains: defaultTerrainRegistry,
          units: units.map((u) => u.unit),
        });

        const decision = evaluateAITurn(enemy.unit, enemy.aiRole ?? 'pursue', {
          map: mapData,
          terrains: defaultTerrainRegistry,
          units: units.map((u) => u.unit),
          unitStatsMap: statsMap,
          unitWeaponsMap: weaponsMap,
          turnNumber: turn,
        });

        if (decision.type === 'attack') {
          const destKey = `${decision.movePosition.x},${decision.movePosition.y}`;
          expect(range.has(destKey)).toBe(true);
          enemy.unit.position = { ...decision.movePosition };
          if (decision.targetUnit.id === 'gordin') {
            const dist = getManhattanDistance(decision.movePosition, gordin.unit.position);
            const attackRange = getAttackRange(enemy.unit, enemy.weapon);
            expect(dist).toBeGreaterThanOrEqual(attackRange.min);
            expect(dist).toBeLessThanOrEqual(attackRange.max);
          }
        } else if (decision.type === 'move_only') {
          const destKey = `${decision.movePosition.x},${decision.movePosition.y}`;
          expect(range.has(destKey)).toBe(true);
          enemy.unit.position = { ...decision.movePosition };
        }
      }
    }
  });
});
