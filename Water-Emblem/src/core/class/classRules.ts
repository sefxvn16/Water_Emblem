import classesJson from '../../../data/classes.json' with { type: 'json' };
import type { ItemDefinition } from '../combat/types';
import type { GridUnit, MoveType } from '../grid/types';
import type { ExtendedUnitState } from '../data/chapterData';

export interface ClassDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameVi: string;
  readonly moveType: MoveType;
  readonly baseMov: number;
  readonly usableWeapons: readonly string[];
  readonly baseStats: Readonly<Record<string, number>>;
  readonly promotions: readonly string[];
  readonly tier: 'base' | 'promoted' | 'dismounted';
  readonly mountKind?: 'ground' | 'flying';
  readonly hitBonus?: number;
  readonly critBonus?: number;
  readonly sourceClass?: string;
  readonly growths?: Readonly<Record<string, number>>;
}

const classById = new Map<string, ClassDefinition>(
  (classesJson.classes as ClassDefinition[]).map((entry) => [entry.id, entry]),
);

export function getClassDefinition(classId: string | undefined): ClassDefinition | undefined {
  return classId === undefined ? undefined : classById.get(classId);
}

export function isWeaponUsable(unit: GridUnit, weapon: ItemDefinition): boolean {
  if (weapon.type === 'consumable') return false;
  const definition = getClassDefinition(unit.classId);
  if (definition && !definition.usableWeapons.includes(weapon.type)) return false;
  const ranks = ['E', 'D', 'C', 'B', 'A'];
  const held = unit.weaponRanks?.[weapon.type] ?? 'E';
  return ranks.indexOf(held) >= ranks.indexOf(weapon.requiredRank ?? 'E');
}

export function getAttackRange(unit: GridUnit, weapon: ItemDefinition): { min: number; max: number } {
  if (weapon.type === 'staff' || !isWeaponUsable(unit, weapon)) return { min: 1, max: 0 };
  if (weapon.type === 'bow' && unit.classId === 'sniper') return { min: 2, max: 3 };
  if (weapon.type === 'bow' && unit.classId === 'mangudai') return { min: 2, max: 2 };
  return { min: weapon.minRange, max: weapon.maxRange };
}

export function changeMountedState(entry: ExtendedUnitState, mounted: boolean): ExtendedUnitState | null {
  const unit = entry.unit;
  const currentClass = getClassDefinition(unit.classId);
  if (!currentClass) return null;
  if (!mounted && currentClass.mountKind === 'ground') {
    const destination = getClassDefinition(unit.classId === 'warlord' ? 'lord' : 'paladin');
    if (!destination) return null;
    return {
      ...entry,
      unit: {
        ...unit,
        classId: destination.id,
        mountedClassId: unit.classId,
        moveType: destination.moveType,
        mov: destination.baseMov,
      },
    };
  }
  if (mounted && unit.mountedClassId) {
    const destination = getClassDefinition(unit.mountedClassId);
    if (!destination || destination.mountKind !== 'ground') return null;
    return {
      ...entry,
      unit: {
        ...unit,
        classId: destination.id,
        mountedClassId: undefined,
        moveType: destination.moveType,
        mov: destination.baseMov,
      },
    };
  }
  return null;
}

export function promoteUnit(
  entry: ExtendedUnitState,
  targetClassId: string,
  hasPromotionItem: boolean,
): ExtendedUnitState | null {
  const { unit, stats } = entry;
  const currentClass = getClassDefinition(unit.classId);
  const targetClass = getClassDefinition(targetClassId);
  // FE11 item.cpp:182-215 requires a promotion item and level 10.
  if (!hasPromotionItem || entry.level < 10 || !currentClass || !targetClass
    || !currentClass.promotions.includes(targetClassId)) return null;
  const nextStats = { ...stats };
  for (const key of ['str', 'mag', 'skill', 'spd', 'lck', 'def', 'res'] as const) {
    nextStats[key] = Math.min(30, stats[key] + Math.max(0, (targetClass.baseStats[key] ?? 0) - (currentClass.baseStats[key] ?? 0)));
  }
  const hpGain = Math.max(0, (targetClass.baseStats.hp ?? 0) - (currentClass.baseStats.hp ?? 0));
  nextStats.maxHp = Math.min(60, stats.maxHp + hpGain);
  nextStats.hp = Math.min(nextStats.maxHp, stats.hp + hpGain);
  return {
    ...entry,
    // FE11 unit.cpp:2049-2058 resets level and EXP on job change.
    level: 1,
    exp: 0,
    unit: {
      ...unit,
      classId: targetClass.id,
      mountedClassId: undefined,
      moveType: targetClass.moveType,
      mov: targetClass.baseMov,
    },
    stats: nextStats,
  };
}

function spendItem(entry: ExtendedUnitState, itemId: string): ExtendedUnitState | null {
  const index = entry.inventory.findIndex((item) => item.itemId === itemId && item.uses > 0);
  if (index < 0) return null;
  const inventory = entry.inventory.map((item, itemIndex) =>
    itemIndex === index ? { ...item, uses: item.uses - 1 } : { ...item });
  return { ...entry, inventory: inventory.filter((item) => item.uses > 0) };
}

export function useVulnerary(entry: ExtendedUnitState, item: ItemDefinition): ExtendedUnitState | null {
  if (item.id !== 'vulnerary' || item.type !== 'consumable' || !item.healAmount
    || entry.unit.isDead || entry.stats.hp >= entry.stats.maxHp) return null;
  const spent = spendItem(entry, item.id);
  if (!spent) return null;
  return { ...spent, stats: { ...entry.stats, hp: Math.min(entry.stats.maxHp, entry.stats.hp + item.healAmount) } };
}

export function promoteWithMasterSeal(entry: ExtendedUnitState, targetClassId: string): ExtendedUnitState | null {
  if (!entry.inventory.some((item) => item.itemId === 'master_seal' && item.uses > 0)) return null;
  const promoted = promoteUnit(entry, targetClassId, true);
  return promoted ? spendItem(promoted, 'master_seal') : null;
}
