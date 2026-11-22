import { expect, test, type Page } from '@playwright/test';
import { closeSettings, dismissRewardPopup, expectPlayerPhase, expectTurnNumber, openSettings } from './settingsMenu';

async function enterBattle(page: Page) {
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) {
    await resumeBtn.click();
  }
  const startBtn = page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i });
  if (await startBtn.isVisible()) {
    await startBtn.click();
  }
  await closeSettings(page);
  await expect(page.getByTestId('tile-0-0')).toBeVisible({ timeout: 15000 });
}

async function clickTile(page: Page, x: number, y: number) {
  await dismissRewardPopup(page);
  await page.getByTestId(`tile-${x}-${y}`).dispatchEvent('click');
}

test('enemy phase runs with camera tracking and indicator focus', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);

  // Enable Auto End Turn in Settings
  await openSettings(page);
  await page.getByRole('group', { name: 'Auto End Turn' }).getByRole('button', { name: 'On' }).click();
  await closeSettings(page);

  // Wait all player units to trigger enemy phase
  const playerTiles = [[24, 5], [25, 5], [23, 4], [22, 7], [23, 7], [22, 3], [23, 3]] as const;
  for (const [x, y] of playerTiles) {
    await clickTile(page, x, y);
    await clickTile(page, x, y);
    await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  }

  // Verify Enemy Phase completes and advances to Turn 2 Player Phase smoothly
  await openSettings(page);
  await expectTurnNumber(page, 2);
  await expectPlayerPhase(page);
});
