import supportsData from '../../../data/supports.json';
import { GridUnit } from '../grid/types';

export interface SupportBonus {
  readonly hit: number;
  readonly avoid: number;
  readonly crit: number;
  readonly dodge: number;
}

export interface SupportRelationship {
  readonly supporterId: string;
  readonly supportedId: string;
  readonly bonus: SupportBonus;
}

export function calculateSupportBonus(
  unit: GridUnit,
  allUnits: readonly GridUnit[]
): SupportBonus {
  let totalHit = 0;
  let totalAvoid = 0;
  let totalCrit = 0;
  let totalDodge = 0;

  const activationRange = supportsData.activationRange;
  const relationships = supportsData.relationships as SupportRelationship[];

  for (const ally of allUnits) {
    if (ally.id === unit.id || ally.isDead || ally.faction !== unit.faction) {
      continue;
    }

    const dist = Math.abs(unit.position.x - ally.position.x) + Math.abs(unit.position.y - ally.position.y);
    if (dist <= activationRange) {
      const rel = relationships.find(
        (r) => r.supporterId === ally.id && r.supportedId === unit.id
      );
      if (rel) {
        totalHit += rel.bonus.hit;
        totalAvoid += rel.bonus.avoid;
        totalCrit += rel.bonus.crit;
        totalDodge += rel.bonus.dodge;
      }
    }
  }

  return {
    hit: totalHit,
    avoid: totalAvoid,
    crit: totalCrit,
    dodge: totalDodge,
  };
}
