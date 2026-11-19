import { Position, GridUnit, MoveTileResult } from '../grid/types';

export type GamePhase = 'player_phase' | 'enemy_phase';

export interface TurnState {
  turnNumber: number;
  activePhase: GamePhase;
  selectedUnitId: string | null;
  reachableTiles: Map<string, MoveTileResult> | null;
  units: GridUnit[];
}

export type TurnEvent =
  | { type: 'SELECT_UNIT'; unitId: string; reachableTiles: Map<string, MoveTileResult> }
  | { type: 'CANCEL_SELECT' }
  | { type: 'MOVE_UNIT'; targetPos: Position }
  | { type: 'WAIT_UNIT' }
  | { type: 'END_PLAYER_PHASE' }
  | { type: 'END_ENEMY_PHASE' };

/**
 * Turn/phase state holder (PLAN item 133: pure core).
 *
 * No method writes into a unit object it was given. A change replaces the
 * affected unit with a new object inside a new units array and a new state
 * object; unchanged units are shared. Callers read the result via getState()
 * and adopt the new unit objects into their own state.
 */
export class TurnManager {
  private state: TurnState;

  constructor(initialUnits: GridUnit[]) {
    this.state = {
      turnNumber: 1,
      activePhase: 'player_phase',
      selectedUnitId: null,
      reachableTiles: null,
      units: initialUnits,
    };
  }

  getState(): Readonly<TurnState> {
    return this.state;
  }

  getSelectedUnit(): GridUnit | undefined {
    if (!this.state.selectedUnitId) return undefined;
    return this.state.units.find((u) => u.id === this.state.selectedUnitId);
  }

  replaceUnits(units: GridUnit[]): void {
    this.state = { ...this.state, units };
  }

  restoreState(snapshot: Pick<TurnState, 'turnNumber' | 'activePhase'>, units: GridUnit[]): void {
    this.state = {
      turnNumber: snapshot.turnNumber,
      activePhase: snapshot.activePhase,
      selectedUnitId: null,
      reachableTiles: null,
      // Restored units are new objects, never the caller's references.
      units: units.map((u) => ({ ...u, position: { ...u.position } })),
    };
  }

  selectUnit(unitId: string, reachableTiles: Map<string, MoveTileResult>): boolean {
    if (this.state.activePhase !== 'player_phase') {
      return false;
    }

    const unit = this.state.units.find((u) => u.id === unitId);
    if (!unit || unit.faction !== 'player' || unit.isDead || unit.hasActed) {
      return false;
    }

    this.state = { ...this.state, selectedUnitId: unitId, reachableTiles };
    return true;
  }

  cancelSelect(): void {
    this.state = { ...this.state, selectedUnitId: null, reachableTiles: null };
  }

  moveSelectedUnit(targetPos: Position): boolean {
    if (!this.state.selectedUnitId || !this.state.reachableTiles) {
      return false;
    }

    const key = `${targetPos.x},${targetPos.y}`;
    const moveData = this.state.reachableTiles.get(key);
    if (!moveData) {
      return false;
    }

    const unit = this.getSelectedUnit();
    if (!unit) {
      return false;
    }

    // Di chuyển đơn vị đến ô mới (object mới, không sửa object cũ)
    this.state = {
      ...this.state,
      units: this.state.units.map((u) => (u.id === unit.id ? { ...u, position: { ...targetPos } } : u)),
    };
    return true;
  }

  waitSelectedUnit(): boolean {
    const unit = this.getSelectedUnit();
    if (!unit) {
      return false;
    }

    this.state = {
      ...this.state,
      units: this.state.units.map((u) => (u.id === unit.id ? { ...u, hasActed: true } : u)),
      selectedUnitId: null,
      reachableTiles: null,
    };

    // Tự động kiểm tra nếu tất cả player units đã hành động -> chuyển phase
    this.checkAutoPhaseEnd();
    return true;
  }

  checkAutoPhaseEnd(): void {
    if (this.state.activePhase === 'player_phase') {
      const activePlayerUnits = this.state.units.filter(
        (u) => u.faction === 'player' && !u.isDead && !u.hasActed
      );
      if (activePlayerUnits.length === 0) {
        this.switchPhase('enemy_phase');
      }
    }
  }

  switchPhase(newPhase: GamePhase): void {
    const units = this.state.units.map((u) => {
      if (newPhase === 'player_phase' && u.faction === 'player' && !u.isDead) {
        // Reset trạng thái hành động của phe người chơi
        return { ...u, hasActed: false, hasTraded: false, hasStored: false };
      }
      if (newPhase === 'enemy_phase' && u.faction === 'enemy' && !u.isDead) {
        // Reset trạng thái hành động của phe địch
        return { ...u, hasActed: false };
      }
      return u;
    });

    this.state = {
      ...this.state,
      activePhase: newPhase,
      selectedUnitId: null,
      reachableTiles: null,
      turnNumber: newPhase === 'player_phase' ? this.state.turnNumber + 1 : this.state.turnNumber,
      units,
    };
  }
}
