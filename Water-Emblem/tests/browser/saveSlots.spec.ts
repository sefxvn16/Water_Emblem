import { expect, test, type Page } from '@playwright/test';
import { openSettings } from './settingsMenu';

// H2 (PLAN item 75): the save-slots modal must not report delete/copy success
// unconditionally, and copying onto an occupied slot must ask first.
// Before the fix, clicking an occupied copy target copied immediately with no
// confirm, and the toast always claimed success.
//
// The seed record is built from the app's own exposed chapter-01 state
// (window.__WATER_EMBLEM_STATE__.extendedUnits), so it is a valid snapshot
// under the same validation saveGameState applies.
async function seedSlot(page: Page, slot: string): Promise<void> {
  await page.evaluate(async (slotId) => {
    const state = (window as unknown as { __WATER_EMBLEM_STATE__?: { extendedUnits: unknown[] } })
      .__WATER_EMBLEM_STATE__;
    if (!state) throw new Error('app state not exposed');
    const record = {
      chapterId: 'chapter_01',
      turnState: { turnNumber: 1, activePhase: 'player_phase' },
      extendedUnits: structuredClone(state.extendedUnits),
      reserveUnits: [],
      rngSeed: 1,
      chapterOutcome: 'ongoing',
      showStoryIntro: true,
      combatLog: [],
      gold: 0,
      villageStates: {},
      version: '5.0.0',
      timestamp: Date.now(),
      slot: slotId,
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('saves', 'readwrite');
      transaction.objectStore('saves').put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, slot);
}

async function openSaveSlots(page: Page): Promise<void> {
  await page.getByRole('button', { name: /FILE SELECT/i }).click();
  await expect(page.getByRole('heading', { name: /FILE SELECT/i })).toBeVisible();
  await expect(page.getByText(/File 1/i)).toBeVisible();
}

async function openSaveSlotsFromSettings(page: Page): Promise<void> {
  await openSettings(page);
  await page.getByRole('button', { name: /Save Files/i }).click();
  await expect(page.getByRole('heading', { name: /FILE SELECT/i })).toBeVisible();
  await expect(page.getByText(/File 1/i)).toBeVisible();
}

async function dismissStoryIntro(page: Page): Promise<void> {
  // Closing the slots modal from the title screen lands in battle with the
  // story intro showing; dismiss it before using the Settings menu.
  const startBattleBtn = page.getByRole('button', { name: /Start Battle/i });
  if (await startBattleBtn.isVisible()) {
    await startBattleBtn.click();
  }
}

test.describe('Save Slots modal (H2)', () => {
  test('copy onto an occupied slot asks for confirmation first', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open the modal once so the app creates the IndexedDB store, then seed
    // two occupied slots and reopen it via Settings (closing the modal from
    // the title screen lands in battle, so the title button is gone).
    await openSaveSlots(page);
    await page.getByRole('button', { name: /Close/i }).click();
    await expect(page.getByRole('heading', { name: /FILE SELECT/i })).not.toBeVisible();
    await dismissStoryIntro(page);
    await seedSlot(page, 'slot1');
    await seedSlot(page, 'slot2');
    await openSaveSlotsFromSettings(page);

    // Start a copy from File 1; File 2 becomes a paste target.
    await page.getByRole('button', { name: /Copy/i }).first().click();
    await expect(page.getByText(/Select a destination slot to copy from SLOT1/i)).toBeVisible();

    // Clicking the occupied File 2 row must ask before overwriting it.
    // (The confirm dialog opens synchronously inside the click handler, so
    // the handler is registered before the click; otherwise the click itself
    // would wait forever for the dialog to be answered.)
    const dialogMessagePromise = new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      page.once('dialog', async (dialog) => {
        clearTimeout(timer);
        const message = dialog.message();
        await dialog.accept();
        resolve(message);
      });
    });
    await page.getByText('File 2').click();
    const dialogMessage = await dialogMessagePromise;
    expect(dialogMessage).toMatch(/overwrite/i);
    await expect(page.getByText(/Successfully copied from SLOT1 to SLOT2/i)).toBeVisible();
  });

  test('delete reports the result and removes the slot', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await openSaveSlots(page);
    await page.getByRole('button', { name: /Close/i }).click();
    await expect(page.getByRole('heading', { name: /FILE SELECT/i })).not.toBeVisible();
    await dismissStoryIntro(page);
    await seedSlot(page, 'slot1');
    await openSaveSlotsFromSettings(page);

    const dialogMessagePromise = new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 5000);
      page.once('dialog', async (dialog) => {
        clearTimeout(timer);
        const message = dialog.message();
        await dialog.accept();
        resolve(message);
      });
    });
    await page.getByRole('button', { name: /Delete/i }).first().click();
    const dialogMessage = await dialogMessagePromise;
    expect(dialogMessage).toMatch(/delete/i);
    await expect(page.getByText(/Deleted save data in SLOT1/i)).toBeVisible();
    await expect(page.getByText(/Empty Slot/i).first()).toBeVisible();
  });
});
