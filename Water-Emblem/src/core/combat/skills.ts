import type { GridUnit } from '../grid/types';
import type { ItemDefinition, UnitCombatStats } from './types';
import { getManhattanDistance } from './calculator';

/**
 * Skills (PLAN items 112/113, N01/N02): personal skills come from the
 * character, class skills from the class. Effects are combat modifiers
 * applied in the forecast: hit/crit/avoid/damage dealt/damage taken,
 * plus a heal bonus for staff users. Values are [Giả định].
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
}

export const SKILLS: Record<string, SkillDefinition> = {
  charisma: { id: 'charisma', name: 'Charisma', description: 'Allies within 3 tiles gain +10 Hit and Avoid.' },
  winged_grace: { id: 'winged_grace', name: 'Winged Grace', description: '+10 Avoid against axes.' },
  veteran: { id: 'veteran', name: 'Veteran', description: '+10 Hit.' },
  hot_blood: { id: 'hot_blood', name: 'Hot Blood', description: '+10 Crit when HP is below half.' },
  calm: { id: 'calm', name: 'Calm', description: '+10 Hit at full HP.' },
  bulwark: { id: 'bulwark', name: 'Bulwark', description: 'Takes 2 less damage when defending.' },
  deadeye: { id: 'deadeye', name: 'Deadeye', description: '+10 Crit with bows.' },
  nimble: { id: 'nimble', name: 'Nimble', description: '+10 Avoid.' },
  gentle: { id: 'gentle', name: 'Gentle', description: 'Heals 5 more HP with staves.' },
  swordfaire: { id: 'swordfaire', name: 'Swordfaire', description: '+2 damage with swords.' },
  lancefaire: { id: 'lancefaire', name: 'Lancefaire', description: '+2 damage with lances.' },
  axefaire: { id: 'axefaire', name: 'Axefaire', description: '+2 damage with axes.' },
  bowfaire: { id: 'bowfaire', name: 'Bowfaire', description: '+2 damage with bows.' },
  tomefaire: { id: 'tomefaire', name: 'Tomefaire', description: '+2 damage with tomes.' },
  sureshot: { id: 'sureshot', name: 'Sureshot', description: '+15 Hit with bows.' },
  pavise: { id: 'pavise', name: 'Pavise', description: 'Takes 2 less damage.' },
  focus: { id: 'focus', name: 'Focus', description: '+10 Hit with tomes.' },
  healer: { id: 'healer', name: 'Healer', description: 'Heals 5 more HP with staves.' },
  locktouch: { id: 'locktouch', name: 'Locktouch', description: 'Can open chests and doors without a key.' },
};

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
        if (opponentWeapon?.type === 'axe') mods.avoid += 10;
        break;
      case 'veteran':
        mods.hit += 10;
        break;
      case 'hot_blood':
        if (stats.hp * 2 < stats.maxHp) mods.crit += 10;
        break;
      case 'calm':
        if (stats.hp >= stats.maxHp) mods.hit += 10;
        break;
      case 'bulwark':
        if (!isAttacker) mods.damageTaken -= 2;
        break;
      case 'deadeye':
        if (weaponType === 'bow') mods.crit += 10;
        break;
      case 'nimble':
        mods.avoid += 10;
        break;
      case 'swordfaire':
        if (weaponType === 'sword') mods.damage += 2;
        break;
      case 'lancefaire':
        if (weaponType === 'lance') mods.damage += 2;
        break;
      case 'axefaire':
        if (weaponType === 'axe') mods.damage += 2;
        break;
      case 'bowfaire':
        if (weaponType === 'bow') mods.damage += 2;
        break;
      case 'tomefaire':
        if (weaponType === 'tome') mods.damage += 2;
        break;
      case 'sureshot':
        if (weaponType === 'bow') mods.hit += 15;
        break;
      case 'pavise':
        mods.damageTaken -= 2;
        break;
      case 'focus':
        if (weaponType === 'tome') mods.hit += 10;
        break;
      default:
        break;
    }
  }
  // Charisma aura: +10 Hit/Avoid from a nearby ally (not self).
  for (const ally of allUnits) {
    if (ally.id === unit.id || ally.isDead || ally.faction !== unit.faction) continue;
    if (!allySkillIds.get(ally.id)?.includes('charisma')) continue;
    if (getManhattanDistance(ally.position, unit.position) <= 3) {
      mods.hit += 10;
      mods.avoid += 10;
      break;
    }
  }
  return mods;
}

/** Extra healing from staff skills (gentle/healer): +5 each. */
export function getHealBonus(skillIds: readonly string[]): number {
  let bonus = 0;
  if (skillIds.includes('gentle')) bonus += 5;
  if (skillIds.includes('healer')) bonus += 5;
  return bonus;
}
