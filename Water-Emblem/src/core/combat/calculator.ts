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
import { GridUnit, Position } from '../grid/types';
import { SeededRNG } from './rng';
import { TerrainRegistry } from '../grid/terrain';
import { calculateSupportBonus } from './support';

export interface TriangleResult {
  readonly damage: number;
  readonly hit: number;
}

export function getManhattanDistance(posA: Position, posB: Position): number {
  return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

export function getWeaponTriangleModifier(
  attackerType: WeaponType,
  defenderType: WeaponType
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
    return balanceConfig.triangleModifiers.advantage;
  }
  if (attackerRules.weakAgainst === defenderType) {
    return balanceConfig.triangleModifiers.disadvantage;
  }

  return balanceConfig.triangleModifiers.neutral;
}

export function isWeaponEffective(weapon: ItemDefinition, defenderUnit: GridUnit): boolean {
  return weapon.effectiveAgainst.includes(defenderUnit.moveType);
}

export function calculateAttackSpeed(stats: UnitCombatStats, weapon?: ItemDefinition): number {
  if (!weapon) return stats.spd;
  const constitution = stats.bld ?? stats.str;
  const speedPenalty = Math.max(0, weapon.weight - constitution);
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
  allUnits?: readonly GridUnit[]
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

  const inRange = distance >= weapon.minRange && distance <= weapon.maxRange;
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

  const triangle = opponentWeapon
    ? getWeaponTriangleModifier(weapon.type, opponentWeapon.type)
    : balanceConfig.triangleModifiers.neutral;

  // Tính Support Bonuses
  const unitSupport = allUnits ? calculateSupportBonus(unit, allUnits) : { hit: 0, avoid: 0, crit: 0, dodge: 0 };
  const opponentSupport = allUnits ? calculateSupportBonus(opponentUnit, allUnits) : { hit: 0, avoid: 0, crit: 0, dodge: 0 };

  // Tính Effective Might
  const isEffective = isWeaponEffective(weapon, opponentUnit);
  const effectiveMight = isEffective
    ? weapon.might * balanceConfig.effectiveMultiplier
    : weapon.might;

  const attackPower = (weapon.isMagic ? stats.mag : stats.str) + effectiveMight + triangle.damage;

  const opponentTerrainDef = terrainRegistry.getDefenseBonus(opponentTerrainId);
  const defense = (weapon.isMagic ? opponentStats.res : opponentStats.def) + opponentTerrainDef;
  const damage = Math.max(0, attackPower - defense);

  // Tính Hit
  const accuracy = weapon.hit + 2 * stats.dex + Math.floor(stats.lck / 2) + triangle.hit + unitSupport.hit;
  const opponentAs = calculateAttackSpeed(opponentStats, opponentWeapon);
  const opponentAvoid = 2 * opponentAs + opponentStats.lck + terrainRegistry.getAvoidBonus(opponentTerrainId) + opponentSupport.avoid;
  const hitRate = Math.min(100, Math.max(0, accuracy - opponentAvoid));

  // Tính Crit
  const rawCrit = weapon.crit + Math.floor(stats.dex / 2) + unitSupport.crit - (opponentStats.lck + opponentSupport.dodge);
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

export function calculateCombatForecast(
  attackerUnit: GridUnit,
  attackerStats: UnitCombatStats,
  attackerWeapon: ItemDefinition,
  defenderUnit: GridUnit,
  defenderStats: UnitCombatStats,
  defenderWeapon: ItemDefinition | undefined,
  distance: number,
  terrainRegistry: TerrainRegistry,
  attackerTerrainId: string,
  defenderTerrainId: string,
  allUnits?: readonly GridUnit[]
): CombatForecast {
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
    allUnits
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
    allUnits
  );

  // Đánh 2 lần (Double Attack)
  let attackerCount = attackerSide.attackCount;
  let defenderCount = defenderSide.attackCount;

  if (attackerSide.attackSpeed - defenderSide.attackSpeed >= balanceConfig.doubleAttackSpeedThreshold) {
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
