import { describe, expect, it } from 'vitest';
import { chapters } from '../../src/core/data/chapterData';
import { calculateCombatForecast, executeCombat } from '../../src/core/combat/calculator';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { skillIdsOf } from '../../src/core/class/classRules';
import { getSkillModifiers } from '../../src/core/combat/skills';
import { SeededRNG } from '../../src/core/combat/rng';

describe('Draug vs Galder Pirate (South 1) Combat Investigation (PLAN item 166)', () => {
  const chapter01 = chapters.chapter_01!;

  it('reproduces Draug attacking Galder Pirate (South 1)', () => {
    const draug = chapter01.units.find((u) => u.unit.id === 'draug')!;
    const pirate = chapter01.units.find((u) => u.unit.id === 'enemy_pirate_9')!;
    expect(draug).toBeDefined();
    expect(pirate).toBeDefined();

    const units = [draug.unit, pirate.unit];
    const skillMap = new Map([
      [draug.unit.id, skillIdsOf(draug)],
      [pirate.unit.id, skillIdsOf(pirate)],
    ]);

    const attackerSkills = getSkillModifiers(
      skillMap.get(draug.unit.id) ?? [],
      draug.unit,
      draug.stats,
      draug.weapon,
      pirate.weapon,
      true,
      units,
      skillMap,
      draug.level
    );

    const defenderSkills = getSkillModifiers(
      skillMap.get(pirate.unit.id) ?? [],
      pirate.unit,
      pirate.stats,
      pirate.weapon,
      draug.weapon,
      false,
      units,
      skillMap,
      pirate.level
    );

    // Draug's personal skill is bulwark (Armored Blow: damageTaken -10)
    expect(attackerSkills.damageTaken).toBe(-10);

    const forecast = calculateCombatForecast(
      draug.unit,
      draug.stats,
      draug.weapon,
      pirate.unit,
      pirate.stats,
      pirate.weapon,
      1,
      defaultTerrainRegistry,
      'plains',
      'plains',
      units,
      undefined,
      { attacker: attackerSkills, defender: defenderSkills }
    );

    // Pirate Atk: Str 4 + Iron Axe Mt 8 + Triangle 1 = 13
    // Draug Def: 11
    // Base damage = 13 - 11 = 2
    // With Draug's Armored Blow (-10): 2 - 10 = -8 -> clamped to 0!
    expect(forecast.defender.canCounter).toBe(true);
    expect(forecast.defender.damage).toBe(0);

    // Execute combat with RNG where pirate hits
    const rng = new SeededRNG(42);
    const result = executeCombat(forecast, rng);

    // Verify pirate DID counterattack!
    const pirateEvents = result.events.filter((e) => e.attackerId === pirate.unit.id);
    expect(pirateEvents.length).toBeGreaterThanOrEqual(1);
    expect(pirateEvents[0]!.damageDealt).toBe(0);
    expect(result.forecast.attacker.stats.hp).toBe(draug.stats.hp); // Draug lost 0 HP!
  });
});
