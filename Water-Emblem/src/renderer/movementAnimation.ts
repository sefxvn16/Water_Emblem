import type { MoveType, Position } from '../core/grid/types';

export interface ActiveMovingUnit {
  readonly unitId: string;
  readonly pos: Position;
}

export interface SoundStepPlayer {
  playMoveStep: (moveType: MoveType) => void;
}

export function isFastAnimation(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator?.userAgent ?? '';
  return /HeadlessChrome|Playwright/i.test(ua);
}

/** Animation speed setting (PLAN item 117): normal 65ms/step, fast 25ms, off = instant. */
export type AnimationSpeed = 'normal' | 'fast' | 'off';

let animationSpeed: AnimationSpeed = 'normal';

export function setAnimationSpeed(speed: AnimationSpeed): void {
  animationSpeed = speed;
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
  stepMs = 65,
): () => void {
  if (path.length <= 1) {
    onComplete();
    return () => {};
  }

  if (isFastAnimation() || animationSpeed === 'off') {
    const last = path[path.length - 1];
    if (last) onStep(last, path.length - 1);
    onComplete();
    return () => {};
  }
  const effectiveStepMs = animationSpeed === 'fast' ? 25 : stepMs;

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

  return () => {
    if (!finished) {
      finished = true;
      clearInterval(timer);
      const last = path[path.length - 1];
      if (last) onStep(last, path.length - 1);
      onComplete();
    }
  };
}

