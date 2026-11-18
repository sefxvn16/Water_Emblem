import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Grid2D, type UnitDisplay } from '../../src/renderer/Grid2D';
import { UnitHoverWindow } from '../../src/ui/UnitHoverWindow';
import { UnitInspectorWindow } from '../../src/ui/UnitInspectorWindow';
import type { BoardView } from '../../src/core/grid/boardView';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';

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
        terrainId: 'plains',
        tile: { x: 0, y: 0 },
        onInspect: () => {},
      })
    );

    expect(html).toContain('Marth');
    expect(html).toContain('Rapier');
    expect(html).toContain('Details');
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
});
