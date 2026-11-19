import type { GridUnit } from '../grid/types';

/**
 * Canto (PLAN item 102, V04): mounted and flying units may move their
 * remaining movement after performing an action. The remaining movement
 * is whatever was left of MOV when the unit arrived at its action tile;
 * the total distance moved in the turn never exceeds MOV.
 * Player units only for now [Giả định]; enemy AI does not use Canto.
 */

export function canCanto(unit: GridUnit): boolean {
  return unit.moveType === 'cavalry' || unit.moveType === 'flier';
}
