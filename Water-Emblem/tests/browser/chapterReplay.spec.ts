// Deterministic chapter playthroughs (PLAN.md item 60).
// Each fixture is a fixed list of UI steps recorded once with a fixed RNG seed
// (tools/e2e_record/). Replaying the same steps with the same seed must reach
// STAGE CLEAR. Game rules are covered by unit tests in tests/core/; this spec
// checks the 2D flow: title -> preparation -> actions -> seize -> next chapter.
import { expect, test, type Page } from '@playwright/test';
import { closeSettings, dismissRewardPopup, expectPlayerPhase, openSettings } from './settingsMenu';
import { existsSync, readFileSync } from 'node:fs';

// Recorded buttons that now live in the Settings menu (PLAN.md item 71).
const SETTINGS_BUTTONS = /(2D Grid|3D View|Save Game|Load Game|Manage Saves|World Map|Title)/;

type ReplayStep =
  | { kind: 'tile'; testId: string }
  | { kind: 'button'; name: string }
  | { kind: 'select'; value: string };

interface ReplayFixture {
  readonly seed: number;
  readonly steps: readonly ReplayStep[];
}

function loadFixture(name: string): ReplayFixture {
  const p = existsSync(`Water-Emblem/tests/browser/fixtures/${name}.replay.json`)
    ? `Water-Emblem/tests/browser/fixtures/${name}.replay.json`
    : `tests/browser/fixtures/${name}.replay.json`;
  return JSON.parse(readFileSync(p, 'utf8')) as ReplayFixture;
}

// Dismiss level-up modal if present (PLAN item 193/199). Click Continue button, fallback to Enter/Space.
async function dismissLevelUpModal(page: Page): Promise<boolean> {
  let dismissed = false;
  try {
    const modal = page.getByTestId('level-up-modal');
    while ((await modal.count()) > 0 && (await modal.isVisible())) {
      dismissed = true;
      const btn = modal.getByRole('button', { name: /Continue/i });
      if ((await btn.count()) > 0 && (await btn.isVisible())) {
        await btn.click({ timeout: 1000 }).catch(async () => {
          await btn.dispatchEvent('click').catch(() => {});
          await page.keyboard.press('Enter').catch(() => {});
        });
      } else {
        await modal.click({ position: { x: 5, y: 5 } }).catch(() => {});
        await page.keyboard.press('Enter').catch(() => {});
      }
      await page.waitForTimeout(100);
    }
  } catch {
    // Modal may have closed during check
  }
  return dismissed;
}

// During enemy phase, combat may trigger level up modals that pause turn flow.
// Continuously dismiss any level up modal until player phase is reached.
async function waitForPlayerPhase(page: Page): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    await dismissLevelUpModal(page);
    const phase = await page.evaluate(() => (window as any).__WATER_EMBLEM_STATE__?.turnState?.activePhase);
    if (phase === 'player_phase') break;
    await page.waitForTimeout(100);
  }
  await expectPlayerPhase(page);
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
  await waitForPlayerPhase(page);
}

async function replay(page: Page, fixture: ReplayFixture): Promise<number> {
  let seizes = 0;
  let savedOnce = false;
  for (const [index, step] of fixture.steps.entries()) {
    const where = `step ${index}: ${JSON.stringify(step)}`;
    // PLAN item 131: a village visit / recruit / chest from the previous
    // step may have opened the reward popup; dismiss it before clicking.
    await dismissRewardPopup(page);
    await dismissLevelUpModal(page);
    if (step.kind === 'tile') {
      // Enemy phase must be over before the player selects tiles again.
      await waitForPlayerPhase(page);
      await closeSettings(page);
      await page.getByTestId(step.testId).dispatchEvent('click');
      await dismissLevelUpModal(page);
    } else if (step.kind === 'select') {
      await openSettings(page);
      await page.locator('select').first().selectOption(step.value);
    } else {
      // Recorded name is the button's accessible name; match it exactly,
      // ignoring whitespace (name computation inserts spaces between elements).
      const pattern = step.name.split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
      if (SETTINGS_BUTTONS.test(step.name)) await openSettings(page);
      else await closeSettings(page);
      const btn = page.getByRole('button', { name: new RegExp(`^${pattern}$`) }).first();
      await btn.click({ timeout: 15000 }).catch(async () => {
        await btn.dispatchEvent('click');
      });
      await dismissLevelUpModal(page);
      if (/Seize/i.test(step.name)) {
        await expect(page.getByRole('heading', { name: /STAGE CLEAR/i }), where).toBeVisible();
        seizes += 1;
      } else if (/Advance to Chapter/i.test(step.name)) {
        await expect(page.getByRole('heading', { name: /Battle Preparation/i }), where).toBeVisible();
      } else if (/Start Battle/i.test(step.name)) {
        await openSettings(page);
        await waitForPlayerPhase(page);
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
