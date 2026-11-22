import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { awardExperience, applyCombatExperience } from '../../src/core/progression/experience';
import { SeededRNG } from '../../src/core/combat/rng';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import type { CombatResult, ItemDefinition } from '../../src/core/combat/types';
import { LevelUpModal } from '../../src/ui/LevelUpModal';
import { UnitHoverWindow } from '../../src/ui/UnitHoverWindow';
import { UnitInspectorWindow } from '../../src/ui/UnitInspectorWindow';
import { WeaponRanksTab, SkillsTab, SupportsTab } from '../../src/ui/UnitInspectorParts';
import { FACTION_TONES } from '../../src/core/grid/factionTones';

const mockSword: ItemDefinition = {
  id: 'iron_sword',
  name: 'Iron Sword',
  nameVi: 'Kiếm Sắt',
  type: 'sword',
  might: 5,
  hit: 100,
  crit: 0,
  weight: 2,
  minRange: 1,
  maxRange: 1,
  effectiveAgainst: [],
  maxUses: 40,
};

const mockUnit: ExtendedUnitState = {
  unit: {
    id: 'marth',
    name: 'Marth',
    classId: 'lord',
    moveType: 'foot',
    faction: 'player',
    position: { x: 24, y: 5 },
    mov: 7,
    isDead: false,
    weaponRanks: { sword: 'B' },
    weaponExp: { sword: 45 },
  },
  stats: {
    hp: 18,
    maxHp: 18,
    str: 7,
    mag: 0,
    skill: 8,
    spd: 10,
    lck: 7,
    def: 7,
    res: 0,
  },
  level: 1,
  exp: 95,
  weapon: mockSword,
  inventory: [
    { itemId: 'iron_sword', uses: 38 },
    { itemId: 'vulnerary', uses: 3 },
  ],
  growths: { hp: 80, str: 50, mag: 0, skill: 40, spd: 50, lck: 70, def: 20, res: 5 },
  personalSkill: 'charisma',
};

describe('modern FE UI components: tabbed inspector, mini hover card, and animated level up modal', () => {
  it('awardExperience calculates statGains and old/new levels upon level up', () => {
    const rng = new SeededRNG(42);
    const result = awardExperience(mockUnit, 10, rng);

    expect(result.gainedLevel).toBe(true);
    expect(result.oldLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.statGains).toBeDefined();
    expect(typeof result.statGains?.hp).toBe('number');
    expect(typeof result.statGains?.str).toBe('number');
    expect(typeof result.statGains?.spd).toBe('number');
    expect(result.entry.level).toBe(2);
    expect(result.entry.exp).toBe(5); // 95 + 10 - 100 = 5
    expect(result.entry.stats.maxHp).toBe(mockUnit.stats.maxHp + (result.statGains?.hp ?? 0));
  });

  it('applyCombatExperience outputs levelUps array with LevelUpEvent', () => {
    const rng = new SeededRNG(12345);
    const mockDefender: ExtendedUnitState = {
      unit: {
        id: 'pirate_boss',
        name: 'Gazzak',
        classId: 'pirate',
        moveType: 'foot',
        faction: 'enemy',
        position: { x: 23, y: 5 },
        mov: 5,
        isDead: true,
      },
      stats: { hp: 0, maxHp: 22, str: 8, mag: 0, skill: 4, spd: 6, lck: 2, def: 5, res: 0 },
      level: 5,
      exp: 0,
      inventory: [],
    };

    const mockCombat: CombatResult = {
      forecast: {
        attacker: { unit: mockUnit.unit, stats: mockUnit.stats, weapon: mockUnit.weapon, damage: 12, hitRate: 100, critRate: 5, attackSpeed: 8, attackCount: 1, canCounter: false },
        defender: { unit: mockDefender.unit, stats: mockDefender.stats, weapon: undefined, damage: 0, hitRate: 0, critRate: 0, attackSpeed: 0, attackCount: 0, canCounter: false },
        distance: 1,
      },
      events: [
        { attackerId: 'marth', defenderId: 'pirate_boss', damageDealt: 12, isCrit: false, isHit: true, defenderHpAfter: 0 },
      ],
      unitDefeatedId: 'pirate_boss',
    };

    const expResult = applyCombatExperience([mockUnit, mockDefender], mockCombat, rng);
    expect(expResult.messages.length).toBeGreaterThan(0);
    expect(expResult.levelUps).toBeDefined();
    expect(expResult.levelUps.length).toBe(1);
    expect(expResult.levelUps[0]?.unit.unit.id).toBe('marth');
    expect(expResult.levelUps[0]?.oldLevel).toBe(1);
    expect(expResult.levelUps[0]?.newLevel).toBe(2);
    expect(expResult.levelUps[0]?.statGains).toBeDefined();
  });

  it('LevelUpModal renders golden banner, level transition, and +1 stat gain badges', () => {
    const rawHtml = renderToString(
      React.createElement(LevelUpModal, {
        unit: mockUnit,
        oldLevel: 1,
        newLevel: 2,
        statGains: { hp: 1, str: 1, mag: 0, skill: 1, spd: 1, lck: 1, def: 0, res: 0 },
        onClose: () => {},
      })
    );
    const html = rawHtml.replace(/<!-- -->/g, '');

    expect(html).toContain('data-testid="level-up-modal"');
    expect(html).toContain('LEVEL UP!');
    expect(html).toContain('Marth');
    expect(html).toContain('Lv. 1 ➔ Lv. 2');
    expect(html).toContain('+1');
    expect(html).toContain('Continue ➔');
  });

  it('UnitHoverWindow renders modern mini card with 2-color HP bar and Mt/Hit preview', () => {
    const rawHtml = renderToString(
      React.createElement(UnitHoverWindow, {
        unit: mockUnit,
        tile: { x: 24, y: 5 },
        onInspect: () => {},
      })
    );
    const html = rawHtml.replace(/<!-- -->/g, '');

    expect(html).toContain('data-testid="hover-banner"');
    expect(html).toContain('data-testid="hover-hp-bar"');
    expect(html).toContain('data-testid="hover-combat-preview"');
    expect(html).toContain('HP 18 / 18');
    expect(html).toContain('Mt');
    expect(html).toContain('Hit');
    expect(html).toContain('Details ℹ️');
  });

  it('UnitInspectorWindow renders tabbed navigation and maintains single button constraint', () => {
    const html = renderToString(
      React.createElement(UnitInspectorWindow, {
        unit: mockUnit,
        allUnits: [mockUnit],
        terrainId: 'plains',
        tile: { x: 24, y: 5 },
        onClose: () => {},
      })
    );

    // Critical constraint for E2E: only 1 button element in DOM (the Close button)
    const buttonMatches = html.match(/<button/g);
    expect(buttonMatches).toHaveLength(1);

    // Tab Navigation Bar
    expect(html).toContain('role="tablist"');
    expect(html).toContain('⚔️ Stats');
    expect(html).toContain('🛡️ Ranks');
    expect(html).toContain('✦ Skills');
    expect(html).toContain('🤝 Supports');

    // DOM TestIDs required by existing E2E tests
    expect(html).toContain('data-testid="inspector"');
    expect(html).toContain('data-testid="inspector-weapons"');
    expect(html).toContain('data-testid="inspector-items"');
    expect(html).toContain('data-testid="inspector-col-combat"');
    expect(html).toContain('data-testid="inspector-col-attributes"');
    expect(html).toContain('data-testid="inspector-box-vitals"');
  });

  it('WeaponRanksTab, SkillsTab, and SupportsTab render modern FE details', () => {
    const inventoryItems = [
      { id: 'iron_sword', name: 'Iron Sword', type: 'sword', uses: 38 },
      { id: 'vulnerary', name: 'Vulnerary', type: 'item', uses: 3 },
    ];

    const ranksHtml = renderToString(
      React.createElement(WeaponRanksTab, {
        unit: mockUnit,
        tone: FACTION_TONES.player,
        inventoryItems,
      })
    );
    expect(ranksHtml).toContain('Weapon Proficiencies');
    expect(ranksHtml).toContain('Sword');
    expect(ranksHtml).toContain('Rank B');
    expect(ranksHtml).toContain('WEx');
    expect(ranksHtml).toContain('Full Inventory');

    const skillsHtml = renderToString(
      React.createElement(SkillsTab, {
        unit: mockUnit,
        tone: FACTION_TONES.player,
      })
    );
    expect(skillsHtml).toContain('Equipped Skills');
    expect(skillsHtml).toContain('Charisma');
    expect(skillsHtml).toContain('PASSIVE');

    const supportsHtml = renderToString(
      React.createElement(SupportsTab, {
        unit: mockUnit,
        allUnits: [mockUnit],
        tone: FACTION_TONES.player,
      })
    );
    expect(supportsHtml).toContain('Support Bonds &amp; Affinities');
    expect(supportsHtml).toContain('Caeda');
  });
});
