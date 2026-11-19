# Spec: character detail (unit inspector)
Feature id: none

## What and why
The full detail view for one unit: who they are, how they fight, their attributes, and what they carry. The player opens it from the hover banner to compare a unit before acting, and closes it just as easily. It shows exactly the unit's data — nothing added, nothing recomputed — in panels whose labels and numbers line up so two units can be compared at a glance.

## Users
Players of the 2D battle map (mouse, touch, keyboard) at 1366x768.

## Rules
- R1: The inspector shows identity (name, class, level, faction, portrait), a Combat panel (Atk/Hit/Avo/Crit/AS/Effectiveness), an Attributes panel (Str/Skl/Spd/Lck/Mag/Def/Res), and Items plus Max HP and Move. It adds no data and removes none.
- R2: The panel keeps the gold frame. The background follows the unit's faction, per owner decision 2026-11-19: enemy — dark red background; ally — blue background. Colours taken from the original (the established faction hues already in the code: ally `#3b82f6`, enemy `#ef4444`, `UnitInspectorWindow.tsx:126`, `Grid2D.tsx:190-191`); the exact background shades are taken from the FE3 original reference at build time and recorded in `DESIGN.md` — no new palette is invented. This supersedes `Game_Design/art_ui.md:43`'s navy background for the inspector only; the dark `#1b1b22` background goes away.
- R3: Close is the single primary action. The inspector closes from the Close button, from a click/touch outside the panel, and from Escape. The Close target is at least 44px.
- R4: Label–value pairs align: labels share one left edge, values share one right-aligned column across all three panels, so a value never shifts because a neighbouring row has an extra part.
- R5: A long name wraps or truncates inside the panel without pushing the Close control out of reach; if content exceeds the viewport height the panel scrolls internally and the Close control stays reachable.
- R6: The inspector displays values supplied by core and its existing display helpers; it adds no new combat computation.

## Acceptance criteria
### unit-inspector/A1: content matches chapter data
Given the inspector opened for a unit
When the displayed identity, Combat, Attributes, Items, Max HP, and Move are compared with `data/characters.json` for that unit
Then every displayed value equals the data
Check: Playwright test "unit-inspector/A1 content matches chapter data"   Test-first: no

### unit-inspector/A2: confirmed panel treatment
Given the owner confirms the background/frame treatment
When the inspector is open at 1366x768
Then the panel shows the confirmed treatment (gold frame with navy background, or the confirmed alternative)
Check: before/after screenshots at 1366x768   Test-first: no

### unit-inspector/A3: close paths and target size
Given the inspector open
When the player uses the Close button, then reopens and clicks/touches outside, then reopens and presses Escape
Then the inspector closes in all three cases, and the Close target measures at least 44px in both dimensions
Check: Playwright test "unit-inspector/A3 close paths and target size"   Test-first: no

### unit-inspector/A4: values share one right-aligned column
Given the inspector open at 1366x768
When the value positions in the Combat, Attributes, and Items panels are measured
Then all values share one right-aligned column edge
Check: Playwright test "unit-inspector/A4 values share one right-aligned column" + screenshots   Test-first: no

### unit-inspector/A5: longest unit name fits
Given the inspector opened for the unit with the longest name in `data/characters.json`
When it is shown at 1366x768
Then the name does not overflow the panel and the Close control stays visible and reachable
Check: Playwright test "unit-inspector/A5 longest unit name fits" + screenshot   Test-first: no

### unit-inspector/A6: empty items state keeps its place
Given the inspector opened for a unit with no items
When the Items panel is shown
Then it shows "No items" and the panel keeps its place (no layout shift of the panels below it)
Check: Playwright test "unit-inspector/A6 empty items state keeps its place"   Test-first: no

## Decisions
- 2026-11-15: Language of the whole game is English (`Game_Design/decisions.md`, language section).
- 2026-11-17: Visual direction is minimalist/Nordic with clear information hierarchy (`Game_Design/art_ui.md:13-15`).
- 2026-11-18: Verified viewport is 1366x768 (PLAN items 71/73).

## Out of scope
- Changing which data the inspector shows (growth rates stay hidden; showing them is a later item).
- Any game rule or number; the English-only language; any 3D work.
- The hover banner (see `hud-basic-info`); the combat forecast (see `combat-forecast-ui`); the settings menu (see `settings-menu`).

## Deferred
- Inspector background/frame treatment, pending the owner's answer to brief question 4.
- Showing growth rates in the inspector (later item, not this task).
