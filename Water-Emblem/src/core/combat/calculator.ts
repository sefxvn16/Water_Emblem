import balanceConfig from '../../../data/balance.json';
import {
  CombatForecast,
  CombatResult,
  CombatSideForecast,
  ItemDefinition,
  SingleAttackEvent,
  UnitCombatStats,
  WeaponType,
} from './types';
import { GridUnit, Position, WeaponRank } from '../grid/types';
import { SeededRNG } from './rng';
import { TerrainRegistry } from '../grid/terrain';
import { calculateSupportBonus } from './support';
import type { SkillModifiers } from './skills';
import { getAttackRange, getClassDefinition } from '../class/classRules';

export interface TriangleResult {
  readonly damage: number;
  readonly hit: number;
}

export function getManhattanDistance(posA: Position, posB: Position): number {
  return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

export function getWeaponTriangleModifier(
  attackerType: WeaponType,
  defenderType: WeaponType,
  attackerRank: WeaponRank = 'E',
  defenderRank: WeaponRank = 'E'
): TriangleResult {
  const triangle = balanceConfig.weaponTriangle as Record<
    string,
    { strongAgainst: string | null; weakAgainst: string | null }
  >;

  const attackerRules = triangle[attackerType];
  if (!attackerRules) {
    return balanceConfig.triangleModifiers.neutral;
  }

  if (attackerRules.strongAgainst === defenderType) {
    return {
      damage: attackerRank === 'A' ? balanceConfig.triangleRankBonuses.aRankDamage : 0,
      hit: ['C', 'B', 'A'].includes(attackerRank)
        ? balanceConfig.triangleRankBonuses.highRankHit
        : balanceConfig.triangleModifiers.advantage.hit,
    };
  }
  if (attackerRules.weakAgainst === defenderType) {
    return {
      damage: defenderRank === 'A' ? -balanceConfig.triangleRankBonuses.aRankDamage : 0,
      hit: ['C', 'B', 'A'].includes(defenderRank)
        ? -balanceConfig.triangleRankBonuses.highRankHit
        : balanceConfig.triangleModifiers.disadvantage.hit,
    };
  }

  return balanceConfig.triangleModifiers.neutral;
}

function getWeaponRankBonus(type: WeaponType, rank: WeaponRank): { might: number; hit: number } {
  const typeBonuses = balanceConfig.weaponRankBonuses[type as keyof typeof balanceConfig.weaponRankBonuses];
  if (!typeBonuses || rank === 'E' || rank === 'D') return { might: 0, hit: 0 };
  return typeBonuses[rank];
}

export function calculateDisplayedCombatStats(
  unit: GridUnit,
  stats: UnitCombatStats,
  weapon: ItemDefinition | undefined,
  terrainId: string,
  terrainRegistry: TerrainRegistry,
  allUnits: readonly GridUnit[],
): { atk: number; hit: number; avoid: number; crit: number; as: number } {
  const support = calculateSupportBonus(unit, allUnits);
  const classDefinition = getClassDefinition(unit.classId);
  const as = calculateAttackSpeed(stats, weapon);
  const avoid = as + Math.floor(stats.lck / 2) + terrainRegistry.getAvoidBonus(terrainId, unit.moveType) + support.avoid;
  if (!weapon) {
    return { atk: 0, hit: 0, avoid, crit: 0, as };
  }
  const rank = unit.weaponRanks?.[weapon.type] ?? 'E';
  const rankBonus = getWeaponRankBonus(weapon.type, rank);
  return {
    atk: (weapon.isMagic ? stats.mag : stats.str) + weapon.might + rankBonus.might,
    hit: weapon.hit + stats.skill + Math.floor(stats.lck / 2) + rankBonus.hit + support.hit + (classDefinition?.hitBonus ?? 0),
    avoid,
    crit: weapon.crit + Math.floor(stats.skill / 2) + support.crit + (classDefinition?.critBonus ?? 0),
    as,
  };
}

export function isWeaponEffective(weapon: ItemDefinition, defenderUnit: GridUnit): boolean {
  return weapon.effectiveAgainst.includes(defenderUnit.moveType);
}

export function calculateAttackSpeed(stats: UnitCombatStats, weapon?: ItemDefinition): number {
  if (!weapon) return stats.spd;
  const speedPenalty = Math.max(0, weapon.weight - stats.str);
  return Math.max(0, stats.spd - speedPenalty);
}

export function calculateCombatSide(
  unit: GridUnit,
  stats: UnitCombatStats,
  weapon: ItemDefinition | undefined,
  opponentUnit: GridUnit,
  opponentStats: UnitCombatStats,
  opponentWeapon: ItemDefinition | undefined,
  distance: number,
  terrainRegistry: TerrainRegistry,
  _terrainId: string,
  opponentTerrainId: string,
  allUnits?: readonly GridUnit[],
  heightDiff = 0,
  skillMods?: SkillModifiers,
  opponentSkillMods?: SkillModifiers
): CombatSideForecast {
  if (!weapon) {
    return {
      unit,
      stats,
      weapon: undefined,
      damage: 0,
      hitRate: 0,
      critRate: 0,
      attackSpeed: stats.spd,
      attackCount: 0,
      canCounter: false,
    };
  }

  const range = getAttackRange(unit, weapon);
  const inRange = distance >= range.min && distance <= range.max;
  if (!inRange) {
    return {
      unit,
      stats,
      weapon,
      damage: 0,
      hitRate: 0,
      critRate: 0,
      attackSpeed: calculateAttackSpeed(stats, weapon),
      attackCount: 0,
      canCounter: false,
    };
  }

  const unitRank = unit.weaponRanks?.[weapon.type] ?? 'E';
  const opponentRank = opponentWeapon ? opponentUnit.weaponRanks?.[opponentWeapon.type] ?? 'E' : 'E';
  const triangle = opponentWeapon
    ? getWeaponTriangleModifier(weapon.type, opponentWeapon.type, unitRank, opponentRank)
    : balanceConfig.triangleModifiers.neutral;
  const rankBonus = opponentWeapon && getWeaponTriangleModifier(opponentWeapon.type, weapon.type).hit > 0
    ? { might: 0, hit: 0 }
    : getWeaponRankBonus(weapon.type, unitRank);

  // Tính Support Bonuses
  const unitSupport = allUnits ? calculateSupportBonus(unit, allUnits) : { hit: 0, avoid: 0, crit: 0, dodge: 0 };
  const opponentSupport = allUnits ? calculateSupportBonus(opponentUnit, allUnits) : { hit: 0, avoid: 0, crit: 0, dodge: 0 };
  const classDefinition = getClassDefinition(unit.classId);

  // Tính Effective Might
  const isEffective = isWeaponEffective(weapon, opponentUnit);
  const effectiveMight = isEffective
    ? weapon.might * balanceConfig.effectiveMultiplier
    : weapon.might;

  const attackPower = (weapon.isMagic ? stats.mag : stats.str) + effectiveMight + triangle.damage + rankBonus.might;

  const opponentTerrainDef = weapon.isMagic ? 0 : terrainRegistry.getDefenseBonus(opponentTerrainId, opponentUnit.moveType);
  const defense = (weapon.isMagic ? opponentStats.res : opponentStats.def) + opponentTerrainDef;
  // PLAN items 112/113: skill damage modifiers.
  const damage = Math.max(0, attackPower - defense + (skillMods?.damage ?? 0) + (opponentSkillMods?.damageTaken ?? 0));

  // Tính Hit
  // PLAN item 104 (V07): height advantage — ±10 Hit per elevation level,
  // capped at ±20 [Giả định].
  const heightBonus = Math.max(-20, Math.min(20, heightDiff * 10));
  // PLAN item 103 (V05): pincer — an ally of the attacker stands on the
  // far side of the opponent; +15 Hit, +10 Crit [Giả định].
  const pincer = allUnits ? hasPincerAlly(unit, opponentUnit, allUnits) : false;
  const accuracy = weapon.hit + stats.skill + Math.floor(stats.lck / 2) + triangle.hit + unitSupport.hit + rankBonus.hit + (classDefinition?.hitBonus ?? 0) + heightBonus + (pincer ? 15 : 0) + (skillMods?.hit ?? 0);
  const opponentAs = calculateAttackSpeed(opponentStats, opponentWeapon);
  const opponentAvoid = opponentAs + Math.floor(opponentStats.lck / 2) + terrainRegistry.getAvoidBonus(opponentTerrainId, opponentUnit.moveType) + opponentSupport.avoid + (opponentSkillMods?.avoid ?? 0);
  const hitRate = Math.min(100, Math.max(0, accuracy - opponentAvoid));

  // Tính Crit
  const rawCrit = weapon.crit + Math.floor(stats.skill / 2) + unitSupport.crit + (classDefinition?.critBonus ?? 0) + (pincer ? 10 : 0) + (skillMods?.crit ?? 0) - (opponentStats.lck + opponentSupport.dodge);
  const critRate = Math.min(100, Math.max(0, rawCrit));

  const as = calculateAttackSpeed(stats, weapon);

  return {
    unit,
    stats,
    weapon,
    damage,
    hitRate,
    critRate,
    attackSpeed: as,
    attackCount: 1, // Sẽ tính double attack sau khi so sánh AS cả 2 bên
    canCounter: inRange,
  };
}

/**
 * PLAN item 103 (V05 pincer): true when a living ally of `unit` stands on
 * the far side of `opponent` relative to `unit` — adjacent to the opponent
 * in the half-plane away from the attacker.
 */
export function hasPincerAlly(unit: GridUnit, opponent: GridUnit, allUnits: readonly GridUnit[]): boolean {
  const dx = opponent.position.x - unit.position.x;
  const dy = opponent.position.y - unit.position.y;
  if (dx === 0 && dy === 0) return false;
  return allUnits.some((ally) => {
    if (ally.id === unit.id || ally.id === opponent.id || ally.isDead) return false;
    if (ally.faction !== unit.faction) return false;
    const ax = ally.position.x - opponent.position.x;
    const ay = ally.position.y - opponent.position.y;
    if (Math.abs(ax) + Math.abs(ay) !== 1) return false;
    // Far side: the ally step from the opponent points away from the attacker.
    return ax * dx + ay * dy > 0;
  });
}

export function calculateCombatForecast(
  attackerUnit: GridUnit,
  attackerStats: UnitCombatStats,
  attackerWeapon: ItemDefinition | undefined,
  defenderUnit: GridUnit,
  defenderStats: UnitCombatStats,
  defenderWeapon: ItemDefinition | undefined,
  distance: number,
  terrainRegistry: TerrainRegistry,
  attackerTerrainId: string,
  defenderTerrainId: string,
  allUnits?: readonly GridUnit[],
  elevations?: { readonly attacker: number; readonly defender: number },
  skills?: { readonly attacker?: SkillModifiers; readonly defender?: SkillModifiers }
): CombatForecast {
  const heightDiff = elevations ? elevations.attacker - elevations.defender : 0;
  let attackerSide = calculateCombatSide(
    attackerUnit,
    attackerStats,
    attackerWeapon,
    defenderUnit,
    defenderStats,
    defenderWeapon,
    distance,
    terrainRegistry,
    attackerTerrainId,
    defenderTerrainId,
    allUnits,
    heightDiff,
    skills?.attacker,
    skills?.defender
  );

  let defenderSide = calculateCombatSide(
    defenderUnit,
    defenderStats,
    defenderWeapon,
    attackerUnit,
    attackerStats,
    attackerWeapon,
    distance,
    terrainRegistry,
    defenderTerrainId,
    attackerTerrainId,
    allUnits,
    -heightDiff,
    skills?.defender,
    skills?.attacker
  );

  // Đánh 2 lần (Double Attack)
  let attackerCount = attackerSide.attackCount;
  let defenderCount = defenderSide.attackCount;

  if (attackerSide.attackCount > 0
    && attackerSide.attackSpeed - defenderSide.attackSpeed >= balanceConfig.doubleAttackSpeedThreshold) {
    attackerCount = 2;
  } else if (defenderSide.canCounter && defenderSide.attackSpeed - attackerSide.attackSpeed >= balanceConfig.doubleAttackSpeedThreshold) {
    defenderCount = 2;
  }

  attackerSide = { ...attackerSide, attackCount: attackerCount };
  defenderSide = { ...defenderSide, attackCount: defenderCount };

  return {
    attacker: attackerSide,
    defender: defenderSide,
    distance,
  };
}

export function executeCombat(
  forecast: CombatForecast,
  rng: SeededRNG
): CombatResult {
  const events: SingleAttackEvent[] = [];
  let attackerHp = forecast.attacker.stats.hp;
  let defenderHp = forecast.defender.stats.hp;
  let unitDefeatedId: string | undefined;
  if (forecast.attacker.attackCount === 0) return { forecast, events };

  const mode = balanceConfig.rngMode as '1RN' | '2RN';

  const makeAttack = (
    fromAttacker: boolean
  ): boolean => {
    const side = fromAttacker ? forecast.attacker : forecast.defender;
    const isDefenderTarget = fromAttacker;

    const isHit = rng.rollHit(side.hitRate, mode);
    let damage = 0;
    let isCrit = false;

    if (isHit) {
      isCrit = rng.rollCrit(side.critRate);
      damage = isCrit ? side.damage * balanceConfig.critMultiplier : side.damage;
    }

    if (isDefenderTarget) {
      defenderHp = Math.max(0, defenderHp - damage);
    } else {
      attackerHp = Math.max(0, attackerHp - damage);
    }

    events.push({
      attackerId: side.unit.id,
      defenderId: isDefenderTarget ? forecast.defender.unit.id : forecast.attacker.unit.id,
      isHit,
      isCrit,
      damageDealt: damage,
      defenderHpAfter: isDefenderTarget ? defenderHp : attackerHp,
    });

    if (isDefenderTarget && defenderHp <= 0) {
      unitDefeatedId = forecast.defender.unit.id;
      return true; // Target died
    }
    if (!isDefenderTarget && attackerHp <= 0) {
      unitDefeatedId = forecast.attacker.unit.id;
      return true; // Target died
    }
    return false;
  };

  // Round 1: Attacker đánh trước
  const defenderDiedRound1 = makeAttack(true);

  // Round 2: Defender phản đòn (nếu còn sống và có thể counter)
  if (!defenderDiedRound1 && forecast.defender.canCounter) {
    const attackerDiedRound2 = makeAttack(false);
    if (attackerDiedRound2) {
      // Attacker chết khi bị phản đòn
      forecast.attacker.stats.hp = attackerHp;
      forecast.defender.stats.hp = defenderHp;
      return { forecast, events, unitDefeatedId };
    }
  }

  // Round 3: Đòn đánh thứ hai (Double attack)
  if (defenderHp > 0 && attackerHp > 0) {
    if (forecast.attacker.attackCount === 2) {
      makeAttack(true);
    } else if (forecast.defender.canCounter && forecast.defender.attackCount === 2) {
      makeAttack(false);
    }
  }

  // Cập nhật lại HP
  forecast.attacker.stats.hp = attackerHp;
  forecast.defender.stats.hp = defenderHp;

  return {
    forecast,
    events,
    unitDefeatedId,
  };
}
