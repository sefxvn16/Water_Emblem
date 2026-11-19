import { expect, test } from '@playwright/test';
import { expectPlayerPhase, openSettings } from './settingsMenu';

test.describe('Game Error Tolerance & Resilience Suite', () => {
  test('handles invalid rapid clicks and out-of-bounds selections gracefully', async ({ page }) => {
    test.setTimeout(90_000);
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) await resumeBtn.click();
    await page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i }).click();
    await openSettings(page);
    await page.getByRole('button', { name: /2D Grid/ }).click();

    // Select Marth at (24, 5) in Chapter 1
    const tile = (x: number, y: number) => page.getByText(`${x},${y}`, { exact: true });

    // Spam click on impassable sea tiles and out-of-bounds
    await tile(24, 5).dispatchEvent('click');
    for (let i = 0; i < 5; i++) {
      await tile(29, 0).dispatchEvent('click');
      await tile(0, 0).dispatchEvent('click');
    }

    // Deselect Marth by clicking him again
    await tile(24, 5).dispatchEvent('click');

    // Ensure no fatal page crashes or uncaught exceptions
    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toEqual([]);
    await openSettings(page);
    await expect(page.locator('text=Turn:').first()).toBeVisible();
    await expectPlayerPhase(page);
  });

  test('preserves audio mute state across page reload', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) await resumeBtn.click();
    await page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i }).click();

    // PLAN item 128: volume is a slider; dragging it to 0 mutes.
    await openSettings(page);
    const slider = page.getByLabel('Volume');
    await expect(slider).toBeVisible();
    await slider.fill('0');
    await expect(page.getByText('0%')).toBeVisible();

    // Check localStorage
    const isMutedInStorage = await page.evaluate(() => localStorage.getItem('we_sound_muted'));
    expect(isMutedInStorage).toBe('true');

    // Reload page
    await page.reload();
    const resumeAfterReload = page.getByRole('button', { name: /RESUME BATTLE/i });
    if (await resumeAfterReload.isVisible()) await resumeAfterReload.click();
    const startBtnAfterReload = page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i });
    if (await startBtnAfterReload.isVisible()) await startBtnAfterReload.click();

    // Should stay muted (slider at 0)
    await openSettings(page);
    await expect(page.getByLabel('Volume')).toHaveValue('0');

    // Raise the volume again to unmute
    await page.getByLabel('Volume').fill('50');
    await expect(page.getByText('50%')).toBeVisible();
    const isUnmutedInStorage = await page.evaluate(() => localStorage.getItem('we_sound_muted'));
    expect(isUnmutedInStorage).toBe('false');
  });

  test('recovers safely from a corrupted save file in IndexedDB without white screen', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) await resumeBtn.click();
    await page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i }).click();
    await openSettings(page);
    await expectPlayerPhase(page);

    // First save once to initialize the IndexedDB database & store
    await openSettings(page);
    await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
    await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible({ timeout: 10000 });

    // Now corrupt the save record in IndexedDB
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('water_emblem');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('saves', 'readwrite');
        const store = tx.objectStore('saves');
        // Overwrite with garbage object that does not conform to GameSnapshot
        store.put({ slot: 'main', corruptedField: 'invalid_data', turnNumber: 'NaN' });
        store.put({ slot: 'slot1', corruptedField: 'invalid_data', turnNumber: 'NaN' });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });

    let alertSeen = false;
    page.once('dialog', async (dialog) => {
      alertSeen = /(?:No valid save data found|Không tìm thấy dữ liệu lưu hợp lệ)/i.test(dialog.message());
      await dialog.accept();
    });

    // Attempt to load the corrupted save
    await openSettings(page);
    await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();

    // Dialog should report failure, app does not crash
    await expect.poll(() => alertSeen).toBe(true);
    await openSettings(page);
    await expectPlayerPhase(page);
    await expect(page.getByText(/Turn:\s*1/)).toBeVisible();
  });
});
