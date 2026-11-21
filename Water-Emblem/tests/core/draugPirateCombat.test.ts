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

  it('verifies Draug Def 11 takes 2 damage from Pirate Atk 13 and Gordin Def 6 takes 7 damage (PLAN item 184)', () => {
    const draug = chapter01.units.find((u) => u.unit.id === 'draug')!;
    const gordin = chapter01.units.find((u) => u.unit.id === 'gordin')!;
    const pirateHandAxe = chapter01.units.find((u) => u.unit.id === 'enemy_pirate_5')!; // Hand Axe
    const pirateIronAxe = chapter01.units.find((u) => u.unit.id === 'enemy_pirate_1')!; // Iron Axe

    expect(draug).toBeDefined();
    expect(gordin).toBeDefined();
    expect(pirateHandAxe).toBeDefined();
    expect(pirateIronAxe).toBeDefined();

    // Verify Pirate has NO Axefaire (base tier class)
    expect(skillIdsOf(pirateHandAxe)).toEqual([]);

    const units = [draug.unit, gordin.unit, pirateHandAxe.unit, pirateIronAxe.unit];
    const skillMap = new Map(units.map((u) => [u.id, skillIdsOf(chapter01.units.find((cu) => cu.unit.id === u.id)!)]));

    // 1. Pirate with Hand Axe (Atk 13) attacks Draug (Def 11)
    const pirateSkills = getSkillModifiers(
      skillMap.get(pirateHandAxe.unit.id) ?? [],
      pirateHandAxe.unit,
      pirateHandAxe.stats,
      pirateHandAxe.weapon,
      draug.weapon,
      true,
      units,
      skillMap,
      pirateHandAxe.level
    );
    const draugSkills = getSkillModifiers(
      skillMap.get(draug.unit.id) ?? [],
      draug.unit,
      draug.stats,
      draug.weapon,
      pirateHandAxe.weapon,
      false,
      units,
      skillMap,
      draug.level
    );

    // Draug's Armored Blow does not activate when defending
    expect(draugSkills.damageTaken).toBe(0);
    expect(pirateSkills.damage).toBe(0); // No phantom Axefaire

    const forecastDraug = calculateCombatForecast(
      pirateHandAxe.unit,
      pirateHandAxe.stats,
      pirateHandAxe.weapon,
      draug.unit,
      draug.stats,
      draug.weapon,
      1,
      defaultTerrainRegistry,
      'plains',
      'plains',
      units,
      undefined,
      { attacker: pirateSkills, defender: draugSkills }
    );

    // Hand Axe Mt 8 + Str 5 = Atk 13. Draug Def = 11.
    // Damage = 13 - 11 = 2 (NOT 7!)
    expect(forecastDraug.attacker.damage).toBe(2);

    // 2. Pirate with Hand Axe (Atk 13) attacks Gordin (Def 6, HP 18)
    const gordinSkills = getSkillModifiers(
      skillMap.get(gordin.unit.id) ?? [],
      gordin.unit,
      gordin.stats,
      gordin.weapon,
      pirateHandAxe.weapon,
      false,
      units,
      skillMap,
      gordin.level
    );

    const forecastGordinHandAxe = calculateCombatForecast(
      pirateHandAxe.unit,
      pirateHandAxe.stats,
      pirateHandAxe.weapon,
      gordin.unit,
      gordin.stats,
      gordin.weapon,
      1,
      defaultTerrainRegistry,
      'plains',
      'plains',
      units,
      undefined,
      { attacker: pirateSkills, defender: gordinSkills }
    );

    // Damage = 13 - 6 = 7. Gordin HP goes 18 -> 11 (survives, no 1-hit kill!)
    expect(forecastGordinHandAxe.attacker.damage).toBe(7);
    expect(forecastGordinHandAxe.attacker.critRate).toBe(0); // Crit is 0%

    // 3. Pirate with Iron Axe (Atk 12) attacks Gordin (Def 6)
    const forecastGordinIronAxe = calculateCombatForecast(
      pirateIronAxe.unit,
      pirateIronAxe.stats,
      pirateIronAxe.weapon,
      gordin.unit,
      gordin.stats,
      gordin.weapon,
      1,
      defaultTerrainRegistry,
      'plains',
      'plains',
      units,
      undefined,
      { attacker: pirateSkills, defender: gordinSkills }
    );
    // Damage = 12 - 6 = 6
    expect(forecastGordinIronAxe.attacker.damage).toBe(6);
  });
});
