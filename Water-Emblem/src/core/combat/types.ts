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
  /** Item role declared in data/items.json (PLAN item 134): healing consumable, door key, or the lord's chest key. */
  readonly itemRole?: 'healing' | 'masterKey' | 'lordChestKey';
  /** Shop price in gold (PLAN item 91; FE11 values in data/items.json). */
  readonly price?: number;
  /** False = never sold in shops (personal weapons, Master Seal, Warp, Devil Axe). */
  readonly buyable?: boolean;
  readonly effectiveAgainst: readonly MoveType[];
  readonly isMagic?: boolean;
  /** Devil-weapon backfire base (PLAN item 153, FE11): each strike has a
   * (backfireBase − Luck)% chance (minimum 1%) to hit the user instead. */
  readonly backfireBase?: number;
  /** Warp staff (PLAN item 156, FE11/FE12): sends an adjacent ally to any
   * traversable visible tile. */
  readonly warp?: boolean;
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
  /** Devil-weapon backfire (PLAN item 153): the strike hit its own user. */
  readonly isBackfire?: boolean;
}

export interface CombatResult {
  readonly forecast: CombatForecast;
  readonly events: readonly SingleAttackEvent[];
  readonly unitDefeatedId?: string;
}
