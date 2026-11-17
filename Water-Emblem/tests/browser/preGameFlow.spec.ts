import { expect, test } from '@playwright/test';
import { openSettings } from './settingsMenu';

test.describe('Pre-game Navigation Flow (Title, Save Slots, Book Select, World Map)', () => {
  test('Title screen, Save Slots, Book Select, and World Map can be navigated seamlessly', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Initial view is Title Screen (Milestone 44)
    await expect(page.getByRole('heading', { name: 'WATER EMBLEM', exact: true })).toBeVisible();
    await expect(page.getByText('Mystery of Nothing').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /START NEW GAME/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /FILE SELECT/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /CONTINENT OF ARCHANEA/i })).toBeVisible();

    // 2. Open World Map from Title Screen
    await page.getByRole('button', { name: /CONTINENT OF ARCHANEA/i }).click();
    await expect(page.getByRole('heading', { name: /CONTINENT OF ARCHANEA/i })).toBeVisible();
    await expect(page.getByText(/The Continent of Archanea/i)).toBeVisible();

    // Click on Aurelis region on map
    await page.locator('svg text', { hasText: 'Aurelis' }).click({ force: true });
    await expect(page.getByText('Kingdom of Aurelis')).toBeVisible();
    await expect(page.getByText(/Prince Hardin/i).first()).toBeVisible();

    // Click on Talys region on map
    await page.locator('svg text', { hasText: 'Talys' }).click({ force: true });
    await expect(page.getByText('Kingdom of Talys')).toBeVisible();
    await expect(page.getByText(/King Mostyn/i).first()).toBeVisible();

    // Deploy to Battle from World Map
    await page.getByRole('button', { name: /Deploy to Battle/i }).click();
    await expect(page.getByRole('heading', { name: /CONTINENT OF ARCHANEA/i })).not.toBeVisible();

    // Dismiss initial story intro if present
    const startBattleBtn = page.getByRole('button', { name: /Start Battle/i });
    if (await startBattleBtn.isVisible()) {
      await startBattleBtn.click();
    }

    // 3. Verify in-battle Header bar navigation buttons are present
    await openSettings(page);
    const titleBtn = page.getByRole('button', { name: /Title/i });
    const worldMapBtn = page.getByRole('button', { name: /World Map/i });
    const slotsBtn = page.getByRole('button', { name: /Save Files/i });

    await expect(titleBtn).toBeVisible();
    await expect(worldMapBtn).toBeVisible();
    await expect(slotsBtn).toBeVisible();

    // 4. Open Save Slots Modal from Header
    await slotsBtn.click();
    await expect(page.getByRole('heading', { name: /FILE SELECT/i })).toBeVisible();
    await expect(page.getByText(/File 1/i)).toBeVisible();
    await expect(page.getByText(/File 2/i)).toBeVisible();
    await expect(page.getByText(/File 3/i)).toBeVisible();

    // Close Save Slots Modal
    await page.getByRole('button', { name: /Close/i }).click();
    await expect(page.getByRole('heading', { name: /FILE SELECT/i })).not.toBeVisible();

    // 5. Open Title Screen -> New Game -> Book Select
    await titleBtn.click();
    await page.getByRole('button', { name: /START NEW GAME/i }).click();
    await expect(page.getByRole('heading', { name: /SELECT CAMPAIGN/i })).toBeVisible();
    await expect(page.getByText(/Book 1: The Dark Dragon/i)).toBeVisible();
    await expect(page.getByText(/Book 2: The Mystery of the Emblem/i)).toBeVisible();

    // Select Book 1 -> Transitions to World Map
    await page.getByRole('button', { name: /Enter Book 1/i }).click();
    await expect(page.getByRole('heading', { name: /CONTINENT OF ARCHANEA/i })).toBeVisible();

    // Deploy World Map back to game
    await page.getByRole('button', { name: /Deploy to Battle/i }).click();
    const startBattleBtn2 = page.getByRole('button', { name: /Start Battle/i });
    if (await startBattleBtn2.isVisible()) {
      await startBattleBtn2.click();
    }
    await openSettings(page);
    await expect(page.getByText('PLAYER PHASE')).toBeVisible();
  });
});
