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
export const HUD_CLUSTER_WIDTH = 200;
export const ACTION_MENU_WIDTH = 190;
export const ACTION_MENU_GAP = 8;

/** On-screen rectangle of a 2D grid tile, or null when it is not rendered (3D view, hidden). */
export function getTileRect(tile: Position | null): ScreenRect | null {
  if (!tile || typeof document === 'undefined') return null;
  const element = document.querySelector(`[data-testid="tile-${tile.x}-${tile.y}"]`);
  if (!element) return null;
  const { left, right, top, bottom } = element.getBoundingClientRect();
  return { left, right, top, bottom };
}

/**
 * Calculates the optimal position for the unit Action Menu so it stays within viewport
 * and dynamically dodges all attack/interactable target tiles (to never cover an enemy).
 */
export function computeActionMenuPosition(
  anchor: ScreenRect | null,
  avoidRects: readonly ScreenRect[],
  boxWidth: number,
  boxHeight: number,
  vw: number,
  vh: number,
): { left: number; top: number } | null {
  if (!anchor) return null;

  const bottomLimit = (left: number) =>
    left + boxWidth > vw - HUD_CLUSTER_WIDTH ? vh - HUD_CLEAR_BOTTOM : vh - ACTION_MENU_GAP;

  const anchorWidth = anchor.right - anchor.left;
  const anchorCenterX = (anchor.left + anchor.right) / 2;
  const anchorCenterY = (anchor.top + anchor.bottom) / 2;

  const rawCandidates: { left: number; top: number; desc: string }[] = [
    { left: anchor.right + ACTION_MENU_GAP, top: anchor.top, desc: 'right-top' },
    { left: anchor.left - ACTION_MENU_GAP - boxWidth, top: anchor.top, desc: 'left-top' },
    { left: anchor.right + ACTION_MENU_GAP, top: anchor.bottom + ACTION_MENU_GAP, desc: 'right-below' },
    { left: anchor.left - ACTION_MENU_GAP - boxWidth, top: anchor.bottom + ACTION_MENU_GAP, desc: 'left-below' },
    { left: anchor.right + ACTION_MENU_GAP, top: anchor.top - ACTION_MENU_GAP - boxHeight, desc: 'right-above' },
    { left: anchor.left - ACTION_MENU_GAP - boxWidth, top: anchor.top - ACTION_MENU_GAP - boxHeight, desc: 'left-above' },
    { left: Math.round(anchor.left + (anchorWidth - boxWidth) / 2), top: anchor.top - ACTION_MENU_GAP - boxHeight, desc: 'above' },
    { left: Math.round(anchor.left + (anchorWidth - boxWidth) / 2), top: anchor.bottom + ACTION_MENU_GAP, desc: 'below' },
    { left: ACTION_MENU_GAP, top: Math.max(ACTION_MENU_GAP, Math.min(anchor.top, vh - HUD_CLEAR_BOTTOM - boxHeight)), desc: 'dock-left' },
    { left: vw - ACTION_MENU_GAP - boxWidth, top: Math.max(ACTION_MENU_GAP, Math.min(anchor.top, vh - HUD_CLEAR_BOTTOM - boxHeight)), desc: 'dock-right' },
  ];

  const overlapsRect = (cand: ScreenRect, r: ScreenRect, margin = 4) => !(
    cand.right <= r.left - margin ||
    cand.left >= r.right + margin ||
    cand.bottom <= r.top - margin ||
    cand.top >= r.bottom + margin
  );

  const getOverlapArea = (cand: ScreenRect, r: ScreenRect) => {
    const w = Math.max(0, Math.min(cand.right, r.right) - Math.max(cand.left, r.left));
    const h = Math.max(0, Math.min(cand.bottom, r.bottom) - Math.max(cand.top, r.top));
    return w * h;
  };

  let targetsOnRight = 0;
  let targetsOnLeft = 0;
  for (const t of avoidRects) {
    const tCenterX = (t.left + t.right) / 2;
    if (tCenterX > anchorCenterX) targetsOnRight++;
    else if (tCenterX < anchorCenterX) targetsOnLeft++;
  }

  let bestCandidate: { left: number; top: number } = {
    left: Math.max(ACTION_MENU_GAP, Math.min(anchor.right + ACTION_MENU_GAP, vw - ACTION_MENU_GAP - boxWidth)),
    top: Math.max(ACTION_MENU_GAP, Math.min(anchor.top, bottomLimit(anchor.right + ACTION_MENU_GAP) - boxHeight)),
  };
  let bestScore = Infinity;

  for (const cand of rawCandidates) {
    const bLimit = bottomLimit(cand.left);
    const clampedLeft = Math.max(ACTION_MENU_GAP, Math.min(cand.left, vw - ACTION_MENU_GAP - boxWidth));
    const clampedTop = Math.max(ACTION_MENU_GAP, Math.min(cand.top, bLimit - boxHeight));
    const candRect: ScreenRect = {
      left: clampedLeft,
      right: clampedLeft + boxWidth,
      top: clampedTop,
      bottom: clampedTop + boxHeight,
    };

    let score = 0;
    const clampShift = Math.abs(clampedLeft - cand.left) + Math.abs(clampedTop - cand.top);
    score += clampShift * 10;

    for (const target of avoidRects) {
      if (overlapsRect(candRect, target, 4)) {
        score += 500_000 + getOverlapArea(candRect, target);
      }
    }

    if (overlapsRect(candRect, anchor, 2)) {
      score += 200_000 + getOverlapArea(candRect, anchor);
    }

    const candCenterX = clampedLeft + boxWidth / 2;
    const candCenterY = clampedTop + boxHeight / 2;
    score += Math.hypot(candCenterX - anchorCenterX, candCenterY - anchorCenterY);

    if (targetsOnRight > targetsOnLeft && cand.desc.startsWith('left')) score -= 50;
    else if (targetsOnLeft > targetsOnRight && cand.desc.startsWith('right')) score -= 50;
    else if (avoidRects.length === 0) {
      if (anchorCenterX < vw / 2 && cand.desc === 'right-top') score -= 30;
      else if (anchorCenterX >= vw / 2 && cand.desc === 'left-top') score -= 30;
    }

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = { left: clampedLeft, top: clampedTop };
    }
  }

  return bestCandidate;
}
