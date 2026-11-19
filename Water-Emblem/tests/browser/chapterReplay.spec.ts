// Deterministic chapter playthroughs (PLAN.md item 60).
// Each fixture is a fixed list of UI steps recorded once with a fixed RNG seed
// (tools/e2e_record/). Replaying the same steps with the same seed must reach
// STAGE CLEAR. Game rules are covered by unit tests in tests/core/; this spec
// checks the 2D flow: title -> preparation -> actions -> seize -> next chapter.
import { expect, test, type Page } from '@playwright/test';
import { closeSettings, openSettings } from './settingsMenu';
import { readFileSync } from 'node:fs';

// Recorded buttons that now live in the Settings menu (PLAN.md item 71).
const SETTINGS_BUTTONS = /(2D Grid|3D View|Save Game|Load Game|Save Files|World Map|Title|Sound: On|Muted)/;

type ReplayStep =
  | { kind: 'tile'; testId: string }
  | { kind: 'button'; name: string }
  | { kind: 'select'; value: string };

interface ReplayFixture {
  readonly seed: number;
  readonly steps: readonly ReplayStep[];
}

function loadFixture(name: string): ReplayFixture {
  return JSON.parse(readFileSync(`tests/browser/fixtures/${name}.replay.json`, 'utf8')) as ReplayFixture;
}

// Save then load right after the first battle starts; the replay must still win afterwards.
async function saveAndLoad(page: Page): Promise<void> {
  await openSettings(page);
  await page.getByRole('button', { name: /Save Game/i }).click();
  await expect(page.getByText(/Game progress saved/i)).toBeVisible();
  await openSettings(page);
  await page.getByRole('button', { name: /Load Game/i }).click();
  await expect(page.getByText(/Save file loaded/i)).toBeVisible();
  await openSettings(page);
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
}

async function replay(page: Page, fixture: ReplayFixture): Promise<number> {
  let seizes = 0;
  let savedOnce = false;
  for (const [index, step] of fixture.steps.entries()) {
    const where = `step ${index}: ${JSON.stringify(step)}`;
    if (step.kind === 'tile') {
      // Enemy phase must be over before the player selects tiles again.
      await openSettings(page);
      await expect(page.getByText('PLAYER PHASE'), where).toBeVisible({ timeout: 15000 });
      await page.getByTestId(step.testId).dispatchEvent('click');
    } else if (step.kind === 'select') {
      await openSettings(page);
      await page.locator('select').first().selectOption(step.value);
    } else {
      // Recorded name is the button's accessible name; match it exactly,
      // ignoring whitespace (name computation inserts spaces between elements).
      const pattern = step.name.split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      if (SETTINGS_BUTTONS.test(step.name)) await openSettings(page);
      else await closeSettings(page);
      await page.getByRole('button', { name: new RegExp(`^${pattern}$`) }).first().click({ timeout: 15000 });
      if (/Seize/i.test(step.name)) {
        await expect(page.getByRole('heading', { name: /STAGE CLEAR/i }), where).toBeVisible();
        seizes += 1;
      } else if (/Advance to Chapter/i.test(step.name)) {
        await expect(page.getByRole('heading', { name: /Battle Preparation/i }), where).toBeVisible();
      } else if (/Start Battle/i.test(step.name)) {
        await openSettings(page);
        await expect(page.getByText('PLAYER PHASE'), where).toBeVisible({ timeout: 15000 });
        if (!savedOnce) {
          await saveAndLoad(page);
          savedOnce = true;
        }
      }
    }
  }
  return seizes;
}

for (const chapter of ['chapter1', 'chapter2', 'chapter3']) {
  test(`${chapter}: fixed replay with seed reaches STAGE CLEAR`, async ({ page }) => {
    test.setTimeout(300_000);
    const fixture = loadFixture(chapter);
    await page.goto(`/?seed=${fixture.seed}`);
    const seizes = await replay(page, fixture);
    expect(seizes).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole('heading', { name: /GAME OVER/i })).toHaveCount(0);
  });
}
