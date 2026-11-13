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

  selectUnit(unitId: string, reachableTiles: Map<string, MoveTileResult>): boolean {
    if (this.state.activePhase !== 'player_phase') {
      return false;
    }

    const unit = this.state.units.find((u) => u.id === unitId);
    if (!unit || unit.faction !== 'player' || unit.isDead || unit.hasActed) {
      return false;
    }

    this.state.selectedUnitId = unitId;
    this.state.reachableTiles = reachableTiles;
    return true;
  }

  cancelSelect(): void {
    this.state.selectedUnitId = null;
    this.state.reachableTiles = null;
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

    // Di chuyển đơn vị đến ô mới
    unit.position = { ...targetPos };
    return true;
  }

  waitSelectedUnit(): boolean {
    const unit = this.getSelectedUnit();
    if (!unit) {
      return false;
    }

    unit.hasActed = true;
    this.state.selectedUnitId = null;
    this.state.reachableTiles = null;

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
    this.state.activePhase = newPhase;
    this.state.selectedUnitId = null;
    this.state.reachableTiles = null;

    if (newPhase === 'player_phase') {
      this.state.turnNumber += 1;
      // Reset trạng thái hành động của phe người chơi
      for (const u of this.state.units) {
        if (u.faction === 'player' && !u.isDead) {
          u.hasActed = false;
        }
      }
    } else if (newPhase === 'enemy_phase') {
      // Reset trạng thái hành động của phe địch
      for (const u of this.state.units) {
        if (u.faction === 'enemy' && !u.isDead) {
          u.hasActed = false;
        }
      }
    }
  }
}
