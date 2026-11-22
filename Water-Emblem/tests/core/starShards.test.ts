import { describe, it, expect } from 'vitest';
import type { ExtendedUnitState } from '../../src/core/data/chapterData';
import {
  getEffectiveGrowthRates,
  STAR_SHARD_GROWTH_BONUSES,
  STARSPHERE_ALL_GROWTH_BONUS,
} from '../../src/core/progression/experience';
import { applyCombatDurability } from '../../src/core/combat/durability';
import type { CombatResult, ItemDefinition } from '../../src/core/combat/types';
import itemsJson from '../../data/items.json';

const itemMap = new Map<string, ItemDefinition>(
  itemsJson.items.map((i) => [i.id, i as unknown as ItemDefinition])
);

describe('Star Shards & Starsphere Growth Bonuses and Durability', () => {
  const baseMarth: ExtendedUnitState = {
    unit: {
      id: 'marth',
      name: 'Marth',
      faction: 'player',
      position: { x: 0, y: 0 },
      mov: 4,
      moveType: 'foot',
      classId: 'lord',
    },
    stats: { hp: 18, maxHp: 18, str: 5, mag: 0, skill: 3, spd: 7, lck: 7, def: 7, res: 0 },
    level: 1,
    exp: 0,
    inventory: [],
  };

  it('calculates base growths with empty inventory', () => {
    const baseGrowths = getEffectiveGrowthRates(baseMarth);
    expect(baseGrowths.hp).toBeGreaterThan(0);
    expect(baseGrowths.str).toBeGreaterThan(0);
  });

  it('Capricorn shard grants +20% HP, +10% Str, +10% Def (FE3 bugfix verified)', () => {
    const baseGrowths = getEffectiveGrowthRates(baseMarth);
    const withCapricorn: ExtendedUnitState = {
      ...baseMarth,
      inventory: [{ itemId: 'capricorn_shard', uses: 1 }],
    };
    const capricornGrowths = getEffectiveGrowthRates(withCapricorn);

    expect(capricornGrowths.hp).toBe((baseGrowths.hp ?? 0) + 20);
    expect(capricornGrowths.str).toBe((baseGrowths.str ?? 0) + 10);
    expect(capricornGrowths.def).toBe((baseGrowths.def ?? 0) + 10);
    expect(capricornGrowths.spd).toBe(baseGrowths.spd);
  });

  it('all 12 Star Shards grant their exact canonical FE3 stat bonuses', () => {
    const baseGrowths = getEffectiveGrowthRates(baseMarth);

    for (const [shardId, expectedBonuses] of Object.entries(STAR_SHARD_GROWTH_BONUSES)) {
      const withShard: ExtendedUnitState = {
        ...baseMarth,
        inventory: [{ itemId: shardId, uses: 1 }],
      };
      const growths = getEffectiveGrowthRates(withShard);

      for (const [stat, bonus] of Object.entries(expectedBonuses)) {
        expect(growths[stat]).toBe((baseGrowths[stat] ?? 0) + bonus);
      }
    }
  });

  it('holding multiple Star Shards stacks growth bonuses', () => {
    const baseGrowths = getEffectiveGrowthRates(baseMarth);
    const withTwoShards: ExtendedUnitState = {
      ...baseMarth,
      inventory: [
        { itemId: 'leo_shard', uses: 1 },    // +50 Str
        { itemId: 'cancer_shard', uses: 1 }, // +50 Def
      ],
    };
    const growths = getEffectiveGrowthRates(withTwoShards);

    expect(growths.str).toBe((baseGrowths.str ?? 0) + 50);
    expect(growths.def).toBe((baseGrowths.def ?? 0) + 50);
  });

  it('holding Starsphere adds +50% to all growths', () => {
    const baseGrowths = getEffectiveGrowthRates(baseMarth);
    const withStarsphere: ExtendedUnitState = {
      ...baseMarth,
      inventory: [{ itemId: 'starsphere', uses: 1 }],
    };
    const growths = getEffectiveGrowthRates(withStarsphere);

    for (const stat of ['hp', 'str', 'mag', 'skill', 'spd', 'lck', 'def', 'res']) {
      expect(growths[stat]).toBe((baseGrowths[stat] ?? 0) + STARSPHERE_ALL_GROWTH_BONUS);
    }
  });

  it('Starsphere prevents weapon durability degradation', () => {
    const ironSword = itemMap.get('iron_sword')!;
    const marthWithIronSword: ExtendedUnitState = {
      ...baseMarth,
      weapon: ironSword,
      inventory: [
        { itemId: 'iron_sword', uses: 40 },
        { itemId: 'starsphere', uses: 1 },
      ],
    };

    const mockCombatResult: CombatResult = {
      forecast: {
        attacker: {
          unit: baseMarth.unit,
          stats: baseMarth.stats,
          weapon: ironSword,
          damage: 10,
          hitRate: 100,
          critRate: 0,
          attackSpeed: 10,
          attackCount: 1,
          canCounter: true,
        },
        defender: {
          unit: { id: 'enemy_1', name: 'Enemy', faction: 'enemy', position: { x: 1, y: 0 }, mov: 4, moveType: 'foot' },
          stats: { hp: 20, maxHp: 20, str: 5, mag: 0, skill: 5, spd: 5, lck: 0, def: 0, res: 0 },
          weapon: undefined,
          damage: 0,
          hitRate: 0,
          critRate: 0,
          attackSpeed: 5,
          attackCount: 0,
          canCounter: false,
        },
        distance: 1,
      },
      events: [
        {
          attackerId: 'marth',
          defenderId: 'enemy_1',
          isHit: true,
          isCrit: false,
          damageDealt: 10,
          defenderHpAfter: 10,
        },
      ],
    };

    const afterCombat = applyCombatDurability([marthWithIronSword], mockCombatResult, itemMap);
    const marthAfter = afterCombat.find((u) => u.unit.id === 'marth');

    // Holding Starsphere: durability should remain at 40 (did not decrease!)
    expect(marthAfter?.inventory[0]?.uses).toBe(40);
  });
});
