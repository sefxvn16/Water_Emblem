import type { UnitFaction } from './types';

/**
 * Faction display tones (PLAN item 79, treatment B — owner decisions
 * 2026-11-19: hues confirmed 14:34, muted faction-tinted panels 16:07).
 *
 * Pure display data shared by the unit inspector (ui) and the 2D map tokens
 * (renderer). It lives in core so both modules can import it without
 * crossing module boundaries (renderer imports core only). It carries no
 * game rule: a unit's `faction` still governs behaviour (turn order, AI,
 * targeting); the tone only decides how the unit is drawn. An `ally` unit
 * marked `GridUnit.isReinforcement` renders in the reinforcement tone; any
 * other `ally` unit in the intermediary tone. No reinforcement system exists
 * yet and no chapter fields an `ally` unit, so the reinforcement tone is
 * code-complete but dormant until chapter data marks a reinforcement unit.
 *
 * Reinforcement panel/box/tile/hairline/track and the intermediary and
 * reinforcement map-token backgrounds are [Giả định] (derived to match the
 * approved muted tints; the owner confirms from screenshots).
 */
export type FactionToneKey = 'player' | 'enemy' | 'ally' | 'reinforcement';

export interface FactionTone {
  readonly key: FactionToneKey;
  /** Chip label shown in the inspector header. */
  readonly label: string;
  /** Inspector panel background (muted faction tint). */
  readonly panel: string;
  /** Inspector inner box (Weapons / Items / Vitals) background. */
  readonly box: string;
  /** Inspector icon-tile background. */
  readonly tile: string;
  /** Hairline dividers inside the inspector. */
  readonly hairline: string;
  /** HP-bar track (and portrait well) background. */
  readonly track: string;
  /** Accent bar hue. */
  readonly accent: string;
  readonly chipBg: string;
  readonly chipText: string;
  readonly chipBorder: string;
  /** 2D map token background. */
  readonly tokenBg: string;
  /** 2D map token border. */
  readonly tokenBorder: string;
}

export const FACTION_TONES: Readonly<Record<FactionToneKey, FactionTone>> = {
  player: {
    key: 'player',
    label: 'Player',
    panel: '#101a2e',
    box: '#131f36',
    tile: '#16233f',
    hairline: '#22304d',
    track: '#0b1220',
    accent: '#3b82f6',
    chipBg: 'rgba(59, 130, 246, 0.16)',
    chipText: '#93c5fd',
    chipBorder: 'rgba(59, 130, 246, 0.4)',
    tokenBg: '#1e3a8a',
    tokenBorder: '#3b82f6',
  },
  enemy: {
    key: 'enemy',
    label: 'Enemy',
    panel: '#2b1719',
    box: '#381d20',
    tile: '#3d2125',
    hairline: '#4a2b30',
    track: '#1f1013',
    accent: '#ef4444',
    chipBg: 'rgba(239, 68, 68, 0.16)',
    chipText: '#fca5a5',
    chipBorder: 'rgba(239, 68, 68, 0.4)',
    tokenBg: '#7f1d1d',
    tokenBorder: '#ef4444',
  },
  ally: {
    key: 'ally',
    label: 'Ally',
    panel: '#12241a',
    box: '#162e21',
    tile: '#1a3527',
    hairline: '#26452f',
    track: '#0e1f15',
    accent: '#22c55e',
    chipBg: 'rgba(34, 197, 94, 0.16)',
    chipText: '#86efac',
    chipBorder: 'rgba(34, 197, 94, 0.4)',
    tokenBg: '#14532d',
    tokenBorder: '#22c55e',
  },
  reinforcement: {
    key: 'reinforcement',
    label: 'Reinforcement',
    panel: '#1e1428',
    box: '#241a33',
    tile: '#2a1f3d',
    hairline: '#3a2d4d',
    track: '#171022',
    accent: '#a855f7',
    chipBg: 'rgba(168, 85, 247, 0.16)',
    chipText: '#d8b4fe',
    chipBorder: 'rgba(168, 85, 247, 0.4)',
    tokenBg: '#581c87',
    tokenBorder: '#a855f7',
  },
};

/**
 * The display tone for a unit. `isReinforcement` only matters for the `ally`
 * faction (intermediary troops vs reinforcements); player and enemy units
 * always render in their own tone.
 */
export function getFactionTone(faction: UnitFaction, isReinforcement?: boolean): FactionTone {
  if (faction === 'player') return FACTION_TONES.player;
  if (faction === 'enemy') return FACTION_TONES.enemy;
  return isReinforcement ? FACTION_TONES.reinforcement : FACTION_TONES.ally;
}
