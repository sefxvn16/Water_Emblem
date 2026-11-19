export interface Position {
  readonly x: number;
  readonly y: number;
}

export type MoveType = 'foot' | 'armor' | 'cavalry' | 'flier' | 'mage' | 'bandit';

export type ObstacleType = 'none' | 'difficult' | 'water' | 'fly_only' | 'impassable' | 'structure';

export type UnitFaction = 'player' | 'enemy' | 'ally';
export type WeaponRank = 'E' | 'D' | 'C' | 'B' | 'A';

export interface TerrainDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameVi?: string;
  readonly obstacleType?: ObstacleType;
  readonly avoidBonus: number;
  readonly defenseBonus: number;
  readonly healPercent: number;
  readonly destructible?: boolean;
  readonly maxHp?: number;
  readonly movementCosts: Record<MoveType, number | null>;
  readonly sourceClassCosts?: Readonly<Record<string, number | null>>;
}

export interface MapData {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly grid: readonly (readonly string[])[];
  readonly elevations?: readonly (readonly number[])[];
}

export interface GridUnit {
  readonly id: string;
  readonly name: string;
  readonly faction: UnitFaction;
  position: Position;
  classId?: string;
  mountedClassId?: string;
  mov: number;
  moveType: MoveType;
  readonly weaponRanks?: Readonly<Record<string, WeaponRank>>;
  /** WEx progress toward the next rank per weapon type (PLAN item 90). */
  readonly weaponExp?: Readonly<Record<string, number>>;
  supportPoints?: Readonly<Record<string, number>>;
  isDead?: boolean;
  hasActed?: boolean;
  /** Initiated a trade this turn (PLAN item 87): one initiation per turn. */
  hasTraded?: boolean;
  /** Used Storage this turn (PLAN item 88): movement ends on exit, like trade. */
  hasStored?: boolean;
  /**
   * Display-only origin marker (PLAN item 79): true when the unit arrived as
   * a reinforcement, so the inspector and map tokens render it in the
   * reinforcement tone. The faction still governs behaviour; this flag
   * changes no rule.
   */
  isReinforcement?: boolean;
  /** Escaped the map (PLAN item 109); no longer on the battlefield. */
  hasEscaped?: boolean;
  /** Manakete transformation turns left (PLAN item 121); absent/0 = human form. */
  transformTurns?: number;
  /** Turns until a manakete may transform again (PLAN item 121). */
  transformCooldown?: number;
  /** Xane imitation turns left (PLAN item 124); absent/0 = own form. */
  imitateTurns?: number;
}

export interface MoveTileResult {
  readonly position: Position;
  readonly costRemaining: number;
  readonly path: readonly Position[];
}
