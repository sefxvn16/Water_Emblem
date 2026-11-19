// Faction display tones (PLAN item 79, treatment B — owner decisions
// 2026-11-19: hues 14:34, muted faction-tinted panels 16:07).
// Spec: specs/unit-inspector.md R2/R9, specs/design-system.md R10.
import { describe, expect, it } from 'vitest';
import { FACTION_TONES, getFactionTone } from '../../src/core/grid/factionTones';

describe('getFactionTone', () => {
  it('maps each faction to its tone', () => {
    expect(getFactionTone('player')).toBe(FACTION_TONES.player);
    expect(getFactionTone('enemy')).toBe(FACTION_TONES.enemy);
    expect(getFactionTone('ally')).toBe(FACTION_TONES.ally);
  });

  it('marks ally reinforcements with the reinforcement tone', () => {
    expect(getFactionTone('ally', true)).toBe(FACTION_TONES.reinforcement);
    expect(getFactionTone('ally', false)).toBe(FACTION_TONES.ally);
    expect(getFactionTone('ally', undefined)).toBe(FACTION_TONES.ally);
  });

  it('ignores the reinforcement flag for player and enemy units', () => {
    expect(getFactionTone('player', true)).toBe(FACTION_TONES.player);
    expect(getFactionTone('enemy', true)).toBe(FACTION_TONES.enemy);
  });

  it('carries the owner-confirmed hues and chip labels', () => {
    expect(FACTION_TONES.player.accent).toBe('#3b82f6');
    expect(FACTION_TONES.enemy.accent).toBe('#ef4444');
    expect(FACTION_TONES.ally.accent).toBe('#22c55e');
    expect(FACTION_TONES.reinforcement.accent).toBe('#a855f7');
    expect(FACTION_TONES.player.label).toBe('Player');
    expect(FACTION_TONES.enemy.label).toBe('Enemy');
    expect(FACTION_TONES.ally.label).toBe('Ally');
    expect(FACTION_TONES.reinforcement.label).toBe('Reinforcement');
  });

  it('tints each inspector panel in the faction colour (treatment B)', () => {
    expect(FACTION_TONES.player.panel).toBe('#101a2e');
    expect(FACTION_TONES.enemy.panel).toBe('#2b1719');
    expect(FACTION_TONES.ally.panel).toBe('#12241a');
    expect(FACTION_TONES.reinforcement.panel).toBe('#1e1428');
    // All four panels differ, so the sides are told apart by colour alone.
    const panels = Object.values(FACTION_TONES).map((tone) => tone.panel);
    expect(new Set(panels).size).toBe(4);
  });
});
