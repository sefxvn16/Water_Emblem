import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Position } from '../core/grid/types';
import { getTileRect, HUD_CLEAR_BOTTOM, type ScreenRect } from './tileAnchor';
import { HUD_EDGE } from './BattleSettingsMenu';

export type OverlayCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center';

export interface OverlayAnchorOptions {
  /** Tile the overlay describes; null renders at the default corner. */
  tile: Position | null;
  /** Extra tiles the overlay must not cover (e.g. the forecast's defender). */
  avoidTiles?: readonly Position[];
  /** Estimated box width in px until the rendered box is measured. */
  width: number;
  /** Corner to use when nothing overlaps. */
  prefer: OverlayCorner;
  /** Also avoid the bottom-right End Turn / gear cluster. */
  avoidHudCluster?: boolean;
  /** Also avoid the bottom-right Action Menu cluster (PLAN item 164). */
  avoidActionBar?: boolean;
}

const EDGE = 16;

function overlapArea(a: ScreenRect, b: ScreenRect): number {
  const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return w * h;
}

/**
 * Picks the best viewport corner for a fixed overlay box: the preferred corner
 * when it covers no avoided rect, otherwise the corner with the least overlap.
 * Pure (no DOM writes) so it can be unit-tested; callers pass measured rects.
 */
export function computeOverlayPosition(
  tileRect: ScreenRect | null,
  avoidRects: readonly ScreenRect[],
  boxWidth: number,
  boxHeight: number,
  vw: number,
  vh: number,
  prefer: OverlayCorner,
): { left: number; top: number } {
  const avoid = tileRect ? [tileRect, ...avoidRects] : [...avoidRects];

  // PLAN item 100: bottom-center first. If the box would cover an avoided
  // rect (the attacker/defender tiles), slide left just enough to clear
  // them; when there is not enough room on the left, slide right instead.
  if (prefer === 'bottom-center') {
    const top = Math.max(EDGE, vh - EDGE - boxHeight);
    const maxLeft = Math.max(EDGE, vw - EDGE - boxWidth);
    const centered = Math.max(EDGE, Math.min((vw - boxWidth) / 2, maxLeft));
    const boxAt = (left: number): ScreenRect => ({ left, right: left + boxWidth, top, bottom: top + boxHeight });
    const totalOverlap = (left: number): number => avoid.reduce((sum, rect) => sum + overlapArea(boxAt(left), rect), 0);
    if (totalOverlap(centered) === 0) return { left: centered, top };

    const overlapped = avoid.filter((rect) => overlapArea(boxAt(centered), rect) > 0);
    const leftTarget = Math.min(...overlapped.map((rect) => rect.left - boxWidth - EDGE));
    if (leftTarget >= EDGE) return { left: leftTarget, top };
    const rightTarget = Math.max(...overlapped.map((rect) => rect.right + EDGE));
    if (rightTarget <= maxLeft) return { left: rightTarget, top };

    // Neither side fully clears: take the clamped side with less overlap.
    const candidates = [centered, EDGE, maxLeft];
    let bestLeft = centered;
    let bestOverlap = Infinity;
    for (const left of candidates) {
      const overlap = totalOverlap(left);
      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestLeft = left;
      }
    }
    return { left: bestLeft, top };
  }

  const candidates: { left: number; top: number; corner: OverlayCorner }[] = [
    { left: EDGE, top: vh - EDGE - boxHeight, corner: 'bottom-left' },
    { left: vw - EDGE - boxWidth, top: vh - HUD_CLEAR_BOTTOM - boxHeight, corner: 'bottom-right' },
    { left: EDGE, top: EDGE, corner: 'top-left' },
    { left: vw - EDGE - boxWidth, top: EDGE, corner: 'top-right' },
  ];
  const first = candidates[0];
  if (!first) return { left: EDGE, top: EDGE };
  const preferRow = prefer.split('-')[0] ?? '';
  let best = first;
  let bestScore = Infinity;
  for (const cand of candidates) {
    const left = Math.max(EDGE, Math.min(cand.left, Math.max(EDGE, vw - EDGE - boxWidth)));
    const top = Math.max(EDGE, Math.min(cand.top, Math.max(EDGE, vh - EDGE - boxHeight)));
    const box: ScreenRect = { left, right: left + boxWidth, top, bottom: top + boxHeight };
    let score = 0;
    for (const rect of avoid) score += overlapArea(box, rect) * 100;
    if (cand.corner !== prefer) score += cand.corner.startsWith(preferRow) ? 500 : 1000;
    if (score < bestScore) {
      bestScore = score;
      best = { left, top, corner: cand.corner };
    }
  }
  return { left: best.left, top: best.top };
}

/**
 * Anchors a fixed overlay to a map tile: re-renders on map scroll and window
 * resize so the overlay follows the tile's new screen position, and re-picks
 * its corner so it never covers the tile (or the HUD cluster).
 * On the server (no document) it renders at the default corner.
 */
export function useAnchoredOverlay(options: OverlayAnchorOptions): {
  ref: RefObject<HTMLDivElement>;
  style: CSSProperties;
} {
  const [tick, setTick] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    document.addEventListener('scroll', bump, true);
    window.addEventListener('resize', bump);
    return () => {
      document.removeEventListener('scroll', bump, true);
      window.removeEventListener('resize', bump);
    };
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = { width: el.offsetWidth, height: el.offsetHeight };
    setSize((prev) => (prev && prev.width === next.width && prev.height === next.height ? prev : next));
  });

  const vw = typeof window === 'undefined' ? 1366 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 768 : window.innerHeight;
  const tileRect = getTileRect(options.tile);
  const avoidRects: ScreenRect[] = [];
  for (const tile of options.avoidTiles ?? []) {
    const rect = getTileRect(tile);
    if (rect) avoidRects.push(rect);
  }
  if (options.avoidHudCluster) {
    // PLAN item 99: the End Turn + Settings cluster sits top-right now.
    avoidRects.push({
      left: vw - HUD_EDGE - 220,
      right: vw - HUD_EDGE,
      top: HUD_EDGE,
      bottom: HUD_EDGE + 48,
    });
  }
  if (options.avoidActionBar) {
    // PLAN item 164: avoid the bottom-right action bar cluster so hover banners
    // never cover the action buttons.
    avoidRects.push({
      left: vw - 480,
      right: vw,
      top: vh - 220,
      bottom: vh,
    });
  }
  const position = computeOverlayPosition(
    tileRect,
    avoidRects,
    size?.width ?? options.width,
    size?.height ?? 200,
    vw,
    vh,
    options.prefer,
  );
  void tick;

  return {
    ref,
    style: { position: 'fixed', left: position.left, top: position.top },
  };
}
