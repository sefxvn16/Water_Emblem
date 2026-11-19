import { describe, expect, it } from 'vitest';
import {
  getAnimationSpeed,
  runMovementAnimation,
  setAnimationSpeed,
} from '../../src/renderer/movementAnimation';

// The enemy intent preview tests (PLAN items 106/107) were removed with the
// mechanic by owner order 2026-11-19 23:16 (see PLAN item 145).

describe('animation speed (PLAN item 117, Q07)', () => {
  it('off completes instantly, normal is the default', () => {
    expect(getAnimationSpeed()).toBe('normal');
    setAnimationSpeed('off');
    let steps = 0;
    let completed = false;
    runMovementAnimation(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      'foot',
      { playMoveStep: () => {} },
      () => { steps += 1; },
      () => { completed = true; },
    );
    expect(completed).toBe(true);
    expect(steps).toBe(1); // only the final position is reported
    setAnimationSpeed('normal');
    expect(getAnimationSpeed()).toBe('normal');
  });
});
