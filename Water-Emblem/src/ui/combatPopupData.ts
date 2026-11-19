import type { CombatResult, SingleAttackEvent } from '../core/combat/types';
import { getClassDefinition } from '../core/class/classRules';
import type { ExtendedUnitState } from '../core/data/chapterData';
import type { UnitFaction } from '../core/grid/types';

export interface CombatPopupSide {
  readonly name: string;
  readonly faction: UnitFaction;
  readonly className: string;
  readonly weaponName: string;
  readonly level: number;
  readonly maxHp: number;
  readonly hpBefore: number;
  readonly hpAfter: number;
  readonly strikes: readonly string[];
  readonly defeated: boolean;
}

export interface CombatPopupData {
  readonly id: number;
  readonly sides: readonly [CombatPopupSide, CombatPopupSide];
}

function strikeText(event: SingleAttackEvent): string {
  if (!event.isHit) return 'Miss';
  return `${event.isCrit ? 'Critical' : 'Hit'} ${event.damageDealt}`;
}

function side(entry: ExtendedUnitState, hpBefore: number, hpAfter: number, result: CombatResult): CombatPopupSide {
  return {
    name: entry.unit.name,
    faction: entry.unit.faction,
    className: getClassDefinition(entry.unit.classId)?.name ?? entry.unit.classId ?? '—',
    weaponName: entry.weapon?.name ?? 'Unarmed',
    level: entry.level,
    maxHp: entry.stats.maxHp,
    hpBefore,
    hpAfter,
    strikes: result.events.filter((event) => event.attackerId === entry.unit.id).map(strikeText),
    defeated: result.unitDefeatedId === entry.unit.id,
  };
}

/**
 * Reads a finished exchange into display data. HP before must be captured before executeCombat,
 * which writes the new HP into the forecast stats. Enemy side first (left), player side second (right).
 */
export function buildCombatPopup(
  id: number,
  attacker: ExtendedUnitState,
  defender: ExtendedUnitState,
  hpBefore: { readonly attacker: number; readonly defender: number },
  result: CombatResult,
): CombatPopupData {
  const a = side(attacker, hpBefore.attacker, result.forecast.attacker.stats.hp, result);
  const d = side(defender, hpBefore.defender, result.forecast.defender.stats.hp, result);
  return { id, sides: a.faction === 'enemy' ? [a, d] : [d, a] };
}
