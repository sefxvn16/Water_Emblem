# Spec: basic info HUD
Feature id: none

## What and why
The basic info the player reads while playing: the hover banner summarising the unit under the cursor, the terrain window for the tile under the cursor, and the HUD cluster around them. The player must be able to read what a unit and a tile are, decide the next action, and reach full details with one clear tap — without the banner covering the tile or the controls, and without the banner moving away from its tile when the map scrolls.

## Users
Players of the 2D battle map (mouse hover, touch tap, keyboard focus) at 1366x768.

## Rules
- R1: Basic info covers the hover banner, the terrain window, and the HUD cluster around them. [NEEDS CLARIFICATION: does "trang thông tin cơ bản" cover exactly these, or other screens? See brief question 2.]
- R2: The hover banner shows the unit's name, HP, class/level, equipped weapon, and one Details affordance; the terrain window shows the terrain name and its movement/defense effect. No essential fact for the next action is hidden behind an extra tap.
- R3: Display precedence is pinned unit, then hovered unit, then selected unit.
- R4: The banner and the terrain window re-anchor to their tile when the map scrolls or the window resizes; they never stay frozen while the tile moves underneath.
- R5: A banner is not itself a button. Its Details affordance is the only click target inside it; interactive elements are never nested inside another interactive element.
- R6: The banner and the terrain window never cover the settings/End Turn cluster or the tile the player is acting on; their z-order follows `DESIGN.md`.
- R7: Hovering an empty tile shows terrain info only, with no unit block.

## Acceptance criteria
### hud-basic-info/A1: hover and terrain content
Given a unit tile and an empty tile on the battle map at 1366x768
When the player hovers (or taps) each tile
Then the unit tile shows the banner with name, HP, class/level, weapon, and a Details affordance, and the empty tile shows the terrain window with terrain name and movement/defense effect
Check: Playwright test "hud-basic-info/A1 hover and terrain content" + screenshots   Test-first: no

### hud-basic-info/A2: banner tracks its tile on scroll
Given the hover banner shown for a tile
When the map is scrolled by at least 200px
Then the banner re-anchors to the same tile's new screen position instead of staying where it was
Check: Playwright test "hud-basic-info/A2 banner tracks tile on scroll"   Test-first: no

### hud-basic-info/A3: Details is the only click target
Given the hover banner shown
When its interactive elements are counted and measured
Then exactly one click target exists (Details), it is at least 44px tall, and the banner container itself is not a button
Check: Playwright test "hud-basic-info/A3 Details is the only click target"   Test-first: no

### hud-basic-info/A4: pinned beats hovered beats selected
Given a pinned unit, a different hovered unit, and a selected unit at the same time
When the banner is shown
Then it shows the pinned unit; unpinning it shows the hovered unit; moving the cursor away shows the selected unit
Check: Playwright test "hud-basic-info/A4 pinned beats hovered beats selected"   Test-first: no

### hud-basic-info/A5: empty tile shows terrain only
Given the cursor over a tile with no unit
When the info windows are shown
Then the terrain window is shown and no unit block appears
Check: Playwright test "hud-basic-info/A5 empty tile shows terrain only"   Test-first: no

### hud-basic-info/A6: banner clears HUD cluster and selected tile
Given the hover banner shown at 1366x768
When its on-screen box is compared with the settings/End Turn cluster and the selected tile
Then it overlaps neither
Check: Playwright test "hud-basic-info/A6 banner clears HUD cluster and selected tile" + screenshots   Test-first: no

## Decisions
- 2026-11-17/18: Battle map is full-frame and scrollable; popups are overlays only (`Game_Design/art_ui.md:24-36`, PLAN items 71/73/74).
- 2026-11-18: Hover uses 600ms hide / 300ms re-hide grace timers; tap shows the banner, Details opens the inspector, long-press (~500ms) opens the inspector (PLAN item 74, `App.tsx:830-851`).
- 2026-11-18: Verified viewport is 1366x768 (PLAN items 71/73).

## Out of scope
- The character detail modal itself (see `unit-inspector`); the combat forecast (see `combat-forecast-ui`); the settings menu (see `settings-menu`).
- Any game rule or number; the English-only language; any 3D work.
- Viewports below ~950px (PLAN item 73 LOW remains open).

## Deferred
- Whether "trang thông tin cơ bản" covers screens beyond the hover banner, terrain window, and HUD cluster (brief question 2).
