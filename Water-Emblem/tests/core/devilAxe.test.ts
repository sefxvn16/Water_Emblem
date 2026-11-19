import { describe, expect, it } from 'vitest';
import { chapter01Data } from '../../src/core/data/chapterData';
import { calculateCombatForecast, executeCombat } from '../../src/core/combat/calculator';
import { SeededRNG } from '../../src/core/combat/rng';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import itemsJson from '../../data/items.json';
import type { ItemDefinition } from '../../src/core/combat/types';

// PLAN item 153 (owner 2026-11-20): Devil Axe follows FE11 — rank D,
// Mt17/Wt8/Hit100/25 uses, cannot be sold, backfire (31 − Luck)% (min 1%)
// with damage as if the user attacked themselves.
const devilAxe = (itemsJson.items as ItemDefinition[]).find((item) => item.id === 'devil_axe')!;

function gazzakWithDevilAxe() {
  const gazzak = chapter01Data.units.find(({ unit }) => unit.id === 'gazzak')!;
  return { ...gazzak, weapon: devilAxe, stats: { ...gazzak.stats, lck: 0 } };
}

function forecastGazzak() {
  const attacker = gazzakWithDevilAxe();
  const defender = chapter01Data.units.find(({ unit }) => unit.id === 'marth')!;
  return calculateCombatForecast(
    attacker.unit,
    attacker.stats,
    attacker.weapon,
    defender.unit,
    defender.stats,
    defender.weapon,
    1,
    defaultTerrainRegistry,
    'plains',
    'plains',
  );
}

describe('Devil Axe (PLAN item 153)', () => {
  it('matches FE11 weapon stats in data', () => {
    expect(devilAxe.requiredRank).toBe('D');
    expect(devilAxe.might).toBe(17);
    expect(devilAxe.weight).toBe(8);
    expect(devilAxe.hit).toBe(100);
    expect(devilAxe.maxUses).toBe(25);
    expect(devilAxe.price).toBe(0);
    expect(devilAxe.buyable).toBe(false);
    expect(devilAxe.backfireBase).toBe(31);
  });

  it('backfires onto the user with self-attack damage', () => {
    const forecast = forecastGazzak();
    // Luck 0 → 31% backfire chance; search a seed that triggers it.
    let result = executeCombat(forecast, new SeededRNG(1));
    for (let seed = 2; seed <= 500 && !result.events[0]?.isBackfire; seed++) {
      result = executeCombat(forecast, new SeededRNG(seed));
    }
    const event = result.events[0]!;
    expect(event.isBackfire).toBe(true);
    expect(event.attackerId).toBe('gazzak');
    expect(event.defenderId).toBe('gazzak');
    const attacker = gazzakWithDevilAxe();
    const baseDamage = Math.max(0, attacker.stats.str + devilAxe.might - attacker.stats.def);
    expect(event.damageDealt).toBe(event.isCrit ? baseDamage * 3 : baseDamage);
    expect(event.defenderHpAfter).toBe(attacker.stats.hp - event.damageDealt);
    // Later strikes (counterattack / second backfire) can only lower it further.
    expect(result.forecast.attacker.stats.hp).toBeLessThanOrEqual(attacker.stats.hp - event.damageDealt);
  });

  it('attacks normally when the backfire roll fails', () => {
    const forecast = forecastGazzak();
    let result = executeCombat(forecast, new SeededRNG(1));
    for (let seed = 2; seed <= 500 && result.events[0]?.isBackfire; seed++) {
      result = executeCombat(forecast, new SeededRNG(seed));
    }
    const event = result.events[0]!;
    expect(event.isBackfire).toBeUndefined();
    expect(event.defenderId).toBe('marth');
  });
});
