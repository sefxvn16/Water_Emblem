import { describe, expect, it } from 'vitest';
import { hitProbability } from '../../src/core/combat/rng';

describe('hit probability used by AI', () => {
  it('matches the discrete one- and two-roll hit rules', () => {
    expect(hitProbability(0, '2RN')).toBe(0);
    expect(hitProbability(100, '2RN')).toBe(1);
    expect(hitProbability(50, '1RN')).toBe(0.5);
    expect(hitProbability(50, '2RN')).toBe(0.505);
    expect(hitProbability(80, '2RN')).toBeGreaterThan(0.8);
    expect(hitProbability(20, '2RN')).toBeLessThan(0.2);
  });
});
