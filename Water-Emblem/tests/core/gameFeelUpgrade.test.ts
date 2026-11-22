import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PhaseBanner } from '../../src/ui/PhaseBanner';
import { TerrainInfoWindow } from '../../src/ui/TerrainInfoWindow';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { dueReinforcements } from '../../src/core/chapter/reinforcements';
import { resolveCombatConsequences } from '../../src/core/combat/combatResolution';
import { chapter01Data } from '../../src/core/data/chapterData';
import { SeededRNG } from '../../src/core/combat/rng';
import type { CombatResult, ItemDefinition } from '../../src/core/combat/types';

describe('phase banners, reinforcements, and FE3 battle templates match canon specifications', () => {
  it('PhaseBanner renders correct content and styles for each phase', () => {
    // 1. Null phase renders nothing
    const nullHtml = renderToString(React.createElement(PhaseBanner, { phase: null }));
    expect(nullHtml).toBe('');

    // 2. Player phase banner
    const playerHtml = renderToString(
      React.createElement(PhaseBanner, { phase: 'player', turnNumber: 3 })
    );
    expect(playerHtml).toContain('data-testid="phase-banner-player"');
    expect(playerHtml).toContain('PLAYER PHASE · TURN 3');

    // 3. Enemy phase banner
    const enemyHtml = renderToString(
      React.createElement(PhaseBanner, { phase: 'enemy', turnNumber: 3 })
    );
    expect(enemyHtml).toContain('data-testid="phase-banner-enemy"');
    expect(enemyHtml).toContain('ENEMY PHASE · TURN 3');

    // 4. Reinforcements banner (FE3 text/phases/02.txt canon)
    const reinHtml = renderToString(
      React.createElement(PhaseBanner, { phase: 'reinforcements' })
    );
    expect(reinHtml).toContain('data-testid="phase-banner-reinforcements"');
    expect(reinHtml).toContain('REINFORCEMENTS!');
  });

  it('TerrainInfoWindow displays Avoid and Def, and cavalry enters indoor terrain without forced dismount', () => {
    // Indoor terrain: floor is passable for cavalry without forced dismount
    const floorTerrain = defaultTerrainRegistry.get('floor');
    expect(floorTerrain).toBeDefined();
    expect(floorTerrain?.movementCosts.cavalry).toBe(1);
    expect(floorTerrain?.movementCosts.foot).toBe(1);

    const floorHtml = renderToString(
      React.createElement(TerrainInfoWindow, {
        terrainId: 'floor',
        tile: { x: 5, y: 5 },
      })
    );
    expect(floorHtml).toContain('Floor');
    expect(floorHtml).toContain('Avoid : 0%');
    expect(floorHtml).not.toContain('NoMount');

    // Throne has Def +2, Avoid 20%, passable for cavalry
    const throneTerrain = defaultTerrainRegistry.get('throne');
    expect(throneTerrain).toBeDefined();
    expect(throneTerrain?.movementCosts.cavalry).toBe(2);

    const throneHtml = renderToString(
      React.createElement(TerrainInfoWindow, {
        terrainId: 'throne',
        tile: { x: 10, y: 1 },
      })
    );
    expect(throneHtml).toContain('Throne');
    expect(throneHtml).toContain('Avoid : 20%');
    expect(throneHtml).toContain('Def : +2');
    expect(throneHtml).not.toContain('NoMount');

    // Pillar has Def +1, Avoid 20%, passable for cavalry
    const pillarTerrain = defaultTerrainRegistry.get('pillar');
    expect(pillarTerrain).toBeDefined();
    expect(pillarTerrain?.movementCosts.cavalry).toBe(3);

    // Outdoor terrain: Plains
    const plainsHtml = renderToString(
      React.createElement(TerrainInfoWindow, {
        terrainId: 'plains',
        tile: { x: 2, y: 2 },
      })
    );
    expect(plainsHtml).toContain('Plains');
    expect(plainsHtml).toContain('Avoid : 0%');
    expect(plainsHtml).not.toContain('NoMount');
  });

  it('reinforcements spawn logic correctly processes due groups', () => {
    const mockChapter = {
      reinforcements: [
        {
          id: 'turn_2_cav',
          turn: 2,
          units: [
            {
              unit: {
                id: 'reinf_cav_1',
                name: 'Enemy Cavalier',
                classId: 'cavalier',
                faction: 'enemy' as const,
                level: 1,
                position: { x: 1, y: 1 },
                items: ['iron_lance'],
              },
            },
          ],
        },
      ],
    };

    // Turn 1: not due
    expect(dueReinforcements(mockChapter as any, 1, [])).toHaveLength(0);

    // Turn 2: due
    const due = dueReinforcements(mockChapter as any, 2, []);
    expect(due).toHaveLength(1);
    expect(due[0]?.id).toBe('turn_2_cav');

    // Turn 2 already spawned: not due again
    expect(dueReinforcements(mockChapter as any, 2, ['turn_2_cav'])).toHaveLength(0);
  });

  it('FE3 battle templates format strike, miss, critical, and fallen messages according to canon', () => {
    const marth = structuredClone(chapter01Data.units.find((u) => u.unit.id === 'marth')!);
    const pirate = structuredClone(chapter01Data.units.find((u) => u.unit.faction === 'enemy')!);
    const pirateId = pirate.unit.id;

    const mockExecutionCrit: CombatResult = {
      forecast: {
        attacker: { unit: marth.unit, damage: 14, attackCount: 1, hitRate: 100, critRate: 50, attackSpeed: 10, canCounter: false, stats: { ...marth.stats } },
        defender: { unit: pirate.unit, damage: 0, attackCount: 0, hitRate: 0, critRate: 0, attackSpeed: 0, canCounter: false, stats: { ...pirate.stats, hp: 0 } },
        distance: 1,
      },
      events: [
        {
          attackerId: 'marth',
          defenderId: pirateId,
          damageDealt: pirate.stats.hp,
          defenderHpAfter: 0,
          isHit: true,
          isCrit: true,
        },
      ],
      unitDefeatedId: pirateId,
    };

    const resolution = resolveCombatConsequences({
      units: [marth, pirate],
      result: mockExecutionCrit,
      rng: new SeededRNG(42),
      itemById: new Map(),
      itemsList: [] as ItemDefinition[],
      chapter: chapter01Data,
      dialogues: {},
      gold: 100,
      villageStates: {},
    });

    // Check FE3 canonical message structure
    expect(resolution.logs.some((l) => l.includes('strikes') && l.includes('[CRITICAL HIT!]'))).toBe(true);
    expect(resolution.logs.some((l) => l.includes('has fallen!'))).toBe(true);
    expect(resolution.soundCues.some((c) => c.type === 'crit')).toBe(true);
    expect(resolution.soundCues.some((c) => c.type === 'death')).toBe(true);
  });
});
