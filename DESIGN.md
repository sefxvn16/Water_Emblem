# DESIGN.md — Water Emblem UI design language

Source of truth for the visual language of the four redesigned areas (PLAN item 76):
basic info (hover banner, terrain window, HUD cluster), character detail (inspector),
combat forecast, and the settings menu. The contract comes from `Game_Design/art_ui.md`
(minimalist/Nordic, navy `#0c1e5b` + gold `#eab308`, full-frame scrolling map,
overlay-only popups, English-only UI). This file records the confirmed rules and
separates them from unconfirmed current state. No value here is invented without a
source; values taken from existing code cite the file.

Specs: `specs/design-system.md`, `specs/hud-basic-info.md`, `specs/unit-inspector.md`,
`specs/combat-forecast-ui.md`, `specs/settings-menu.md`.

## Confirmed rules

### Screen type and zones
- All four areas are screen type **Chơi** (gameplay/HUD/menu game): the map keeps
  priority of position, size, and visibility; HUD and overlays stay minimal, at the
  edges, and never cover the tile or control the player is acting on.
- The map is the only scroll container (`position: fixed, inset: 0, overflow: auto`,
  `src/App.tsx`). All four areas are `position: fixed` siblings over it.
- Overlay windows re-anchor to their tile on map scroll and window resize
  (scroll/resize listeners in `src/ui/overlayAnchor.ts`); they never stay frozen
  while the tile moves underneath.
- Verified viewport: **1366x768** (PLAN items 71/73).

### Palette
| Token | Value | Source |
|---|---|---|
| Panel navy | `#0c1e5b` | `art_ui.md` (FE3 navy/gold contract) |
| Panel navy dark (avatar wells, secondary) | `#07123d` / `#1e293b` | existing code (`UnitHoverWindow`, `CombatForecastWindow`) |
| Gold frame | `#eab308` | `art_ui.md` |
| Gold text / accents | `#fde047` | existing code (forecast title, HP values) |
| Primary text | `#ffffff` | existing code |
| Muted text | `#cbd5e1` | existing code |
| Caption text | `#94a3b8` | existing code |
| Ally faction hue | `#3b82f6` | existing code (`UnitInspectorWindow.tsx:126`, `Grid2D.tsx:190-191`) |
| Enemy faction hue | `#ef4444` | existing code (same) |
| HP remaining | `#22c55e` (bar) / `#4ade80` (text) | existing code |
| HP loss | `#ef4444` | existing code |
| Inspector ally background | `#1d4ed8` | [Giả định] — darkened ally hue; see "Unconfirmed" below |
| Inspector enemy background | `#7f1d1d` | [Giả định] — darkened enemy hue ("đỏ đậm"); see "Unconfirmed" below |

- Every panel in the four areas uses the navy background with a gold frame, except the
  inspector, which keeps the gold frame but uses a faction background (ally blue,
  enemy dark red) per owner decision 2026-11-19. This supersedes `art_ui.md:43`'s navy
  background for the inspector only; the dark `#1b1b22` inspector background is gone.
- The settings panel never uses `#262626`/`#444` (removed by this task).
- Danger treatment (red) is reserved for destructive actions. Attack is the single
  primary action of the forecast and never uses danger treatment.

### Buttons and actions
- One primary action per decision point; all other actions at that point share one
  secondary treatment. Primary: gold `#eab308` background, navy `#0c1e5b` text.
  Secondary: `#1e293b` background, `#475569` border, `#cbd5e1` text.
- The primary action in the settings menu is **Save Game** [Giả định — most frequent,
  non-destructive action in the menu]. All five navigation actions (Title, World Map,
  Save Files, Save Game, Load Game) sit in one group under one heading; Save Game
  carries the primary treatment, the other four share the secondary treatment.
- The primary action in the forecast is **Attack**; Cancel is secondary.
- The primary action in the inspector is **Close** (the only action there).
- Every interactive control in the four areas has a target of at least **44px** in
  both dimensions (the project's own bar; WCAG minimum is 24px).

### Type scale
| Level | Size / weight | Use |
|---|---|---|
| Title | 15px / bold | Panel titles ("COMBAT FORECAST", "Unit Details", group headings 14px/bold) |
| Name | 15px / bold | Unit names |
| Body | 13px | Main text, buttons (13–14px) |
| Label | 12px | Class, LV/EX, stat labels |
| Caption | 10–11px | Hints ("Tap for full stats"), small values |

### Spacing, radii
- Spacing scale (px): 2, 4, 6, 8, 10, 12, 14, 16. Panel padding 12–14px; gaps
  between sections 8–12px; gaps inside rows 4–8px.
- Radii: 4px (small wells, chips), 6px (cards, buttons), 8px (panels),
  10px (inspector panel).
- Stat rows: labels share one left edge, values share one right-aligned column
  across all panels of a window.

### Z-order (low to high)
| z-index | What |
|---|---|
| 0 | Map |
| 800 | Hover banner, terrain window |
| 900 | Combat forecast, action menu |
| 950 | Combat result popup |
| 960 | Unit inspector |
| 1000 | Settings gear + menu |
| 1200 | Dialogue box (pre-existing; above settings) |
| 9999 | Status notification toast |

### Settings menu groups (top to bottom)
1. Chapter — chapter `<select>` + chapter name/objective line. (Which chapters the
   control lists is owned by the M9 fix in PLAN item 75; this task changes only its
   grouping and presentation.)
2. Status — gold, Turn, phase in one group.
3. Navigation — Title, World Map, Save Files, Save Game, Load Game under one
   heading, one shared secondary treatment except Save Game (primary).
4. View & Sound — 3D/2D toggle + mute.
5. Combat Log — "No battle engagements yet." when empty.
- The menu opens upward from the gear (bottom-right, next to End Turn, gear on the
  right — owner decision 2026-11-19). It auto-closes on chapter change and when
  another screen opens, and every navigation action closes it, including Save Game
  and Load Game. If the menu is taller than the viewport it scrolls internally and
  is never cut off at the screen edge.

### Language
- The whole game UI is English; the document declares `<html lang="en">`
  (owner decision 2026-11-19; fixed in this task).

### Placement rules
- Hover banner / terrain window: bottom edge by default, on the side opposite the
  tile's horizontal half; they flip to the other side (and to the top edge if needed)
  so they never cover the tile they describe or the settings/End Turn cluster.
- Forecast: top-left by default (FE3: forecast overlays the left edge); it flips to
  another corner when it would cover the attacker or defender tile.
- The hover banner is not itself a button. Its Details affordance is the only click
  target inside it; interactive elements are never nested inside another interactive
  element.
- Display precedence: pinned unit, then hovered unit, then selected unit.

## Unconfirmed current state
- **Inspector background shades.** The FE3 original reference (screenshots in
  `Original/04_Battle_Backgrounds/`, on the owner's OneDrive) is not reachable from
  this machine, so the exact FE3 status-window shades could not be sampled. The
  shades used (`#1d4ed8` ally, `#7f1d1d` enemy) are the established in-code faction
  hues (`#3b82f6` / `#ef4444`) darkened to panel backgrounds that keep white body
  text at ≥4.5:1 contrast. The owner should confirm them from the after screenshots
  (`work/water-ui-redesign/after/03-inspector-ally.png`,
  `04-inspector-enemy.png`); if the original shades differ, they replace these two
  values only.
- **Settings-menu primary action.** The spec requires exactly one primary action in
  the menu but does not name it; Save Game was chosen as [Giả định]. The owner may
  pick a different one (e.g. none, or Title) without changing anything else.
- **Below ~950px.** The HUD overlap at narrow widths stays the recorded LOW in PLAN
  item 73; this file sets no rule for it.
- **Forecast Avo display.** The forecast window still shows the UI-computed Avo
  (`attackSpeed + floor(lck/2)`); whether that number is correct is the M1/M2 fix
  in Batch 2 (PLAN item 75), not this task. The Vitest render test checks the
  displayed numbers against the fixed forecast object for Dmg/Hit/Crit/AS/HP-after
  and against the fixture's own inputs for Avo.
- **A4 precedence, third leg.** The "moving the cursor away shows the selected unit"
  leg is not reachable through the UI: `src/App.tsx` `handleTileClick` sets and
  clears pin and selection together, so no state exists with a selected unit but no
  pinned/hovered unit. The Playwright test verifies the reachable legs (pinned beats
  hovered; unpin + hover shows the hovered unit) and that no stale unit shows after
  the cursor moves away. If the owner wants the selected-unit fallback reachable,
  that is a behaviour change for a later item.
- `Game_Design/decisions.md` (layout section, 2026-11-17) still says the Settings
  button is at the top-right; `art_ui.md:38-39`, PLAN item 71, the code, and the
  owner decision 2026-11-19 all say bottom-right. Bottom-right wins; `decisions.md`
  is stale on this point (not this task's scope to rewrite).
