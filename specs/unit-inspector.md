# Spec: character detail (unit inspector)
Feature id: none

## What and why
The full detail view for one unit: who they are, how they fight, their attributes, and what they carry. The player opens it from the hover banner to compare a unit before acting, and closes it just as easily. It shows exactly the unit's data — nothing added, nothing recomputed — in panels whose labels and numbers line up so two units can be compared at a glance.

## Users
Players of the 2D battle map (mouse, touch, keyboard) at 1366x768.

## Rules
- R1: The inspector shows identity (name, class, level, faction, portrait), a Combat panel (Atk/Hit/Avo/Crit/AS/Effectiveness), an Attributes panel (Str/Skl/Spd/Lck/Mag/Def/Res), and Items plus Max HP and Move. It adds no data and removes none.
- R2: The panel background is tinted by faction, muted (owner decision
  2026-11-19 16:07: mockup B picked — "nền theo phe (dịu)"). Player navy
  `#101a2e`, enemy dark red `#2b1719` (muted, not vivid — the owner's own
  memory of the FE3 original), intermediary dark green `#12241a`,
  reinforcement dark purple `#1e1428` [Giả định]. All four keep the thin
  muted-gold `#c9a227` frame, the 3px accent bar across the top in the
  faction hue, and the faction chip in the header. This supersedes the J2
  "no faction background" rule (which itself had superseded the item-76
  faction backgrounds) — the owner decided the J2 navy-for-all treatment
  distinguishes the sides too weakly (only the bar + chip differed).
- R3: Close is the single action. The inspector closes from the Close button, from
  a click/touch outside the panel, and from Escape. Close uses the ghost treatment
  (transparent background, hairline border) per the approved J2 mockup — it is
  NOT a gold primary, so the inspector has zero gold primaries. The Close target
  is at least 44px (the mockup drew it 30px; the touch rule wins).
- R4: Label–value pairs align: labels share one left edge, values share one right-aligned column within their own column or box (Combat column, Attributes column, Vitals box each have their own right-aligned value column), so a value never shifts because a neighbouring row has an extra part.
- R5: A long name wraps or truncates inside the panel without pushing the Close control out of reach; if content exceeds the viewport height the panel scrolls internally and the Close control stays reachable.
- R6: The inspector displays values supplied by core and its existing display helpers; it adds no new combat computation.
- R7: Weapons and items show their FE3 icon, not just their name. Each weapon cell
  and each item slot leads with the icon (`getItemIcon`, 26px, pixelated) in a soft
  tile, so a weapon or item is distinguishable by its icon at a glance. A filled
  item slot shows icon + name + uses; an empty slot is a dashed outline with "—".
- R8: Japanese minimalist (owner direction 2026-11-19): muted gold `#b49b5e`
  section titles, hairline dividers, generous spacing, no black inner boxes. The
  treatment is restrained, not stripped — every panel and every value from R1 is
  kept.
- R9: Faction tones (owner decisions 2026-11-19 14:34 codes, 16:07 treatment B).
  Four tones, one per display group: player (accent `#3b82f6`, panel `#101a2e`),
  enemy (accent `#ef4444`, panel `#2b1719`), intermediary (accent `#22c55e`,
  panel `#12241a`), reinforcement (accent `#a855f7`, panel `#1e1428`
  [Giả định]). Each tone also sets the inner box, icon tile, hairline, HP-bar
  track, chip colours, and map-token background/border (see `DESIGN.md` palette
  and `src/core/grid/factionTones.ts`). The chip labels are Player / Enemy /
  Ally / Reinforcement. Sides are distinguished by colour, not by text alone
  (R5: the chip text still accompanies the colour). Mechanism: a unit's display
  group is its `faction` (`player` | `enemy` | `ally`) plus the display-only
  flag `GridUnit.isReinforcement` — an `ally` unit marked as a reinforcement
  renders in the reinforcement tone, any other `ally` unit in the intermediary
  tone. The flag is origin metadata for display only; the faction still governs
  behaviour (turn order, AI, targeting). No reinforcement system exists in the
  code yet and no chapter fields an `ally` unit, so the reinforcement tone is
  code-complete but dormant until chapter data marks a reinforcement unit.
  The 2D map tokens (`Grid2D`) use the same tones (token background + border);
  the 3D scene is frozen and untouched.

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

### unit-inspector/A4: values share one right-aligned column per column/box
Given the inspector open at 1366x768
When the value positions in the Combat column, the Attributes column, and the
Vitals box are measured
Then the values inside each column/box share that column's/box's right-aligned
edge (within 2px)
Check: Playwright test "unit-inspector/A4 values share one right-aligned column per column/box" + screenshots   Test-first: no

### unit-inspector/A5: longest unit name fits
Given the inspector opened for the unit with the longest name in `data/characters.json`
When it is shown at 1366x768
Then the name does not overflow the panel and the Close control stays visible and reachable
Check: Playwright test "unit-inspector/A5 longest unit name fits" + screenshot   Test-first: no

### unit-inspector/A6: empty items state keeps its place
Given the inspector opened for a unit with no items
When the Items box is shown
Then it shows four empty dashed slots (each "—") and the Vitals box keeps its
place (no layout shift of the panels below it)
Check: Playwright test "unit-inspector/A6 empty items state keeps its place"   Test-first: no

### unit-inspector/A7: weapons and items show their icons
Given the inspector open at 1366x768
When the Weapons box and the Items box are shown
Then every weapon cell and every filled item slot shows its FE3 icon (26px,
loaded image) before the name
Check: Playwright test "unit-inspector/J2 weapons and items show their icons" + screenshots   Test-first: no

### unit-inspector/A8: faction tones distinguish the sides by colour
Given the inspector opened for a unit of each display group (player, enemy,
intermediary, reinforcement)
When the panel, accent bar, and chip are inspected
Then the panel background, accent bar, and chip match that group's tone
(player `#101a2e` / `#3b82f6`, enemy `#2b1719` / `#ef4444`, intermediary
`#12241a` / `#22c55e`, reinforcement `#1e1428` / `#a855f7`), and the chip
reads Player / Enemy / Ally / Reinforcement
Check: Playwright test "unit-inspector/B faction tones — player and enemy" (real game) + Vitest `tests/core/factionTones.test.ts` and the SSR render in `tests/core/uiRender.test.ts` (all four tones) + screenshots. The intermediary and reinforcement tones cannot be shown in the real game yet (no chapter fields an `ally` unit, and save validation rejects faction flips in saved games); their in-game screenshots are owed when a chapter fields such units.   Test-first: no

## Decisions
- 2026-11-15: Language of the whole game is English (`Game_Design/decisions.md`, language section).
- 2026-11-17: Visual direction is minimalist/Nordic with clear information hierarchy (`Game_Design/art_ui.md:13-15`).
- 2026-11-18: Verified viewport is 1366x768 (PLAN items 71/73).
- 2026-11-19: Owner picked mockup J2 (modern navy, Japanese minimalist, large
  weapon/item icons, Weapons and Items each in their own box) over B1/B2/B3 and
  the item-76 faction-background treatment. The J2 mockup is the build target for
  PLAN item 79; the `#1d4ed8`/`#7f1d1d` [Giả định] shades are retired.
- 2026-11-19 14:34: Owner confirmed the four faction hues: player `#3b82f6`,
  enemy `#ef4444` (already in code), intermediary `#22c55e`, reinforcement
  `#a855f7`.
- 2026-11-19 16:07: Owner picked treatment B over A (muted faction-tinted panel
  backgrounds) so the sides are distinguished by colour, not by text alone.
  The J2 "no faction background" rule is superseded by this decision; the J2
  layout, icons, and Japanese-minimalist treatment are unchanged.

## Out of scope
- Changing which data the inspector shows (growth rates stay hidden; showing them is a later item).
- Any game rule or number; the English-only language; any 3D work.
- The hover banner (see `hud-basic-info`); the combat forecast (see `combat-forecast-ui`); the settings menu (see `settings-menu`).

## Deferred
- Showing growth rates in the inspector (later item, not this task).
