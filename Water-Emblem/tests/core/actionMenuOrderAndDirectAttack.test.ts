import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ActionMenuWindow, type PendingActions } from '../../src/ui/ActionMenuWindow';
import { canAttackAtDistance, getAttackWeapons } from '../../src/core/combat/equip';
import { getAttackRange } from '../../src/core/class/classRules';
import itemsJson from '../../data/items.json';
import type { ItemDefinition } from '../../src/core/combat/types';

const ITEM_BY_ID = new Map((itemsJson.items as unknown as ItemDefinition[]).map((item) => [item.id, item]));
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import { getManhattanDistance } from '../../src/core/combat/calculator';

describe('PLAN Item 139: ActionMenuWindow button order and priority', () => {
  it('renders buttons in the fixed Fire Emblem canon order with Talk as top priority', () => {
    const actions: PendingActions = {
      unitName: 'Marth',
      canSeize: true,
      talkTargetName: 'Sheeda',
      canUseVulnerary: true,
      promotions: [],
      villageName: 'Talys Village',
      hasAttackTargets: true,
      targetPositions: [{ x: 24, y: 6 }],
      equipOptions: [{ itemId: 'iron_sword', name: 'Iron Sword' }],
      canTrade: true,
      canCancelMove: true,
      canStorage: true,
      staffOptions: [{ itemId: 'heal_staff', name: 'Heal' }],
      canShop: true,
      canOpenChest: true,
      canOpenDoor: true,
      canArena: true,
      canEscape: true,
      canTransform: false,
      danceTargetName: null,
      imitateTargetName: null,
    };

    const html = renderToString(
      React.createElement(ActionMenuWindow, {
        anchorTile: { x: 24, y: 5 },
        mountLabel: null,
        actions,
        onToggleMount: () => {},
        onAttack: () => {},
        onEquip: () => {},
        onTrade: () => {},
        onStorage: () => {},
        onShop: () => {},
        onOpenChest: () => {},
        onOpenDoor: () => {},
        onArena: () => {},
        onStaff: () => {},
        onSeize: () => {},
        onEscape: () => {},
        onTransform: () => {},
        onDance: () => {},
        onImitate: () => {},
        onTalk: () => {},
        onUseVulnerary: () => {},
        onPromote: () => {},
        onVisitVillage: () => {},
        onWait: () => {},
        onCancelMove: () => {},
      })
    );

    // Order: Talk -> Visit -> Seize -> Escape -> Chest -> Door -> Shop -> Arena -> Attack -> Staff -> Equip -> Vulnerary -> Trade -> Storage -> Wait -> Cancel Move
    const talkIdx = html.indexOf('Talk: Sheeda');
    const visitIdx = html.indexOf('Visit (Talys Village)');
    const seizeIdx = html.indexOf('Seize Gate');
    const escapeIdx = html.indexOf('Escape');
    const chestIdx = html.indexOf('Open Chest');
    const doorIdx = html.indexOf('Open Door');
    const shopIdx = html.indexOf('Shop');
    const arenaIdx = html.indexOf('Arena');
    const attackIdx = html.indexOf('>Attack<');
    const staffIdx = html.indexOf('Staff: Heal');
    const equipIdx = html.indexOf('Equip: Iron Sword');
    const vulneraryIdx = html.indexOf('Use Vulnerary');
    const tradeIdx = html.indexOf('Trade');
    const storageIdx = html.indexOf('Storage');
    const waitIdx = html.indexOf('>Wait<');
    const cancelIdx = html.indexOf('Cancel Move');

    expect(talkIdx).toBeGreaterThan(-1);
    expect(visitIdx).toBeGreaterThan(talkIdx);
    expect(seizeIdx).toBeGreaterThan(visitIdx);
    expect(escapeIdx).toBeGreaterThan(seizeIdx);
    expect(chestIdx).toBeGreaterThan(escapeIdx);
    expect(doorIdx).toBeGreaterThan(chestIdx);
    expect(shopIdx).toBeGreaterThan(doorIdx);
    expect(arenaIdx).toBeGreaterThan(shopIdx);
    expect(attackIdx).toBeGreaterThan(arenaIdx);
    expect(staffIdx).toBeGreaterThan(attackIdx);
    expect(equipIdx).toBeGreaterThan(staffIdx);
    expect(vulneraryIdx).toBeGreaterThan(equipIdx);
    expect(tradeIdx).toBeGreaterThan(vulneraryIdx);
    expect(storageIdx).toBeGreaterThan(tradeIdx);
    expect(waitIdx).toBeGreaterThan(storageIdx);
    expect(cancelIdx).toBeGreaterThan(waitIdx);

    // Talk is top priority and has pulsing gold primary class
    expect(html).toContain('class="we-action-primary" data-testid="action-talk"');
  });
});

describe('PLAN Items 141 & 142: Direct attack & stay in place attack targets', () => {
  const marthUnit: ExtendedUnitState = {
    unit: {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      classId: 'lord',
      position: { x: 24, y: 5 },
      mov: 7,
      moveType: 'foot',
      isDead: false,
      hasActed: false,
    },
    level: 1,
    exp: 0,
    stats: { hp: 18, maxHp: 18, str: 5, mag: 0, skill: 3, spd: 7, lck: 7, def: 7, res: 0 },
    weapon: ITEM_BY_ID.get('rapier'),
    inventory: [
      { itemId: 'rapier', uses: 28 },
      { itemId: 'iron_sword', uses: 40 },
    ],
  };

  const adjacentEnemy: ExtendedUnitState = {
    unit: {
      id: 'enemy_gazzak',
      name: 'Gazzak',
      faction: 'enemy',
      classId: 'pirate',
      position: { x: 24, y: 6 },
      mov: 6,
      moveType: 'bandit',
      isDead: false,
      hasActed: false,
    },
    level: 5,
    exp: 0,
    stats: { hp: 30, maxHp: 30, str: 9, mag: 0, skill: 3, spd: 6, lck: 1, def: 6, res: 0 },
    weapon: ITEM_BY_ID.get('steel_axe'),
    inventory: [{ itemId: 'steel_axe', uses: 30 }],
  };

  const distantEnemy: ExtendedUnitState = {
    unit: {
      id: 'enemy_pirate',
      name: 'Pirate',
      faction: 'enemy',
      classId: 'pirate',
      position: { x: 24, y: 8 },
      mov: 6,
      moveType: 'bandit',
      isDead: false,
      hasActed: false,
    },
    level: 2,
    exp: 0,
    stats: { hp: 20, maxHp: 20, str: 7, mag: 0, skill: 2, spd: 5, lck: 0, def: 4, res: 0 },
    weapon: ITEM_BY_ID.get('iron_axe'),
    inventory: [{ itemId: 'iron_axe', uses: 35 }],
  };

  it('correctly identifies adjacent enemy as attackable target from origin position', () => {
    const pos = marthUnit.unit.position;
    const distAdj = getManhattanDistance(pos, adjacentEnemy.unit.position);
    expect(distAdj).toBe(1);
    expect(canAttackAtDistance(marthUnit, ITEM_BY_ID, distAdj)).toBe(true);

    const distFar = getManhattanDistance(pos, distantEnemy.unit.position);
    expect(distFar).toBe(3);
    expect(canAttackAtDistance(marthUnit, ITEM_BY_ID, distFar)).toBe(false);

    // Usable weapons for target at dist 1
    const attackWeapons = getAttackWeapons(marthUnit, ITEM_BY_ID).filter((weapon) => {
      const range = getAttackRange(marthUnit.unit, weapon.definition);
      return range.max > 0 && distAdj >= range.min && distAdj <= range.max;
    });
    expect(attackWeapons.length).toBe(2); // Rapier and Iron Sword
  });
});
