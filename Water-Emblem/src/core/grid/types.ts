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
  supportPoints?: Readonly<Record<string, number>>;
  isDead?: boolean;
  hasActed?: boolean;
}

export interface MoveTileResult {
  readonly position: Position;
  readonly costRemaining: number;
  readonly path: readonly Position[];
}
