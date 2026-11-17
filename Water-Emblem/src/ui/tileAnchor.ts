import type { Position } from '../core/grid/types';
import { HUD_EDGE, HUD_SIZE } from './BattleSettingsMenu';

export interface ScreenRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Distance from the viewport bottom that floating windows keep clear above the End Turn / gear cluster. */
export const HUD_CLEAR_BOTTOM = HUD_EDGE + HUD_SIZE + 8;

/** On-screen rectangle of a 2D grid tile, or null when it is not rendered (3D view, hidden). */
export function getTileRect(tile: Position | null): ScreenRect | null {
  if (!tile) return null;
  const element = document.querySelector(`[data-testid="tile-${tile.x}-${tile.y}"]`);
  if (!element) return null;
  const { left, right, top, bottom } = element.getBoundingClientRect();
  return { left, right, top, bottom };
}
