import skillsJson from '../../../data/skills.json' with { type: 'json' };
import type { GridUnit } from '../grid/types';
import type { ItemDefinition, UnitCombatStats } from './types';
import { getManhattanDistance } from './calculator';

/**
 * Skills (PLAN items 112/113, N01/N02; FE forms per PLAN item 152, owner
 * 2026-11-20): personal skills come from the character, class skills from
 * the class. Effects are combat modifiers applied in the forecast:
 * hit/crit/avoid/dodge/damage dealt/damage taken, plus proc chances
 * (Sure Strike, Pavise) rolled at execution and a heal bonus for staff
 * users. Definitions and effect numbers are declared in data/skills.json
 * (PLAN item 134) and follow their Fire Emblem namesakes (FE8/FE10/FE13/
 * FE14). Skill ids stay stable for save compatibility; display names in
 * data carry the FE names.
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
}

interface SkillDataEntry extends SkillDefinition {
  readonly hit?: number;
  readonly crit?: number;
  readonly avoid?: number;
  readonly damage?: number;
  readonly damageTaken?: number;
  readonly healBonus?: number;
  readonly aura?: { readonly range: number; readonly hit: number; readonly avoid: number };
  readonly anathema?: { readonly range: number; readonly avoid: number; readonly dodge: number };
}

const skillDataById = new Map<string, SkillDataEntry>(
  (skillsJson.skills as SkillDataEntry[]).map((entry) => [entry.id, entry]),
);

export const SKILLS: Record<string, SkillDefinition> = Object.fromEntries(
  [...skillDataById.values()].map(({ id, name, description }) => [id, { id, name, description }]),
);

function skillNumber(id: string, field: 'hit' | 'crit' | 'avoid' | 'damage' | 'damageTaken' | 'healBonus'): number {
  return skillDataById.get(id)?.[field] ?? 0;
}

export interface SkillModifiers {
  hit: number;
  crit: number;
  avoid: number;
  /** Crit Avoid modifier (Anathema lowers it). */
  dodge: number;
  damage: number;
  damageTaken: number;
  /** Sure Strike (FE8): % chance the attack cannot miss (= unit level). */
  sureStrikeChance: number;
  /** Pavise (FE13): % chance to halve sword/lance/axe damage (= Skill). */
  paviseChance: number;
}

export const NO_SKILL_MODIFIERS: SkillModifiers = {
  hit: 0, crit: 0, avoid: 0, dodge: 0, damage: 0, damageTaken: 0, sureStrikeChance: 0, paviseChance: 0,
};

export function getSkillModifiers(
  skillIds: readonly string[],
  unit: GridUnit,
  stats: UnitCombatStats,
  weapon: ItemDefinition | undefined,
  opponentWeapon: ItemDefinition | undefined,
  isAttacker: boolean,
  allUnits: readonly GridUnit[],
  allySkillIds: ReadonlyMap<string, readonly string[]>,
  level = 0,
): SkillModifiers {
  const mods: SkillModifiers = { ...NO_SKILL_MODIFIERS };
  const weaponType = weapon?.type;
  for (const id of skillIds) {
    switch (id) {
      case 'winged_grace': // Axebreaker (FE13): +50 Hit/Avoid vs axes
        if (opponentWeapon?.type === 'axe') {
          mods.hit += skillNumber(id, 'hit');
          mods.avoid += skillNumber(id, 'avoid');
        }
        break;
      case 'veteran': // Hit Rate +20 (FE13)
        mods.hit += skillNumber(id, 'hit');
        break;
      case 'hot_blood': // Wrath (FE13): +20 Crit at or below half HP
        if (stats.hp * 2 <= stats.maxHp) mods.crit += skillNumber(id, 'crit');
        break;
      case 'calm': // Perfectionist (FE14): +15 Hit/Avoid at full HP
        if (stats.hp >= stats.maxHp) {
          mods.hit += skillNumber(id, 'hit');
          mods.avoid += skillNumber(id, 'avoid');
        }
        break;
      case 'bulwark': // Armored Blow (FE14): −10 physical damage when initiating
        if (isAttacker && opponentWeapon?.isMagic !== true) mods.damageTaken += skillNumber(id, 'damageTaken');
        break;
      case 'deadeye': // Critical +10 (FE10)
        mods.crit += skillNumber(id, 'crit');
        break;
      case 'nimble': // Avoid +10 (FE13)
        mods.avoid += skillNumber(id, 'avoid');
        break;
      case 'swordfaire':
        if (weaponType === 'sword') mods.damage += skillNumber(id, 'damage');
        break;
      case 'lancefaire':
        if (weaponType === 'lance') mods.damage += skillNumber(id, 'damage');
        break;
      case 'axefaire':
        if (weaponType === 'axe') mods.damage += skillNumber(id, 'damage');
        break;
      case 'bowfaire':
        if (weaponType === 'bow') mods.damage += skillNumber(id, 'damage');
        break;
      case 'tomefaire':
        if (weaponType === 'tome') mods.damage += skillNumber(id, 'damage');
        break;
      case 'sureshot': // Sure Strike (FE8): Level% guaranteed hit with bows
        if (weaponType === 'bow') mods.sureStrikeChance = Math.max(mods.sureStrikeChance, level);
        break;
      case 'pavise': // Pavise (FE13): Skill% to halve sword/lance/axe damage
        mods.paviseChance = Math.max(mods.paviseChance, stats.skill);
        break;
      default:
        break;
    }
  }
  // Anathema (FE13): enemies within range suffer −10 Avoid / −10 Crit Avoid.
  const anathema = skillDataById.get('focus')?.anathema;
  if (anathema) {
    for (const other of allUnits) {
      if (other.id === unit.id || other.isDead || other.faction === unit.faction) continue;
      if (!allySkillIds.get(other.id)?.includes('focus')) continue;
      if (getManhattanDistance(other.position, unit.position) <= anathema.range) {
        mods.avoid += anathema.avoid;
        mods.dodge += anathema.dodge;
        break;
      }
    }
  }
  // Charisma aura: Hit/Avoid from a nearby ally (not self); range and
  // values declared in data/skills.json.
  const charismaAura = skillDataById.get('charisma')?.aura;
  if (charismaAura) {
    for (const ally of allUnits) {
      if (ally.id === unit.id || ally.isDead || ally.faction !== unit.faction) continue;
      if (!allySkillIds.get(ally.id)?.includes('charisma')) continue;
      if (getManhattanDistance(ally.position, unit.position) <= charismaAura.range) {
        mods.hit += charismaAura.hit;
        mods.avoid += charismaAura.avoid;
        break;
      }
    }
  }
  return mods;
}

/** Healtouch (FE13, PLAN item 152): +5 healing with staves; the personal
 * (gentle) and class (healer) forms are the same skill and do not stack. */
export function getHealBonus(skillIds: readonly string[]): number {
  if (skillIds.includes('gentle')) return skillNumber('gentle', 'healBonus');
  if (skillIds.includes('healer')) return skillNumber('healer', 'healBonus');
  return 0;
}
