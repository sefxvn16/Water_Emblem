import { describe, it, expect } from 'vitest';
import { resolveCombatConsequences } from '../../src/core/combat/combatResolution';
import { chapter01Data } from '../../src/core/data/chapterData';
import { SeededRNG } from '../../src/core/combat/rng';
import itemsJson from '../../data/items.json';
import type { CombatResult } from '../../src/core/combat/types';
import type { ItemDefinition } from '../../src/core/combat/types';

describe('combatResolution module (PLAN item 135)', () => {
  const itemById = new Map((itemsJson.items as ItemDefinition[]).map((i) => [i.id, i]));
  const rng = new SeededRNG(42);

  it('updates post-combat HP, generates sound cues, strike logs, and applies weapon durability', () => {
    const marth = structuredClone(chapter01Data.units.find((u) => u.unit.id === 'marth')!);
    const pirate = structuredClone(chapter01Data.units.find((u) => u.unit.faction === 'enemy')!);
    const initialAttHp = marth.stats.hp;
    const initialDefHp = pirate.stats.hp;
    const pirateId = pirate.unit.id;

    const mockResult: CombatResult = {
      forecast: {
        attacker: { unit: marth.unit, damage: 7, attackCount: 1, hitRate: 90, critRate: 5, attackSpeed: 10, canCounter: false, stats: { ...marth.stats, hp: initialAttHp } },
        defender: { unit: pirate.unit, damage: 4, attackCount: 1, hitRate: 60, critRate: 0, attackSpeed: 6, canCounter: true, stats: { ...pirate.stats, hp: initialDefHp - 7 } },
        distance: 1,
      },
      events: [
        { attackerId: 'marth', defenderId: pirateId, damageDealt: 7, defenderHpAfter: initialDefHp - 7, isHit: true, isCrit: false },
      ],
      unitDefeatedId: undefined,
    };

    const resolution = resolveCombatConsequences({
      units: [marth, pirate],
      result: mockResult,
      rng,
      itemById,
      itemsList: itemsJson.items as ItemDefinition[],
      chapter: chapter01Data,
      dialogues: {},
      gold: 1000,
      villageStates: {},
    });

    // Defender HP reduced
    const updatedPirate = resolution.units.find((u) => u.unit.id === pirateId)!;
    expect(updatedPirate.stats.hp).toBe(initialDefHp - 7);

    // Logs recorded strike
    expect(resolution.logs.some((l) => l.includes('strikes') && l.includes('7 damage'))).toBe(true);

    // Sound cue recorded
    expect(resolution.soundCues.some((c) => c.type === 'weapon')).toBe(true);

    // Attacker durability reduced by 1
    const updatedMarth = resolution.units.find((u) => u.unit.id === 'marth')!;
    if (marth.inventory[0]?.uses && updatedMarth.inventory[0]) {
      expect(updatedMarth.inventory[0].uses).toBe(marth.inventory[0].uses - 1);
    }
  });

  it('handles unit defeat, marks dead flag, and outputs death sound cue', () => {
    const marth = structuredClone(chapter01Data.units.find((u) => u.unit.id === 'marth')!);
    const pirate = structuredClone(chapter01Data.units.find((u) => u.unit.faction === 'enemy')!);
    const pirateId = pirate.unit.id;

    const mockResult: CombatResult = {
      forecast: {
        attacker: { unit: marth.unit, damage: 20, attackCount: 1, hitRate: 100, critRate: 0, attackSpeed: 10, canCounter: false, stats: { ...marth.stats } },
        defender: { unit: pirate.unit, damage: 0, attackCount: 0, hitRate: 0, critRate: 0, attackSpeed: 0, canCounter: false, stats: { ...pirate.stats, hp: 0 } },
        distance: 1,
      },
      events: [
        { attackerId: 'marth', defenderId: pirateId, damageDealt: pirate.stats.hp, defenderHpAfter: 0, isHit: true, isCrit: false },
      ],
      unitDefeatedId: pirateId,
    };

    const resolution = resolveCombatConsequences({
      units: [marth, pirate],
      result: mockResult,
      rng,
      itemById,
      itemsList: itemsJson.items as ItemDefinition[],
      chapter: chapter01Data,
      dialogues: {},
      gold: 500,
      villageStates: {},
    });

    const defeatedPirate = resolution.units.find((u) => u.unit.id === pirateId)!;
    expect(defeatedPirate.unit.isDead).toBe(true);
    expect(resolution.soundCues.some((c) => c.type === 'death')).toBe(true);
    expect(resolution.logs.some((l) => l.includes('has fallen'))).toBe(true);
  });
});
