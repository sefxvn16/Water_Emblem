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
