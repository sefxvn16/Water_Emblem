import type { MoveType, Position } from '../core/grid/types';
import balanceConfig from '../../data/balance.json' with { type: 'json' };

export interface ActiveMovingUnit {
  readonly unitId: string;
  readonly pos: Position;
}

export interface SoundStepPlayer {
  playMoveStep: (moveType: MoveType) => void;
}

export interface MovementAnimationCleanup {
  (): void;
  cancel: () => void;
}

/**
 * Opt-in flag that turns fast playback off for one run (PLAN item 201).
 *
 * Playwright reports a headless user agent, so `isFastAnimation` returns true
 * for every browser test and the enemy phase collapses its waits and its
 * camera tracking out of the run — which left item 186's camera criterion
 * with no test that could observe it. Loading the page with
 * `?cameraTracking=1` plays the enemy phase at its real pace, so a test can
 * watch the map scroll from enemy to enemy exactly as a player sees it.
 * Nothing reads this flag except `isFastAnimation`, and no default changes.
 */
export function isCameraTrackingForced(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('cameraTracking') === '1';
  } catch {
    return false;
  }
}

export function isFastAnimation(): boolean {
  if (typeof window === 'undefined') return false;
  if (isCameraTrackingForced()) return false;
  const ua = window.navigator?.userAgent ?? '';
  return /HeadlessChrome|Playwright/i.test(ua);
}

/** Animation speed setting (PLAN item 117): normal 65ms/step, fast 25ms, off = instant. */
export type AnimationSpeed = 'normal' | 'fast' | 'off';

let animationSpeed: AnimationSpeed = (() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('water-emblem-animation-speed');
      if (saved === 'normal' || saved === 'fast' || saved === 'off') return saved;
    } catch { /* ignore */ }
  }
  return 'normal';
})();

export function setAnimationSpeed(speed: AnimationSpeed): void {
  animationSpeed = speed;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('water-emblem-animation-speed', speed);
    } catch { /* ignore */ }
  }
}

export function getAnimationSpeed(): AnimationSpeed {
  return animationSpeed;
}

/**
 * Runs a step-by-step movement animation along a path of waypoints.
 * Plays move step sound at each waypoint and returns a cleanup function to cancel early.
 */
export function runMovementAnimation(
  path: readonly Position[],
  moveType: MoveType,
  soundPlayer: SoundStepPlayer,
  onStep: (pos: Position, index: number) => void,
  onComplete: () => void,
  stepMs?: number,
): MovementAnimationCleanup {
  const normalMs = stepMs ?? balanceConfig.durations?.stepNormalMs ?? 65;
  const fastMs = balanceConfig.durations?.stepFastMs ?? 25;

  const noopCleanup = Object.assign(() => {}, { cancel: () => {} });

  if (path.length <= 1) {
    onComplete();
    return noopCleanup;
  }

  if (isFastAnimation() || animationSpeed === 'off') {
    const last = path[path.length - 1];
    if (last) onStep(last, path.length - 1);
    onComplete();
    return noopCleanup;
  }
  const effectiveStepMs = animationSpeed === 'fast' ? fastMs : normalMs;

  const p0 = path[0];
  if (p0) onStep(p0, 0);

  let index = 0;
  let finished = false;
  const timer = setInterval(() => {
    index += 1;
    if (index < path.length) {
      const p = path[index];
      if (p) {
        soundPlayer.playMoveStep(moveType);
        onStep(p, index);
      }
    } else {
      finished = true;
      clearInterval(timer);
      onComplete();
    }
  }, effectiveStepMs);

  const cleanup: MovementAnimationCleanup = Object.assign(
    () => {
      if (!finished) {
        finished = true;
        clearInterval(timer);
        const last = path[path.length - 1];
        if (last) onStep(last, path.length - 1);
        onComplete();
      }
    },
    {
      cancel: () => {
        if (!finished) {
          finished = true;
          clearInterval(timer);
        }
      },
    },
  );

  return cleanup;
}

