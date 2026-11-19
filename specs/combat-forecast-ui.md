# Spec: combat forecast presentation
Feature id: none

## What and why
The forecast the player reads before committing to an attack: how much damage each side deals, how likely each hit is, how much HP each side has afterwards, and whether the defender can counter or the attacker strikes twice. The player must be able to compare the two sides at a glance and confirm or cancel with one clear action. The forecast only presents numbers core computes; it never computes them itself. (Whether those numbers are correct is the M1/M2 fix in Batch 2, not this task.)

## Users
Players of the 2D battle map (mouse, touch, keyboard) at 1366x768.

## Rules
- R1: Every displayed number (Dmg/Hit/Avo/Crit, AS, HP before and after, counter and double-attack labels) is presented exactly as core provides it in the `CombatForecast`. The window adds no computation and no number of its own.
- R2: Attack is the single primary action; Cancel is secondary. Danger treatment is reserved for destructive actions, so Attack never uses it.
- R3: Each side's HP is shown as `current → after (−loss)` with a bar whose loss segment is visually distinct from the remaining segment.
- R4: "Cannot counter" is shown exactly when the defender cannot counter; a double-attack label is shown exactly when the attacker strikes twice.
- R5: Labels share one left edge and values share one right-aligned column, so the two sides can be compared without hunting.
- R6: The forecast window re-anchors on map scroll and window resize and never covers the attacker tile or the defender tile.
- R7: When no forecast exists, no forecast window is shown; stale numbers from a previous forecast are never displayed.

## Acceptance criteria
### combat-forecast-ui/A1: renders core forecast verbatim
Given a fixed core forecast object for an attacker/defender pair
When the forecast window renders it
Then every displayed Dmg, Hit, Avo, Crit, AS, and HP-after value equals the object's values
Check: Vitest test "combat-forecast-ui/A1 renders core forecast verbatim"   Test-first: no

### combat-forecast-ui/A2: Attack is the only primary action
Given the forecast window open at 1366x768
When its actions are inspected
Then Attack carries the primary treatment, Cancel carries the secondary treatment, and Attack carries no danger treatment
Check: Playwright test "combat-forecast-ui/A2 Attack is the only primary action" + screenshot   Test-first: no

### combat-forecast-ui/A3: HP line and bar
Given a fixed core forecast object
When the forecast window renders it
Then each side shows `current → after (−loss)` text and a bar with a distinct loss segment
Check: Vitest test "combat-forecast-ui/A3 HP line and bar"   Test-first: no

### combat-forecast-ui/A4: Cannot counter shown exactly when true
Given two fixed forecast objects, one in which the defender can counter and one in which they cannot
When each renders
Then "Cannot counter" appears only for the second
Check: Vitest test "combat-forecast-ui/A4 Cannot counter shown exactly when defender cannot counter"   Test-first: no

### combat-forecast-ui/A5: forecast clears attacker and defender tiles on scroll and resize
Given the forecast window open for an attacker/defender pair
When the map is scrolled and the window is resized
Then the forecast window overlaps neither the attacker tile nor the defender tile
Check: Playwright test "combat-forecast-ui/A5 forecast clears attacker and defender tiles on scroll and resize"   Test-first: no

### combat-forecast-ui/A6: no forecast data shows no window
Given no forecast exists (no target selected)
When the battle map is shown
Then no forecast window is visible
Check: Playwright test "combat-forecast-ui/A6 no forecast data shows no window"   Test-first: no

## Decisions
- 2026-11-15: Language of the whole game is English (`Game_Design/decisions.md`, language section).
- 2026-11-17: Forecast overlays the left edge of the full-frame map (`Game_Design/art_ui.md:24-36`).
- 2026-11-18: Verified viewport is 1366x768 (PLAN items 71/73).

## Out of scope
- Correctness of the forecast numbers themselves (review M1/M2; Batch 2, not this task). This spec covers presentation only.
- Any game rule, number, or flow change; the English-only language; any 3D work.
- The combat result popup (see `combatPopupData.ts`); the hover banner (see `hud-basic-info`); the inspector (see `unit-inspector`).

## Deferred
- Forecast-number correctness (M1/M2), owned by Batch 2.
