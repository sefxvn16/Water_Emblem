import skillsJson from '../../../data/skills.json' with { type: 'json' };
import type { GridUnit } from '../grid/types';
import type { ItemDefinition, UnitCombatStats } from './types';
import { getManhattanDistance } from './calculator';

/**
 * Skills (PLAN items 112/113, N01/N02): personal skills come from the
 * character, class skills from the class. Effects are combat modifiers
 * applied in the forecast: hit/crit/avoid/damage dealt/damage taken,
 * plus a heal bonus for staff users. Definitions and effect numbers are
 * declared in data/skills.json (PLAN item 134); values are [Giả định].
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
  damage: number;
  damageTaken: number;
}

export const NO_SKILL_MODIFIERS: SkillModifiers = { hit: 0, crit: 0, avoid: 0, damage: 0, damageTaken: 0 };

export function getSkillModifiers(
  skillIds: readonly string[],
  unit: GridUnit,
  stats: UnitCombatStats,
  weapon: ItemDefinition | undefined,
  opponentWeapon: ItemDefinition | undefined,
  isAttacker: boolean,
  allUnits: readonly GridUnit[],
  allySkillIds: ReadonlyMap<string, readonly string[]>,
): SkillModifiers {
  const mods: SkillModifiers = { ...NO_SKILL_MODIFIERS };
  const weaponType = weapon?.type;
  for (const id of skillIds) {
    switch (id) {
      case 'winged_grace':
        if (opponentWeapon?.type === 'axe') mods.avoid += skillNumber(id, 'avoid');
        break;
      case 'veteran':
        mods.hit += skillNumber(id, 'hit');
        break;
      case 'hot_blood':
        if (stats.hp * 2 < stats.maxHp) mods.crit += skillNumber(id, 'crit');
        break;
      case 'calm':
        if (stats.hp >= stats.maxHp) mods.hit += skillNumber(id, 'hit');
        break;
      case 'bulwark':
        if (!isAttacker) mods.damageTaken += skillNumber(id, 'damageTaken');
        break;
      case 'deadeye':
        if (weaponType === 'bow') mods.crit += skillNumber(id, 'crit');
        break;
      case 'nimble':
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
      case 'sureshot':
        if (weaponType === 'bow') mods.hit += skillNumber(id, 'hit');
        break;
      case 'pavise':
        mods.damageTaken += skillNumber(id, 'damageTaken');
        break;
      case 'focus':
        if (weaponType === 'tome') mods.hit += skillNumber(id, 'hit');
        break;
      default:
        break;
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

/** Extra healing from staff skills (gentle/healer), declared in data. */
export function getHealBonus(skillIds: readonly string[]): number {
  let bonus = 0;
  if (skillIds.includes('gentle')) bonus += skillNumber('gentle', 'healBonus');
  if (skillIds.includes('healer')) bonus += skillNumber('healer', 'healBonus');
  return bonus;
}
