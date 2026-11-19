import { describe, expect, it } from 'vitest';
import { chapters, type ExtendedUnitState } from '../../src/core/data/chapterData';
import { ARENA_TIERS, canEnterArena, generateArenaOpponent, runArenaFight } from '../../src/core/combat/arena';
import { SeededRNG } from '../../src/core/combat/rng';
import type { ItemDefinition } from '../../src/core/combat/types';
import itemsJson from '../../data/items.json';

const ITEM_BY_ID = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));
const testChapter = chapters.test_chapter_01!;

function marth(): ExtendedUnitState {
  const entry = testChapter.units.find((u) => u.unit.id === 'marth');
  if (!entry) throw new Error('marth not found');
  return structuredClone(entry);
}

describe('arena (PLAN item 93)', () => {
  it('generates a mirror opponent toughened by the wager tier', () => {
    const player = marth();
    const opponent = generateArenaOpponent(player, ARENA_TIERS[2]!, ITEM_BY_ID);
    expect(opponent).toBeDefined();
    expect(opponent!.unit.faction).toBe('enemy');
    expect(opponent!.level).toBe(player.level + 2);
    expect(opponent!.stats.str).toBe(player.stats.str + 2);
    expect(opponent!.stats.maxHp).toBe(player.stats.maxHp + 4);
    expect(opponent!.stats.hp).toBe(opponent!.stats.maxHp);
    expect(opponent!.weapon?.id).toBe('iron_sword');
  });

  it('refuses unarmed and staff-only units', () => {
    const player = marth();
    expect(canEnterArena(player)).toBe(true);
    const unarmed: ExtendedUnitState = { ...player, weapon: undefined };
    expect(canEnterArena(unarmed)).toBe(false);
    expect(generateArenaOpponent(unarmed, ARENA_TIERS[0]!, ITEM_BY_ID)).toBeUndefined();
    const staffUser: ExtendedUnitState = { ...player, weapon: ITEM_BY_ID.get('heal_staff') };
    expect(canEnterArena(staffUser)).toBe(false);
  });

  it('a strong unit wins, gains EXP, and spends weapon uses', () => {
    const player = marth();
    player.stats = { ...player.stats, hp: 60, maxHp: 60, str: 30, skill: 30, spd: 30, def: 30, res: 30 };
    const opponent = generateArenaOpponent(marth(), ARENA_TIERS[0]!, ITEM_BY_ID)!;
    const usesBefore = player.inventory.find((i) => i.itemId === player.weapon!.id)!.uses;

    const outcome = runArenaFight(player, opponent, new SeededRNG(42), ITEM_BY_ID);
    expect(outcome.won).toBe(true);
    expect(outcome.expGained).toBeGreaterThan(0);
    expect(outcome.playerAfter.stats.hp).toBeGreaterThan(0);
    const usesAfter = outcome.playerAfter.inventory.find((i) => i.itemId === player.weapon!.id)?.uses ?? 0;
    expect(usesAfter).toBeLessThan(usesBefore);
  });

  it('a weak unit loses non-lethally with 1 HP', () => {
    const player = marth();
    player.stats = { ...player.stats, hp: 5, maxHp: 5, str: 0, skill: 0, spd: 0, def: 0, res: 0, lck: 0 };
    const opponent = generateArenaOpponent(marth(), ARENA_TIERS[2]!, ITEM_BY_ID)!;
    opponent.stats = { ...opponent.stats, hp: 60, maxHp: 60, str: 30, skill: 30, spd: 30, def: 30 };

    const outcome = runArenaFight(player, opponent, new SeededRNG(7), ITEM_BY_ID);
    expect(outcome.won).toBe(false);
    expect(outcome.playerAfter.stats.hp).toBe(1);
    expect(outcome.playerAfter.unit.isDead).not.toBe(true);
  });
});
