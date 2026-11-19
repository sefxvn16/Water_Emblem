# Spec: design system
Feature id: none

## What and why
One shared visual language for the four redesigned areas, so a player recognises the same panel, the same button hierarchy, and the same spacing wherever they look, and so later screens can reuse the same primitives instead of inventing their own. The language is the one already fixed in `Game_Design/art_ui.md` (minimalist/Nordic, navy + gold); this spec turns it into checkable rules and records them in `DESIGN.md`. It states what the interface must look and behave like; it does not state how it is built.

## Users
Players of the 2D battle map (mouse, trackpad, keyboard, touch) and maintainers adding or changing UI in the four areas.

## Rules
- R1: Every panel in the four areas uses the shared treatment: navy `#0c1e5b` background with a gold `#eab308` frame. No area invents its own panel colour. (Current violation: the settings panel uses `#262626` with a `#444` border.) Exception: the inspector uses a muted-gold `#c9a227` frame and a panel background tinted by faction — player navy `#101a2e`, enemy dark red `#2b1719`, intermediary dark green `#12241a`, reinforcement dark purple `#1e1428` [Giả định] — with a 3px faction accent bar + chip, per owner decisions 2026-11-19 (mockup J2 picked, then treatment B picked; see R10).
- R2: Spacing, type, radii, and z-order follow one scale recorded in `DESIGN.md`. Text uses 3–4 levels (title; name or heading; label; caption), distinguished by size, weight, and position, not by adding colours only to create hierarchy.
- R3: Each decision point (one form, dialogue, card, or toolbar row) has at most one primary action; all other actions at that point share one secondary treatment. Danger treatment is reserved for destructive actions.
- R4: Every interactive control in the four areas has a target of at least 44px (the project's own bar; the WCAG minimum is 24px). An exception needs a stated reason tied to a concrete constraint.
- R5: Body text on panels meets at least 4.5:1 contrast; large text at least 3:1. State is never conveyed by colour alone; it also has text, an icon, position, or shape.
- R6: Screen type for all four areas is Chơi (gameplay/HUD/menu game): the gameplay area keeps priority of position, size, and visibility; HUD and overlays stay minimal and at the edges and never cover the tile or control the player is acting on.
- R7: `DESIGN.md` at the repo root records screen types, zones, spacing scale, palette, type scale, breakpoints, and z-order. Confirmed rules are separated from unconfirmed current state; no value is invented without a source.
- R8: Mức can thiệp cho toàn bộ task: Thiết kế lại (owner decision 2026-11-19, whole task).
- R9: Ngôn ngữ khai báo của tài liệu: English — fix `<html lang="vi">` thành `<html lang="en">` trong task này (owner decision 2026-11-19).
- R10: Inspector treatment (owner decisions 2026-11-19: mockup J2 picked for PLAN
  item 79, then treatment B picked 16:07): the panel background is tinted by
  faction, muted — player navy `#101a2e`, enemy dark red `#2b1719`,
  intermediary dark green `#12241a`, reinforcement dark purple `#1e1428`
  [Giả định] — with a thin muted-gold `#c9a227` frame, a 3px accent bar across
  the top in the faction hue (player `#3b82f6`, enemy `#ef4444`, intermediary
  `#22c55e`, reinforcement `#a855f7`), and the faction chip. Inner boxes, icon
  tiles, hairlines, and the HP-bar track follow the same faction tone (see
  `DESIGN.md` palette and `src/core/grid/factionTones.ts`). This supersedes
  both the item-76 faction backgrounds (enemy dark red, ally blue — the
  `#1d4ed8`/`#7f1d1d` shades were [Giả định] and are retired) and the J2
  "no faction background" rule, and the "gold `#eab308` frame" for the
  inspector only. The inspector Close is the single action and uses the ghost
  treatment, not a gold primary.

## Acceptance criteria
### design-system/A1: shared panel treatment
Given the four areas open at 1366x768
When each panel is inspected
Then every panel shows the navy `#0c1e5b` background with the gold `#eab308` frame, including the settings panel — except the inspector, which shows a faction-tinted background (player `#101a2e`, enemy `#2b1719`, intermediary `#12241a`, reinforcement `#1e1428` [Giả định]) with the muted-gold `#c9a227` frame and a faction accent bar (R10).
Check: Playwright test "design-system/A1 shared panel treatment" (computed styles in the four areas) + before/after screenshots   Test-first: no

### design-system/A2: one primary action per decision point
Given a decision point in any of the four areas (forecast confirm, settings navigation, inspector close)
When the point is shown
Then exactly one action carries the primary treatment and every other action there shares the secondary treatment; the inspector is the exception with zero primaries — its single action (Close) uses the ghost treatment per R10
Check: Playwright test "design-system/A2 one primary action per decision point" + screenshots   Test-first: no

### design-system/A3: 44px targets
Given any interactive control in the four areas
When its on-screen box is measured at 1366x768
Then its target is at least 44px in both dimensions, or a documented exception with a stated reason applies
Check: Playwright test "design-system/A3 controls meet 44px target" (bounding boxes in the four areas)   Test-first: no

### design-system/A4: one scale for spacing, type, radii, z-order
Given the four areas after the redesign
When each area's spacing, text sizes, radii, and z-index are compared with the `DESIGN.md` scale tables
Then every value matches a scale value; no ad-hoc value remains in the four areas
Check: manual check of the four areas against the `DESIGN.md` scale tables + screenshots   Test-first: no

### design-system/A5: DESIGN.md exists and is complete
Given the repo root after the task
When `DESIGN.md` is read
Then it covers screen types, zones, spacing scale, palette, type scale, breakpoints, and z-order, with confirmed rules separated from unconfirmed current state
Check: manual read-through of `DESIGN.md` against `Game_Design/art_ui.md`   Test-first: no

### design-system/A6: panel text contrast
Given body text on any panel in the four areas at 1366x768
When its foreground and background colours are measured
Then the contrast ratio is at least 4.5:1 (at least 3:1 for large text)
Check: Playwright test "design-system/A6 panel text contrast" (ratios computed from computed styles)   Test-first: no

### design-system/A7: document language matches UI language
Given the owner confirms fixing the lang attribute in this task
When the app loads
Then the document language matches the UI language (English)
Check: Playwright test "design-system/A7 html lang matches UI language"   Test-first: no

## Decisions
- 2026-11-15: Language of the whole game is English; project docs are Vietnamese, code/variables/commits English (`Game_Design/decisions.md`, language section).
- 2026-11-17: Visual direction is minimalist/Nordic with clear information hierarchy (`Game_Design/art_ui.md:13-15`).
- 2026-11-17/18: Battle map is full-frame and scrollable with no fixed top bar or side column; popups are overlays only (`Game_Design/art_ui.md:24-36`, PLAN items 71/73/74).
- 2026-11-18: Verified viewport is 1366x768 (PLAN items 71/73).

## Out of scope
- Changing the palette or identity beyond the `art_ui.md` navy/gold contract needs a separate owner decision (the Thiết kế lại level was confirmed for the whole task 2026-11-19, but the redesign still works within that contract).
- Any game rule, number, or flow; the English-only language; any 3D work.
- Breakpoints below ~950px (PLAN item 73 LOW remains open).
- Tokens or primitives for areas outside the four (Title, Save Files, World Map, dialogue, result popup, preparation); those may adopt the primitives later as a follow-up.

## Deferred
- Below-~950px HUD overlap (PLAN item 73 LOW): stays open; this spec sets no rule for it.
