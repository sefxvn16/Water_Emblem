import { describe, expect, it } from 'vitest';
import itemsData from '../../data/items.json';
import { calculateCombatForecast } from '../../src/core/combat/calculator';
import { getHealBonus, getSkillModifiers } from '../../src/core/combat/skills';
import { defaultTerrainRegistry } from '../../src/core/grid/terrain';
import { reclassOptions, reclassUnit, skillIdsOf } from '../../src/core/class/classRules';
import { initialChapterData, type ExtendedUnitState } from '../../src/core/data/chapterData';
import type { ItemDefinition } from '../../src/core/combat/types';

const items = itemsData.items as readonly ItemDefinition[];
const itemById = new Map(items.map((item) => [item.id, item]));

function freshUnits(): ExtendedUnitState[] {
  return structuredClone(initialChapterData.units);
}

function find(units: ExtendedUnitState[], id: string): ExtendedUnitState {
  const entry = units.find((u) => u.unit.id === id);
  if (!entry) throw new Error(`unit ${id} not found`);
  return entry;
}

describe('skills (PLAN items 112/113, N01/N02)', () => {
  it('loads personal skills from character data and class skills from class data', () => {
    const units = freshUnits();
    expect(skillIdsOf(find(units, 'marth'))).toContain('charisma');
    expect(skillIdsOf(find(units, 'caeda'))).toContain('winged_grace');
    expect(skillIdsOf(find(units, 'gordin'))).toContain('deadeye');
    expect(skillIdsOf(find(units, 'gordin'))).toContain('sureshot');
    expect(skillIdsOf(find(units, 'draug'))).toContain('pavise');
    // Promoted class has class skill (e.g. warlord has swordfaire)
    const warlord = { ...find(units, 'marth'), unit: { ...find(units, 'marth').unit, classId: 'warlord' } };
    expect(skillIdsOf(warlord)).toContain('swordfaire');
  });

  it('swordfaire adds +5 damage; armored blow only when initiating; pavise is a proc (PLAN item 152)', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    const warlord = { ...marth, unit: { ...marth.unit, classId: 'warlord' } };
    const draug = find(units, 'draug');
    const allySkillIds = new Map(units.map((u) => [u.unit.id, skillIdsOf(u)]));
    const all = units.map((u) => u.unit);
    const marthMods = getSkillModifiers(skillIdsOf(warlord), warlord.unit, warlord.stats, warlord.weapon, draug.weapon, true, all, allySkillIds);
    const draugMods = getSkillModifiers(skillIdsOf(draug), draug.unit, draug.stats, draug.weapon, marth.weapon, false, all, allySkillIds);
    expect(marthMods.damage).toBe(5); // Swordfaire FE13 +5
    expect(draugMods.damageTaken).toBe(0); // Armored Blow needs initiation
    expect(draugMods.paviseChance).toBe(draug.stats.skill); // Pavise FE13 proc
    const draugAttacking = getSkillModifiers(skillIdsOf(draug), draug.unit, draug.stats, draug.weapon, marth.weapon, true, all, allySkillIds);
    expect(draugAttacking.damageTaken).toBe(-10); // Armored Blow FE14

    const plain = calculateCombatForecast(
      warlord.unit, warlord.stats, warlord.weapon, draug.unit, draug.stats, draug.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', all,
    );
    const skilled = calculateCombatForecast(
      warlord.unit, warlord.stats, warlord.weapon, draug.unit, draug.stats, draug.weapon,
      1, defaultTerrainRegistry, 'plains', 'plains', all, undefined,
      { attacker: marthMods, defender: draugMods },
    );
    expect(skilled.attacker.damage).toBe(Math.max(0, plain.attacker.damage + 5));
  });

  it('charisma grants nearby allies +10 Hit and Avoid', () => {
    const units = freshUnits();
    const marth = find(units, 'marth');
    const caeda = find(units, 'caeda');
    marth.unit.position = { x: 5, y: 5 };
    caeda.unit.position = { x: 6, y: 5 };
    const allySkillIds = new Map(units.map((u) => [u.unit.id, skillIdsOf(u)]));
    const mods = getSkillModifiers(skillIdsOf(caeda), caeda.unit, caeda.stats, caeda.weapon, undefined, true, units.map((u) => u.unit), allySkillIds);
    expect(mods.hit).toBe(10);
    expect(mods.avoid).toBe(10);
    caeda.unit.position = { x: 10, y: 5 };
    const farMods = getSkillModifiers(skillIdsOf(caeda), caeda.unit, caeda.stats, caeda.weapon, undefined, true, units.map((u) => u.unit), allySkillIds);
    expect(farMods.hit).toBe(0);
  });

  it('healtouch adds +5 and does not stack with itself (PLAN item 152)', () => {
    expect(getHealBonus(['gentle'])).toBe(5);
    expect(getHealBonus(['gentle', 'healer'])).toBe(5);
    expect(getHealBonus(['healer'])).toBe(5);
    expect(getHealBonus([])).toBe(0);
    void itemById;
  });
});

describe('reclass (PLAN item 114, N04)', () => {
  it('changes class within the same tier with overlapping weapons', () => {
    const units = freshUnits();
    const cain = find(units, 'cain'); // cavalier (lance/sword?)
    const options = reclassOptions(cain);
    expect(options.length).toBeGreaterThan(0);
    const target = options[0]!;
    const reclassed = reclassUnit(cain, target.id);
    expect(reclassed).not.toBeNull();
    expect(reclassed!.unit.classId).toBe(target.id);
    expect(reclassed!.level).toBe(cain.level);
    expect(reclassed!.stats).toEqual(cain.stats);
  });

  it('rejects cross-tier, lord and non-overlapping classes', () => {
    const units = freshUnits();
    const cain = find(units, 'cain');
    expect(reclassUnit(cain, 'paladin')).toBeNull(); // promoted tier
    expect(reclassUnit(cain, 'lord')).toBeNull();
    expect(reclassUnit(cain, 'cavalier')).toBeNull(); // same class
    expect(reclassUnit(cain, 'mage_m')).toBeNull(); // no weapon overlap
  });

  it('class skill follows the new class', () => {
    const units = freshUnits();
    const gordin = find(units, 'gordin'); // archer: sureshot
    expect(skillIdsOf(gordin)).toContain('sureshot');
    const reclassed = reclassUnit(gordin, 'hunter'); // hunter: base tier, no faire
    expect(reclassed).not.toBeNull();
    expect(skillIdsOf(reclassed!)).not.toContain('sureshot');
    expect(skillIdsOf(reclassed!)).toContain('deadeye'); // personal stays
    expect(skillIdsOf(reclassed!)).not.toContain('bowfaire');
    // Promoted class carries Faire skill per Fire Emblem canon
    const sniper = { ...gordin, unit: { ...gordin.unit, classId: 'sniper' } };
    expect(skillIdsOf(sniper)).toContain('bowfaire');
  });
});
