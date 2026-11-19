import { GridUnit, MoveType } from '../grid/types';

export type WeaponType = 'sword' | 'lance' | 'axe' | 'bow' | 'tome' | 'staff' | 'consumable';

export interface ItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameVi: string;
  readonly type: WeaponType;
  readonly might: number;
  readonly hit: number;
  readonly weight: number;
  readonly crit: number;
  readonly minRange: number;
  readonly maxRange: number;
  readonly maxUses: number;
  readonly requiredRank?: 'E' | 'D' | 'C' | 'B' | 'A';
  readonly healBase?: number;
  readonly healMagDivisor?: number;
  readonly healAmount?: number;
  /** Shop price in gold (PLAN item 91; FE11 values in data/items.json). */
  readonly price?: number;
  /** False = never sold in shops (personal weapons, Master Seal, Warp, Devil Axe). */
  readonly buyable?: boolean;
  readonly effectiveAgainst: readonly MoveType[];
  readonly isMagic?: boolean;
}

export interface UnitCombatStats {
  hp: number;
  maxHp: number;
  str: number;
  mag: number;
  skill: number;
  spd: number;
  lck: number;
  def: number;
  res: number;
  bld?: number;
}

export interface CombatSideForecast {
  readonly unit: GridUnit;
  readonly stats: UnitCombatStats;
  readonly weapon?: ItemDefinition;
  readonly damage: number;
  readonly hitRate: number;
  readonly critRate: number;
  readonly attackSpeed: number;
  readonly attackCount: number;
  readonly canCounter: boolean;
}

export interface CombatForecast {
  readonly attacker: CombatSideForecast;
  readonly defender: CombatSideForecast;
  readonly distance: number;
}

export interface SingleAttackEvent {
  readonly attackerId: string;
  readonly defenderId: string;
  readonly isHit: boolean;
  readonly isCrit: boolean;
  readonly damageDealt: number;
  readonly defenderHpAfter: number;
}

export interface CombatResult {
  readonly forecast: CombatForecast;
  readonly events: readonly SingleAttackEvent[];
  readonly unitDefeatedId?: string;
}
