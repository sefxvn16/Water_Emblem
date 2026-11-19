import { describe, expect, it } from 'vitest';
import { calculateCombatForecast, executeCombat } from '../../src/core/combat/calculator';
import { getSkillModifiers, NO_SKILL_MODIFIERS } from '../../src/core/combat/skills';
import { SeededRNG } from '../../src/core/combat/rng';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { skillIdsOf } from '../../src/core/class/classRules';
import { chapters, type ExtendedUnitState } from '../../src/core/data/chapterData';
import charactersJson from '../../data/characters.json';
import itemsJson from '../../data/items.json';
import type { ItemDefinition } from '../../src/core/combat/types';

// PLAN item 152 (owner 2026-11-20): skills follow their FE forms and every
// playable character has a personal skill.
const itemById = new Map((itemsJson.items as ItemDefinition[]).map((item) => [item.id, item]));
const chapter03 = chapters.chapter_03!;

function find(units: readonly ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

describe('FE skill forms (PLAN item 152)', () => {
  it('every playable character in data has a personal skill', () => {
    const playable = ['marth', 'jagen', 'caeda', 'cain', 'abel', 'draug', 'gordin', 'ogma', 'barst',
      'bord', 'cord', 'castor', 'darros', 'wrys', 'navarre', 'julian', 'lena', 'tiki', 'xane', 'feena'];
    for (const id of playable) {
      const character = charactersJson.characters.find((c) => c.id === id) as { personalSkill?: string };
      expect(character?.personalSkill, id).toBeDefined();
    }
  });

  it('axebreaker gives +50 Hit/Avoid vs axes only', () => {
    const units = structuredClone(chapter03.units);
    const caeda = find(units, 'caeda');
    const axe = itemById.get('iron_axe')!;
    const sword = itemById.get('iron_sword')!;
    const all = units.map((u) => u.unit);
    const skillMap = new Map(units.map((u) => [u.unit.id, skillIdsOf(u)]));
    const vsAxe = getSkillModifiers(['winged_grace'], caeda.unit, caeda.stats, caeda.weapon, axe, true, all, skillMap);
    expect(vsAxe.hit).toBe(50);
    expect(vsAxe.avoid).toBe(50);
    const vsSword = getSkillModifiers(['winged_grace'], caeda.unit, caeda.stats, caeda.weapon, sword, true, all, skillMap);
    expect(vsSword.hit).toBe(0);
    expect(vsSword.avoid).toBe(0);
  });

  it('wrath triggers at exactly half HP; perfectionist needs full HP', () => {
    const units = structuredClone(chapter03.units);
    const cain = find(units, 'cain');
    // Keep Marth's Charisma aura out of range so only the tested skill counts.
    find(units, 'marth').unit.position = { x: 0, y: 0 };
    cain.unit.position = { x: 20, y: 20 };
    const all = units.map((u) => u.unit);
    const skillMap = new Map(units.map((u) => [u.unit.id, skillIdsOf(u)]));
    const half = { ...cain.stats, hp: Math.floor(cain.stats.maxHp / 2) };
    expect(getSkillModifiers(['hot_blood'], cain.unit, half, cain.weapon, undefined, true, all, skillMap).crit).toBe(20);
    const full = { ...cain.stats, hp: cain.stats.maxHp };
    const perf = getSkillModifiers(['calm'], cain.unit, full, cain.weapon, undefined, true, all, skillMap);
    expect(perf.hit).toBe(15);
    expect(perf.avoid).toBe(15);
    const hurt = { ...cain.stats, hp: cain.stats.maxHp - 1 };
    expect(getSkillModifiers(['calm'], cain.unit, hurt, cain.weapon, undefined, true, all, skillMap).hit).toBe(0);
  });

  it('anathema lowers nearby enemies Avoid and Crit Avoid', () => {
    const units = structuredClone(chapter03.units);
    const marth = find(units, 'marth');
    const enemy = units.find((u) => u.unit.faction === 'enemy')!;
    enemy.unit.position = { x: marth.unit.position.x + 2, y: marth.unit.position.y };
    const all = units.map((u) => u.unit);
    const skillMap = new Map(units.map((u) => [u.unit.id, u.unit.id === enemy.unit.id ? ['focus'] : skillIdsOf(u)]));
    const mods = getSkillModifiers([], marth.unit, marth.stats, marth.weapon, enemy.weapon, true, all, skillMap);
    expect(mods.avoid).toBe(-10);
    expect(mods.dodge).toBe(-10);
  });

  it('sure strike chance equals level with bows; pavise chance equals Skill', () => {
    const units = structuredClone(chapter03.units);
    const gordin = find(units, 'gordin');
    const all = units.map((u) => u.unit);
    const skillMap = new Map(units.map((u) => [u.unit.id, skillIdsOf(u)]));
    const mods = getSkillModifiers(['sureshot', 'pavise'], gordin.unit, gordin.stats, gordin.weapon, undefined, true, all, skillMap, 12);
    expect(mods.sureStrikeChance).toBe(12);
    expect(mods.paviseChance).toBe(gordin.stats.skill);
  });

  it('pavise halves sword damage at execution when it procs', () => {
    const units = structuredClone(chapter03.units);
    const marth = find(units, 'marth');
    const draug = find(units, 'draug');
    const forecast = calculateCombatForecast(
      marth.unit, marth.stats, marth.weapon, draug.unit, draug.stats, draug.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', units.map((u) => u.unit), undefined,
      { attacker: { ...NO_SKILL_MODIFIERS }, defender: { ...NO_SKILL_MODIFIERS, paviseChance: 100 } },
    );
    expect(forecast.defender.paviseChance).toBe(100);
    let result = executeCombat(forecast, new SeededRNG(1));
    for (let seed = 2; seed <= 200 && !result.events[0]?.isHit; seed++) {
      result = executeCombat(forecast, new SeededRNG(seed));
    }
    const event = result.events[0]!;
    expect(event.isHit).toBe(true);
    expect(event.isPavise).toBe(true);
    const fullDamage = event.isCrit ? forecast.attacker.damage * 3 : forecast.attacker.damage;
    expect(event.damageDealt).toBe(Math.floor(fullDamage / 2));
  });

  it('sure strike guarantees a hit at execution when it procs', () => {
    const units = structuredClone(chapter03.units);
    const gordin = find(units, 'gordin');
    const draug = find(units, 'draug');
    const forecast = calculateCombatForecast(
      gordin.unit, gordin.stats, gordin.weapon, draug.unit, draug.stats, draug.weapon,
      2, defaultTerrainRegistry, 'plains', 'plains', units.map((u) => u.unit), undefined,
      { attacker: { ...NO_SKILL_MODIFIERS, sureStrikeChance: 100 }, defender: { ...NO_SKILL_MODIFIERS } },
    );
    const forced = { ...forecast, attacker: { ...forecast.attacker, hitRate: 0 } };
    const result = executeCombat(forced, new SeededRNG(3));
    expect(result.events[0]!.isHit).toBe(true);
  });
});
