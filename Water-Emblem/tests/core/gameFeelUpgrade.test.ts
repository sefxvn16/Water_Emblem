import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PhaseBanner } from '../../src/ui/PhaseBanner';
import { TerrainInfoWindow } from '../../src/ui/TerrainInfoWindow';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { calculateMovementRange } from '../../src/core/grid/pathfinding';
import { dueReinforcements, spawnReinforcements } from '../../src/core/chapter/reinforcements';
import { resolveCombatConsequences } from '../../src/core/combat/combatResolution';
import { chapter01Data } from '../../src/core/data/chapterData';
import { SeededRNG } from '../../src/core/combat/rng';
import type { CombatResult, ItemDefinition, UnitCombatStats } from '../../src/core/combat/types';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import type { MapData } from '../../src/core/grid/types';

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
    // Indoor terrain: floor is passable for cavalry with increased move cost (slower than foot)
    const floorTerrain = defaultTerrainRegistry.get('floor');
    expect(floorTerrain).toBeDefined();
    expect(floorTerrain?.movementCosts.cavalry).toBe(2);
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

    // Throne has Def +2, Avoid 20%, cavalry cost 3 (slower than foot 2)
    const throneTerrain = defaultTerrainRegistry.get('throne');
    expect(throneTerrain).toBeDefined();
    expect(throneTerrain?.movementCosts.cavalry).toBe(3);

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

    // Pillar has Def +1, Avoid 20%, cavalry cost 3
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

/**
 * PLAN item 201, for item 188. Two of the four tests above only render a
 * component to a string and look for substrings, which cannot show that the
 * reinforcement banner ever fires or that a mounted unit may now stand
 * indoors. These drive the two rules behind them.
 */
describe('reinforcement arrivals and indoor mounts behave as item 188 claims (PLAN item 201)', () => {
  const statsOf = (): UnitCombatStats => ({
    hp: 24, maxHp: 24, str: 9, mag: 0, skill: 8, spd: 7, lck: 3, def: 7, res: 2,
  });

  const template = (id: string, x: number, y: number): ExtendedUnitState => ({
    unit: { id, name: id, faction: 'enemy', position: { x, y }, mov: 5, moveType: 'foot', classId: 'fighter' },
    stats: statsOf(), inventory: [], level: 3, exp: 0,
  });

  const map: MapData = {
    id: 'test_spawn', name: 'Spawn room', width: 4, height: 1,
    grid: [['plains', 'plains', 'wall', 'plains']],
  };

  it('puts a due reinforcement group on the field already spent, flagged as reinforcements, on walkable tiles only', () => {
    const standing = [template('defender', 3, 0)];
    const group = {
      id: 'wave_1', turn: 2,
      units: [template('newcomer_a', 0, 0), template('blocked', 2, 0)],
    };

    // Turn 1 is too early and turn 2 is the arrival; once spawned it never
    // arrives twice.
    expect(dueReinforcements(
      { ...chapter01Data, reinforcements: [group] }, 1, [],
    )).toHaveLength(0);
    expect(dueReinforcements(
      { ...chapter01Data, reinforcements: [group] }, 2, [],
    ).map(({ id }) => id)).toEqual(['wave_1']);
    expect(dueReinforcements(
      { ...chapter01Data, reinforcements: [group] }, 2, ['wave_1'],
    )).toHaveLength(0);

    const result = spawnReinforcements(standing, group, map, defaultTerrainRegistry);
    expect(result.units).toHaveLength(3);
    expect(result.spawned.map(({ unit }) => unit.id)).toEqual(['newcomer_a', 'blocked']);

    const arrival = result.spawned[0]!;
    // The flag the banner and the faction tone read, and the rule from
    // AGENTS.md: reinforcements do not act on the turn they appear.
    expect(arrival.unit.isReinforcement).toBe(true);
    expect(arrival.unit.hasActed).toBe(true);
    expect(arrival.unit.position).toEqual({ x: 0, y: 0 });

    // The second one was declared on a wall tile, so it is placed on the
    // nearest walkable tile instead of inside the wall.
    const displaced = result.spawned[1]!;
    expect(displaced.unit.position).not.toEqual({ x: 2, y: 0 });
    expect(defaultTerrainRegistry.getMovementCost(
      map.grid[displaced.unit.position.y]![displaced.unit.position.x]!, 'foot', 'fighter',
    )).not.toBeNull();
    // Nobody is stacked on the unit already standing there.
    expect(displaced.unit.position).not.toEqual({ x: 3, y: 0 });
    // Pure function: the input list is untouched.
    expect(standing).toHaveLength(1);
  });

  it('keeps a mounted unit mounted on indoor tiles and charges it strictly more movement than a foot unit', () => {
    // decisions.md, applied by item 188: entering a building costs a mounted
    // unit more movement but never forces it off its horse. Before item 188
    // these tiles carried a noMount flag and charged a horse the same as a
    // foot unit, so the strict comparison is what pins the new rule down.
    for (const terrainId of ['throne', 'floor', 'corridor', 'altar', 'pillar'] as const) {
      const footCost = defaultTerrainRegistry.getMovementCost(terrainId, 'foot', 'mercenary');
      const horseCost = defaultTerrainRegistry.getMovementCost(terrainId, 'cavalry', 'cavalier');
      expect(footCost).not.toBeNull();
      // Passable for the horse, and dearer than for a foot unit.
      expect(horseCost).not.toBeNull();
      expect(horseCost!).toBeGreaterThan(footCost!);
    }
    // A mounted unit really does reach the throne and stands on it.
    const throneMap: MapData = {
      id: 'test_throne_walk', name: 'Throne approach', width: 3, height: 1,
      grid: [['plains', 'floor', 'throne']],
    };
    const rider: ExtendedUnitState['unit'] = {
      id: 'cain', name: 'Cain', faction: 'player', position: { x: 0, y: 0 },
      mov: 7, moveType: 'cavalry', classId: 'cavalier',
    };
    const reachable = calculateMovementRange(rider, {
      map: throneMap, terrains: defaultTerrainRegistry, units: [rider],
    });
    expect([...reachable.keys()].sort()).toEqual(['0,0', '1,0', '2,0']);
  });
});
