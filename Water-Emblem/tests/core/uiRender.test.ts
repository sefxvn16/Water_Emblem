import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Grid2D, type UnitDisplay } from '../../src/renderer/Grid2D';
import { UnitHoverWindow } from '../../src/ui/UnitHoverWindow';
import { TerrainInfoWindow } from '../../src/ui/TerrainInfoWindow';
import { UnitInspectorWindow } from '../../src/ui/UnitInspectorWindow';
import { CombatForecastWindow } from '../../src/ui/CombatForecastWindow';
import { ActionMenuWindow } from '../../src/ui/ActionMenuWindow';
import { computeActionMenuPosition, type ScreenRect } from '../../src/ui/tileAnchor';
import { computeOverlayPosition } from '../../src/ui/overlayAnchor';
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
    // The equipped weapon (slot 1) shows exactly once — its own inventory
    // entry is not repeated (PLAN item 82). Count the visible name text
    // (the icon's alt attribute also carries the name).
    expect((html.match(/>Rapier</g) ?? []).length).toBe(1);
    expect(html).toContain('/icons/items/Is_fe03_rapier.png');
    expect(html).toContain('Vulnerary');
    expect(html).toContain('/icons/items/Is_fe03_vulnerary.png');
    expect(html).toContain('Max HP:');
    expect(html).toContain('Move:');
  });

  it('UnitInspectorWindow tints the panel by faction (treatment B)', () => {
    const render = (unit: ExtendedUnitState) =>
      renderToString(
        React.createElement(UnitInspectorWindow, {
          unit,
          allUnits: [unit],
          terrainId: 'plains',
          tile: { x: 0, y: 0 },
          onClose: () => {},
        })
      );
    const as = (patch: Partial<ExtendedUnitState['unit']>): ExtendedUnitState => ({
      ...mockUnit,
      unit: { ...mockUnit.unit, ...patch },
    });

    const player = render(mockUnit);
    expect(player).toContain('background-color:#101a2e');
    expect(player).toContain('>Player<');

    const enemy = render(as({ faction: 'enemy' }));
    expect(enemy).toContain('background-color:#2b1719');
    expect(enemy).toContain('>Enemy<');

    const ally = render(as({ faction: 'ally' }));
    expect(ally).toContain('background-color:#12241a');
    expect(ally).toContain('>Ally<');

    const reinforcement = render(as({ faction: 'ally', isReinforcement: true }));
    expect(reinforcement).toContain('background-color:#1e1428');
    expect(reinforcement).toContain('>Reinforcement<');
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

  describe('combat-forecast-ui: renders core forecast verbatim (A1/A3/A4)', () => {
    const forecastUnit = (id: string, name: string, faction: 'player' | 'enemy'): ExtendedUnitState => ({
      ...mockUnit,
      unit: { ...mockUnit.unit, id, name, faction },
      stats: { ...mockUnit.stats, hp: 16, maxHp: 16, def: 2 },
    });

    const renderForecast = (defenderCanCounter: boolean): string => {
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
          canCounter: defenderCanCounter,
        },
        distance: 1,
      };
      return renderToString(
        React.createElement(CombatForecastWindow, {
          forecast: mockForecast,
          attacker: mockUnit,
          defender: forecastUnit('thief', 'Thief', 'enemy'),
          onConfirm: () => {},
          onCancel: () => {},
        })
      );
    };

    // Value shown in the right-aligned column after a "Label:" row.
    const statValue = (html: string, label: string): string | null => {
      const match = html.match(new RegExp(`${label}:</span><strong[^>]*>([^<]*)`));
      return match?.[1]?.trim() ?? null;
    };

    it('A1: displayed Dmg/Hit/Crit/AS/HP-after equal the forecast object', () => {
      const html = renderForecast(true);
      expect(statValue(html, 'Dmg')).toBe('11');
      expect(statValue(html, 'Hit')).toBe('100%');
      expect(statValue(html, 'Crit')).toBe('2%');
      expect(statValue(html, 'AS')).toBe('7');
      expect(html).toContain('HP: 16 → ');
      expect(html).toContain('>5<');
      // Avo is not a field of CombatSideForecast: the window shows the
      // UI-computed avoid (attackSpeed + floor(lck/2)); its correctness is
      // the M1/M2 fix in Batch 2. Here it is checked against the fixture's
      // own inputs: attacker 7 + 3 = 10, defender 5 + 3 = 8.
      expect(statValue(html, 'Avo')).toBe('10%');
      expect(html).toContain('8%');
    });

    it('A3: each side shows current → after (−loss) with a two-colour bar', () => {
      // renderToString separates adjacent text nodes with <!-- -->;
      // strip them so text assertions read the visible text.
      const text = renderForecast(true).replace(/<!-- -->/g, '');
      expect(text).toContain('HP: 16 → ');
      expect(text).toContain('>5<');
      expect(text).toContain('-11');
      // Loss segment (red) under the remaining-HP segment (green).
      expect(text).toContain('background-color:#ef4444');
      expect(text).toContain('background-color:#22c55e');
    });

    it('A4: "Cannot counter" shows exactly when the defender cannot counter', () => {
      expect(renderForecast(true)).not.toContain('Cannot counter');
      expect(renderForecast(false)).toContain('Cannot counter');
    });
  });

  describe('overlayAnchor: computeOverlayPosition', () => {
    const box = { width: 340, height: 400 };
    const vw = 1366;
    const vh = 768;

    const overlaps = (pos: { left: number; top: number }, rect: ScreenRect): boolean => {
      const boxRect: ScreenRect = { left: pos.left, right: pos.left + box.width, top: pos.top, bottom: pos.top + box.height };
      return !(boxRect.right <= rect.left || boxRect.left >= rect.right || boxRect.bottom <= rect.top || boxRect.top >= rect.bottom);
    };

    it('uses the preferred corner when it covers nothing', () => {
      const pos = computeOverlayPosition(null, [], box.width, box.height, vw, vh, 'top-left');
      expect(pos).toEqual({ left: 16, top: 16 });
    });

    it('flips to another corner when the preferred corner covers the tile', () => {
      const tile: ScreenRect = { left: 0, right: 400, top: 0, bottom: 450 };
      const pos = computeOverlayPosition(tile, [], box.width, box.height, vw, vh, 'top-left');
      expect(pos.left).not.toBe(16);
      expect(overlaps(pos, tile)).toBe(false);
    });

    it('never covers the HUD cluster rect', () => {
      const cluster: ScreenRect = { left: vw - 28 - 220, right: vw - 28, top: vh - 28 - 48, bottom: vh - 28 };
      const pos = computeOverlayPosition(null, [cluster], box.width, box.height, vw, vh, 'bottom-right');
      expect(overlaps(pos, cluster)).toBe(false);
    });
  });

  describe('MovementArrow & movementAnimation', () => {
    it('renders SVG polyline and destination marker when path has >= 2 waypoints', () => {
      const html = renderToString(
        React.createElement(MovementArrow, {
          path: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
          boardWidth: 4,
          boardHeight: 4,
        })
      );

      expect(html).toContain('data-testid="movement-arrow-svg"');
      expect(html).toContain('feDropShadow');
      expect(html).toContain('polyline');
      expect(html).toContain('stroke-dasharray="6 6"');
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
