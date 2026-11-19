import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Grid2D, type UnitDisplay } from '../../src/renderer/Grid2D';
import { UnitHoverWindow } from '../../src/ui/UnitHoverWindow';
import { TerrainInfoWindow } from '../../src/ui/TerrainInfoWindow';
import { UnitInspectorWindow } from '../../src/ui/UnitInspectorWindow';
import { CombatForecastWindow } from '../../src/ui/CombatForecastWindow';
import { ActionMenuWindow } from '../../src/ui/ActionMenuWindow';
import { computeActionMenuPosition } from '../../src/ui/tileAnchor';
import { MovementArrow } from '../../src/renderer/MovementArrow';
import { runMovementAnimation } from '../../src/renderer/movementAnimation';
import type { BoardView } from '../../src/core/grid/boardView';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import type { CombatForecast } from '../../src/core/combat/types';

const mockBoardView: BoardView = {
  width: 2,
  height: 2,
  tiles: [
    [
      {
        x: 0,
        y: 0,
        key: '0,0',
        terrainId: 'plains',
        elevation: 0,
        unitId: 'marth',
        overlay: { reachable: false, danger: false, attackTarget: false, selected: false },
      },
      {
        x: 1,
        y: 0,
        key: '1,0',
        terrainId: 'forest',
        elevation: 0,
        unitId: null,
        overlay: { reachable: false, danger: false, attackTarget: false, selected: false },
      },
    ],
    [
      {
        x: 0,
        y: 1,
        key: '0,1',
        terrainId: 'plains',
        elevation: 0,
        unitId: null,
        overlay: { reachable: false, danger: false, attackTarget: false, selected: false },
      },
      {
        x: 1,
        y: 1,
        key: '1,1',
        terrainId: 'plains',
        elevation: 0,
        unitId: null,
        overlay: { reachable: false, danger: false, attackTarget: false, selected: false },
      },
    ],
  ],
};

const mockUnit: ExtendedUnitState = {
  unit: {
    id: 'marth',
    name: 'Marth',
    faction: 'player',
    position: { x: 0, y: 0 },
    hasActed: false,
    isDead: false,
    mov: 7,
    moveType: 'foot',
    classId: 'lord',
  },
  stats: {
    hp: 18,
    maxHp: 18,
    str: 5,
    mag: 0,
    skill: 3,
    spd: 7,
    lck: 7,
    def: 7,
    res: 0,
  },
  weapon: {
    id: 'rapier',
    name: 'Rapier',
    nameVi: 'Kiếm liễu',
    type: 'sword',
    might: 5,
    hit: 100,
    weight: 4,
    crit: 10,
    minRange: 1,
    maxRange: 1,
    maxUses: 28,
    effectiveAgainst: ['armor', 'cavalry'],
    requiredRank: 'E',
  },
  inventory: [
    { itemId: 'rapier', uses: 28 },
    { itemId: 'vulnerary', uses: 3 },
  ],
  level: 1,
  exp: 0,
  avatarUrl: '/avatars/marth.png',
  title: 'Prince of Altea',
};

describe('UI rendering tests', () => {
  it('Grid2D renders unit avatar and HP text with fraction', () => {
    const getUnitDisplay = (id: string): UnitDisplay | undefined => {
      if (id === 'marth') {
        return {
          name: 'Marth',
          hp: 18,
          maxHp: 18,
          faction: 'player',
          hasActed: false,
          avatarUrl: '/avatars/marth.png',
        };
      }
      return undefined;
    };

    const html = renderToString(
      React.createElement(Grid2D, {
        board: mockBoardView,
        getUnitDisplay,
        onTileClick: () => {},
        onTileHover: () => {},
      })
    );

    expect(html).toContain('src="/avatars/marth.png"');
    expect(html).toContain('18/18');
  });

  it('UnitHoverWindow renders compact summary with Details button for tablet', () => {
    const html = renderToString(
      React.createElement(UnitHoverWindow, {
        unit: mockUnit,
        tile: { x: 0, y: 0 },
        onInspect: () => {},
      })
    );

    expect(html).toContain('Marth');
    expect(html).toContain('Rapier');
    expect(html).toContain('Details');
  });

  it('TerrainInfoWindow renders terrain name and avoid bonus', () => {
    const html = renderToString(
      React.createElement(TerrainInfoWindow, {
        terrainId: 'forest',
        tile: { x: 1, y: 0 },
      })
    );

    expect(html).toContain('Forest');
    expect(html).toContain('Avoid : 10%');
  });

  it('UnitInspectorWindow renders FE3 status layout with weapon and item icons', () => {
    const html = renderToString(
      React.createElement(UnitInspectorWindow, {
        unit: mockUnit,
        allUnits: [mockUnit],
        terrainId: 'plains',
        tile: { x: 0, y: 0 },
        onClose: () => {},
      })
    );

    expect(html).toContain('Unit Details');
    expect(html).toContain('src="/avatars/marth.png"');
    expect(html).toContain('Rapier');
    expect(html).toContain('/icons/items/Is_fe03_rapier.png');
    expect(html).toContain('Vulnerary');
    expect(html).toContain('/icons/items/Is_fe03_vulnerary.png');
    expect(html).toContain('Max HP:');
    expect(html).toContain('Move:');
  });

  it('CombatForecastWindow renders HP transition delta and hit/avoid stats', () => {
    const mockForecast: CombatForecast = {
      attacker: {
        unit: mockUnit.unit,
        stats: mockUnit.stats,
        weapon: mockUnit.weapon,
        damage: 11,
        hitRate: 100,
        critRate: 2,
        attackSpeed: 7,
        attackCount: 1,
        canCounter: true,
      },
      defender: {
        unit: { ...mockUnit.unit, id: 'thief', name: 'Thief', faction: 'enemy' },
        stats: { ...mockUnit.stats, hp: 16, maxHp: 16, def: 2 },
        weapon: mockUnit.weapon,
        damage: 0,
        hitRate: 94,
        critRate: 0,
        attackSpeed: 5,
        attackCount: 1,
        canCounter: true,
      },
      distance: 1,
    };

    const defenderUnit: ExtendedUnitState = {
      ...mockUnit,
      unit: { ...mockUnit.unit, id: 'thief', name: 'Thief', faction: 'enemy' },
      stats: { ...mockUnit.stats, hp: 16, maxHp: 16, def: 2 },
    };

    const html = renderToString(
      React.createElement(CombatForecastWindow, {
        forecast: mockForecast,
        attacker: mockUnit,
        defender: defenderUnit,
        onConfirm: () => {},
        onCancel: () => {},
      })
    );

    expect(html).toContain('COMBAT FORECAST');
    expect(html).toContain('HP: 18 → ');
    expect(html).toContain('>18<');
    expect(html).toContain('HP: 16 → ');
    expect(html).toContain('>5<');
    expect(html).toContain('11');
    expect(html).toContain('Hit:');
    expect(html).toContain('Avo:');
    expect(html).toContain('100');
    expect(html).toContain('94');
    expect(html).toContain('⚔️ Attack!');
  });

  describe('ActionMenuWindow & positioning', () => {
    it('renders actions and attack target hints without crashing', () => {
      const html = renderToString(
        React.createElement(ActionMenuWindow, {
          anchorTile: { x: 16, y: 4 },
          mountLabel: null,
          actions: {
            unitName: 'Draug',
            canSeize: false,
            talkTargetName: null,
            canUseVulnerary: false,
            promotions: [],
            villageName: null,
            hasAttackTargets: true,
            targetPositions: [{ x: 17, y: 4 }],
          },
          onToggleMount: () => {},
          onSeize: () => {},
          onTalk: () => {},
          onUseVulnerary: () => {},
          onPromote: () => {},
          onVisitVillage: () => {},
          onWait: () => {},
          onCancelMove: () => {},
        })
      );

      expect(html).toContain('Actions (Draug)');
      expect(html).toContain('Click red tile to attack');
      expect(html).toContain('✓ Wait');
      expect(html).toContain('Cancel Move');
    });

    it('positions menu to the left when attack targets are to the right', () => {
      const anchor = { left: 512, right: 576, top: 256, bottom: 320 };
      const targetOnRight = { left: 576, right: 640, top: 256, bottom: 320 };
      const pos = computeActionMenuPosition(anchor, [targetOnRight], 190, 160, 1200, 800);
      expect(pos).not.toBeNull();
      // Must be to the left of anchor
      expect(pos!.left + 190).toBeLessThanOrEqual(anchor.left);
    });

    it('positions menu to the right when attack targets are to the left', () => {
      const anchor = { left: 512, right: 576, top: 256, bottom: 320 };
      const targetOnLeft = { left: 448, right: 512, top: 256, bottom: 320 };
      const pos = computeActionMenuPosition(anchor, [targetOnLeft], 190, 160, 1200, 800);
      expect(pos).not.toBeNull();
      // Must be to the right of anchor
      expect(pos!.left).toBeGreaterThanOrEqual(anchor.right);
    });

    it('avoids targets on both sides by moving vertically', () => {
      const anchor = { left: 512, right: 576, top: 256, bottom: 320 };
      const targetL = { left: 448, right: 512, top: 256, bottom: 320 };
      const targetR = { left: 576, right: 640, top: 256, bottom: 320 };
      const pos = computeActionMenuPosition(anchor, [targetL, targetR], 190, 160, 1200, 800);
      expect(pos).not.toBeNull();
      // Menu should be above or below the horizontal row [256..320]
      const isAbove = pos!.top + 160 <= anchor.top;
      const isBelow = pos!.top >= anchor.bottom;
      expect(isAbove || isBelow).toBe(true);
    });
  });

  describe('MovementArrow & movementAnimation', () => {
    it('renders a thin white solid line with an origin node', () => {
      const html = renderToString(
        React.createElement(MovementArrow, {
          path: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
          boardWidth: 4,
          boardHeight: 4,
        })
      );

      expect(html).toContain('data-testid="movement-arrow-svg"');
      expect(html).toContain('polyline');
      expect(html).not.toContain('feDropShadow');
      expect(html).not.toContain('#38bdf8');
      expect(html).not.toContain('stroke-dasharray');
      // Thin white solid line (3px) on a dark underlay (5px) — PLAN item 81.
      expect(html).toContain('stroke="#ffffff"');
      expect(html).toContain('stroke-width="3"');
      expect(html).toContain('stroke="#0f172a"');
      expect(html).toContain('stroke-width="5"');
      // No more thick shaft, block arrowhead or destination ring.
      expect(html).not.toContain('stroke-width="18"');
      expect(html).not.toContain('M 20,0 L -14,-22 L -7,0 L -14,22 Z');
      // Origin node: diameter = 1/3 of the 64px tile → r = 10.67.
      expect(html).toContain('r="10.67"');
    });

    it('returns null when path has fewer than 2 waypoints', () => {
      const html = renderToString(
        React.createElement(MovementArrow, {
          path: [{ x: 1, y: 1 }],
          boardWidth: 4,
          boardHeight: 4,
        })
      );
      expect(html).toBe('');
    });

    it('steps through all path points and triggers moveStep sounds during animation', async () => {
      const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
      const visited: { x: number; y: number }[] = [];
      let soundCount = 0;
      const soundPlayer = { playMoveStep: () => { soundCount++; } };

      await new Promise<void>((resolve) => {
        runMovementAnimation(
          path,
          'foot',
          soundPlayer,
          (pos) => { visited.push(pos); },
          () => { resolve(); },
          10,
        );
      });

      expect(visited).toEqual(path);
      expect(soundCount).toBe(2);
    });
  });
});
