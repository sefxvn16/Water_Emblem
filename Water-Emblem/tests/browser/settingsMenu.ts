import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Battle controls outside FE3's layout live in the Settings (⚙) menu (PLAN.md item 71).
function settingsButton(page: Page) {
  return page.getByRole('button', { name: 'Settings', exact: true });
}

export async function openSettings(page: Page): Promise<void> {
  const button = settingsButton(page);
  if ((await button.getAttribute('aria-expanded')) !== 'true') {
    // Dispatch directly: the old header controls were reachable under story modals too.
    await button.dispatchEvent('click');
  }
}

export async function closeSettings(page: Page): Promise<void> {
  const button = settingsButton(page);
  if ((await button.count()) > 0 && (await button.getAttribute('aria-expanded')) === 'true') {
    await button.dispatchEvent('click');
  }
}

// PLAN item 128: Turn/Phase text was removed from the Settings menu, so
// tests read the turn state from the exposed game state instead.
export async function expectTurnNumber(page: Page, turn: number): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => (window as any).__WATER_EMBLEM_STATE__?.turnState?.turnNumber), { timeout: 15000 })
    .toBe(turn);
}

export async function expectPlayerPhase(page: Page): Promise<void> {
  await expect
    .poll(async () => page.evaluate(() => (window as any).__WATER_EMBLEM_STATE__?.turnState?.activePhase), { timeout: 15000 })
    .toBe('player_phase');
}

// PLAN item 131: the centered reward popup (item/gold/recruit) is a
// full-screen overlay; tests dismiss it before continuing to click.
export async function dismissRewardPopup(page: Page): Promise<void> {
  const popup = page.getByTestId('reward-popup');
  if ((await popup.count()) > 0 && (await popup.isVisible())) {
    await popup.getByRole('button', { name: 'OK', exact: true }).click();
    await expect(popup).toBeHidden();
  }
}
