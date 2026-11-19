# Spec: settings menu
Feature id: none

## What and why
The one place for everything that is not fighting: which chapter is being played, how much gold the army holds, whose turn it is, where to go next (title, world map, save files, save, load), how the game looks and sounds, and what has happened in battle. Today those pieces sit in one wrapping row of five mismatched buttons with no headings and no primary action, so the player hunts for the right button. After this task, each group has a heading, the navigation actions share one treatment, and there is exactly one primary action.

## Users
Players of the 2D battle map (mouse, touch, keyboard) at 1366x768.

## Rules
- R1: The gear's corner follows the owner-confirmed position. [NEEDS CLARIFICATION: `Game_Design/decisions.md` (layout section, 2026-11-17) says top-right; `Game_Design/art_ui.md:38-39`, PLAN item 71, and `BattleSettingsMenu.tsx:53-55` say bottom-right. Which wins? See brief question 3.]
- R2: End Turn sits adjacent to the gear, with the gear on the right of End Turn; the menu opens upward from the gear.
- R3: The menu auto-closes when the chapter changes and when another screen opens.
- R4: Content is grouped with a visible heading per group: chapter controls, status (gold, turn, phase), navigation actions, view/audio toggles, and combat log each form one group. (This task changes only the grouping and presentation of the chapter control; which chapters it lists is owned by the M9 fix in PLAN item 75.)
- R5: The five navigation actions (Title, World Map, Save Files, Save Game, Load Game) share one secondary treatment; exactly one primary action exists in the whole menu.
- R6: The menu panel uses the shared navy/gold treatment from `design-system`; it never uses the `#262626`/`#444` treatment.
- R7: Every navigation action closes the menu, including Save Game and Load Game (today only Title, World Map, and Save Files close it).
- R8: The combat log shows "No battle engagements yet." when empty.
- R9: Every control in the menu has a target of at least 44px; if the menu is taller than the viewport it scrolls internally and is never cut off at the screen edge.

## Acceptance criteria
### settings-menu/A1: gear at the confirmed corner
Given the owner confirms the gear's corner
When the battle map is shown at 1366x768
Then the gear sits at the confirmed corner with End Turn adjacent to it and the gear on the right
Check: before/after screenshots at 1366x768   Test-first: no

### settings-menu/A2: menu opens upward and auto-closes
Given the battle map at 1366x768
When the player opens the menu, then changes chapter, then reopens it and opens another screen
Then the menu opens upward from the gear and closes on the chapter change and on the other screen opening
Check: Playwright test "settings-menu/A2 menu opens upward and auto-closes"   Test-first: no

### settings-menu/A3: nav actions grouped under one heading
Given the settings menu open at 1366x768
When the navigation group is inspected
Then Title, World Map, Save Files, Save Game, and Load Game sit in one group under one visible heading, share one treatment, and the menu contains exactly one primary action
Check: Playwright test "settings-menu/A3 nav actions grouped under one heading" + screenshot   Test-first: no

### settings-menu/A4: panel uses shared treatment
Given the settings menu open at 1366x768
When the panel is inspected
Then it shows the shared navy `#0c1e5b` background with the gold `#eab308` frame
Check: Playwright test "settings-menu/A4 panel uses shared treatment" + screenshot   Test-first: no

### settings-menu/A5: Save and Load close the menu
Given the settings menu open
When the player taps Save Game, then reopens the menu and taps Load Game
Then the menu closes in both cases
Check: Playwright test "settings-menu/A5 Save and Load close the menu"   Test-first: no

### settings-menu/A6: status group and empty combat log
Given the settings menu open with no battle engagements yet
When the status group and the combat log are inspected
Then gold, turn, and phase sit in one group, and the log shows "No battle engagements yet."
Check: Playwright test "settings-menu/A6 status group and empty combat log"   Test-first: no

### settings-menu/A7: menu controls meet 44px and menu is not cut off
Given the settings menu open at 1366x768
When every control is measured and the menu box is compared with the viewport
Then every control measures at least 44px in both dimensions and no part of the menu lies outside the viewport
Check: Playwright test "settings-menu/A7 menu controls meet 44px and menu is not cut off" + screenshot   Test-first: no

## Decisions
- 2026-11-15: Language of the whole game is English (`Game_Design/decisions.md`, language section).
- 2026-11-17/18: Non-FE3 controls live in Settings; End Turn and the gear are adjacent at the bottom-right with the gear on the right; the menu opens upward; the menu auto-closes on chapter change or another screen (`Game_Design/art_ui.md:38-39`, PLAN item 71). Note: the corner itself is disputed — see R1 and brief question 3; only the adjacency, order, opening direction, and auto-close are recorded here as decided.
- 2026-11-18: Verified viewport is 1366x768 (PLAN items 71/73).

## Out of scope
- Which chapters the chapter control lists (owned by the M9 fix in PLAN item 75); this task changes only its grouping and presentation.
- Any game rule, number, or flow change; the English-only language; any 3D work.
- The hover banner (see `hud-basic-info`); the inspector (see `unit-inspector`); the forecast (see `combat-forecast-ui`).

## Deferred
- Gear corner, pending the owner's answer to brief question 3.
