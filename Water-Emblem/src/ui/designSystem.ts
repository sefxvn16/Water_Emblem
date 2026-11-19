import type { CSSProperties } from 'react';

/**
 * Shared visual tokens for the four redesigned areas (PLAN item 76, DESIGN.md).
 * Values come from `Game_Design/art_ui.md` (navy `#0c1e5b` + gold `#eab308`) and from
 * the faction hues already in the code (`#3b82f6` ally, `#ef4444` enemy). Nothing
 * here invents a new palette. Areas outside the four keep their own styles.
 * Inspector faction tones (panel/box/tile/hairline/track per faction) live in
 * `src/core/grid/factionTones.ts` (owner-approved mockup J2 + treatment B,
 * PLAN item 79); only the shared frame/label tokens stay here.
 */
export const DS_COLORS = {
  navy: '#0c1e5b',
  navyDark: '#07123d',
  gold: '#eab308',
  goldText: '#fde047',
  text: '#ffffff',
  muted: '#cbd5e1',
  caption: '#94a3b8',
  ally: '#3b82f6',
  enemy: '#ef4444',
  hpRemaining: '#22c55e',
  hpRemainingText: '#4ade80',
  hpLoss: '#ef4444',
  secondaryBg: '#1e293b',
  secondaryBorder: '#475569',
  /** Inspector frame + titles (mockup J2, PLAN item 79): muted gold, shared by all faction tones. */
  inspectorFrame: '#c9a227',
  mutedGold: '#b49b5e',
  inspectorLabel: '#8fa3bf',
} as const;

/** Serif face for the inspector unit name (mockup J2, PLAN item 79). */
export const DS_FONTS = {
  serif: "Georgia, 'Times New Roman', serif",
} as const;

export const DS_SPACING = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 14,
  xxxl: 16,
} as const;

export const DS_RADII = {
  small: 4,
  medium: 6,
  panel: 8,
  large: 10,
  xlarge: 12,
} as const;

/** Z-order for the four areas; full table in DESIGN.md. */
export const DS_Z = {
  hover: 800,
  forecast: 900,
  inspector: 960,
  settings: 1000,
} as const;

/** The project's touch-target bar (PLAN item 74): every control is at least this tall/wide. */
export const DS_TOUCH_TARGET = 44;

/** Shared panel treatment (design-system R1): navy background, gold frame. */
export const sharedPanelStyle: CSSProperties = {
  backgroundColor: DS_COLORS.navy,
  border: `2px solid ${DS_COLORS.gold}`,
  borderRadius: DS_RADII.panel,
  boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
  color: DS_COLORS.text,
  boxSizing: 'border-box',
};

/** The single primary action at a decision point (design-system R3): gold, never danger red. */
export function primaryButtonStyle(): CSSProperties {
  return {
    backgroundColor: DS_COLORS.gold,
    border: `1px solid ${DS_COLORS.gold}`,
    borderRadius: DS_RADII.medium,
    color: DS_COLORS.navy,
    fontWeight: 'bold',
    cursor: 'pointer',
    minHeight: DS_TOUCH_TARGET,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };
}

/** Every non-primary action at a decision point shares this one treatment. */
export function secondaryButtonStyle(): CSSProperties {
  return {
    backgroundColor: DS_COLORS.secondaryBg,
    border: `1px solid ${DS_COLORS.secondaryBorder}`,
    borderRadius: DS_RADII.medium,
    color: DS_COLORS.muted,
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: DS_TOUCH_TARGET,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };
}

/** Visible heading for one group inside a panel (settings menu R4). */
export const sectionHeadingStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 'bold',
  color: DS_COLORS.goldText,
  margin: 0,
};

/** One label–value row: labels share a left edge, values share a right-aligned column. */
export const statRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: DS_SPACING.lg,
};

export const statValueStyle: CSSProperties = {
  textAlign: 'right',
  minWidth: 44,
  flexShrink: 0,
};
