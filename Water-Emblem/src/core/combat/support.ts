import supportsData from '../../../data/supports.json' with { type: 'json' };
import type { GridUnit } from '../grid/types';

export interface SupportBonus {
  readonly hit: number;
  readonly avoid: number;
  readonly crit: number;
  readonly dodge: number;
}

export interface SupportRelationship {
  readonly supporterId: string;
  readonly supportedId: string;
  readonly startingPoints: number;
  readonly pointsC: number;
  readonly pointsB: number;
  readonly pointsA: number;
}

const relationships: readonly SupportRelationship[] = supportsData.relationships;

export function initialSupportPoints(unitId: string): Record<string, number> {
  return Object.fromEntries(relationships
    .filter(({ supportedId }) => supportedId === unitId)
    .map(({ supporterId, startingPoints }) => [supporterId, startingPoints]));
}

export function advanceSupportPoints(unit: GridUnit, participatingIds: ReadonlySet<string>): Record<string, number> {
  const points = { ...initialSupportPoints(unit.id), ...unit.supportPoints };
  if (!participatingIds.has(unit.id) || unit.isDead) return points;
  for (const relation of relationships) {
    if (relation.supportedId !== unit.id || !participatingIds.has(relation.supporterId)) continue;
    points[relation.supporterId] = Math.min(
      relation.pointsA,
      (points[relation.supporterId] ?? relation.startingPoints) + 1,
    );
  }
  return points;
}

export function calculateSupportBonus(unit: GridUnit, allUnits: readonly GridUnit[]): SupportBonus {
  const total = { hit: 0, avoid: 0, crit: 0, dodge: 0 };
  for (const ally of allUnits) {
    if (ally.id === unit.id || ally.isDead || ally.faction !== unit.faction) continue;
    const distance = Math.abs(unit.position.x - ally.position.x) + Math.abs(unit.position.y - ally.position.y);
    if (distance > supportsData.activationRange) continue;
    const relation = relationships.find(({ supporterId, supportedId }) =>
      supporterId === ally.id && supportedId === unit.id);
    if (!relation) continue;
    const points = unit.supportPoints?.[ally.id] ?? relation.startingPoints;
    // PLAN item 134: rank bonuses are declared in data/supports.json.
    const bonus = points >= relation.pointsA ? supportsData.rankBonuses.A
      : points >= relation.pointsB ? supportsData.rankBonuses.B
      : points >= relation.pointsC ? supportsData.rankBonuses.C
      : undefined;
    if (bonus) {
      total.hit += bonus.hit;
      total.avoid += bonus.avoid;
      total.crit += bonus.crit;
      total.dodge += bonus.dodge;
    }
  }
  return total;
}
