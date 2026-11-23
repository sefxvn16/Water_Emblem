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
  /** Recover staff (PLAN item 209, FE11: "Restores all HP to an ally"). */
  readonly healFull?: boolean;
  /** Fortify staff (PLAN item 209, FE11: "Restores (Magic/2 + 8) HP to all allies", range 0 means map-wide). */
  readonly healAllAllies?: boolean;
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
  /** Characters allowed to use this item/staff (PLAN item 209: Hammerne, Aum). */
  readonly usableByCharacterIds?: readonly string[];
  /** Rescue staff (PLAN item 209, FE12): pulls an ally next to the caster. */
  readonly rescue?: boolean;
  /** Unlock staff (PLAN item 209, FE12): opens a door 1-2 tiles away. */
  readonly unlock?: boolean;
  /** Thief staff (PLAN item 209, FE12): opens any chest on the map. */
  readonly thief?: boolean;
  /** Hammerne staff (PLAN item 209, FE12): repairs an adjacent ally's weapon or staff to max uses. */
  readonly hammerne?: boolean;
  /** Aum staff (PLAN item 209, FE12): revives a fallen ally next to the caster. */
  readonly aum?: boolean;
  /** Barrier staff (PLAN item 209, FE12): raises an ally's Res by 7, decreasing each turn. */
  readonly barrier?: boolean;
  /** Silence staff (PLAN item 209, FE12): prevents an enemy from using tomes or staves for 1 turn. */
  readonly silence?: boolean;
  /** Again staff (PLAN item 209, FE12): lets an ally act again. */
  readonly again?: boolean;
}

export interface StatusEffect {
  readonly type: 'barrier' | 'silence';
  readonly value: number;
  readonly duration: number;
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
  /** Tactical avoid rate (PLAN item 75 / M2). */
  readonly avoid?: number;
  /** Sure Strike proc chance (PLAN item 152), rolled at execution. */
  readonly sureStrikeChance?: number;
  /** Pavise proc chance (PLAN item 152), rolled at execution. */
  readonly paviseChance?: number;
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
  /** Pavise proc (PLAN item 152): damage was halved. */
  readonly isPavise?: boolean;
}

export interface CombatResult {
  readonly forecast: CombatForecast;
  readonly events: readonly SingleAttackEvent[];
  readonly unitDefeatedId?: string;
}
