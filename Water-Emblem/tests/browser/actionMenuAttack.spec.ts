// Action-menu Attack flow tests (PLAN items 77 + 80): the Attack button
// locks target selection to enemies in range, and picking a new destination
// closes a stale combat forecast (the attack-and-move bug). Runs on the 2D
// grid only, same helpers as uiRedesign.spec.ts.
import { expect, test, type Page } from '@playwright/test';
import { closeSettings, openSettings } from './settingsMenu';

const VW = 1366;
const VH = 768;
// Đường dẫn tương đối, không phải đường dẫn tuyệt đối của một máy cụ thể: `work/` đã gitignore.
const SHOTS = 'work/water-action-menu-80';

async function gotoBattle(page: Page) {
  await page.setViewportSize({ width: VW, height: VH });
  await page.goto('/');
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
  await page.getByTestId(`tile-${x}-${y}`).dispatchEvent('click');
}

/**
 * Save the current battle, move the given units in IndexedDB, and load back
 * (same technique as the forecast seed in uiRedesign.spec.ts). Position
 * patches pass save validation; the timestamp bump makes slot1 win the
 * slot1/main sync.
 */
async function seedPositions(page: Page, moves: Record<string, { x: number; y: number }>) {
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.evaluate(async (m) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('saves', 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.get('slot1');
      request.onsuccess = () => {
        const record = request.result as {
          extendedUnits: { unit: { id: string; position: { x: number; y: number } } }[];
        };
        for (const [id, pos] of Object.entries(m)) {
          const entry = record.extendedUnits.find(({ unit }) => unit.id === id)!;
          entry.unit.position = pos;
        }
        (record as unknown as { timestamp: number }).timestamp = Date.now() + 1000;
        store.put(record);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, moves);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible({ timeout: 15000 });
  await closeSettings(page);
}

/** Select Marth and confirm his own tile as the destination (menu opens). */
async function openMarthMenu(page: Page) {
  await clickTile(page, 24, 5);
  await clickTile(page, 24, 5);
  await expect(page.getByText('Actions (Marth)')).toBeVisible();
}

test('action-menu/80 picking a new destination closes the stale forecast', async ({ page }) => {
  await gotoBattle(page);
  await seedPositions(page, { enemy_pirate_5: { x: 24, y: 4 } });
  await openMarthMenu(page);
  // Red tile: pick target -> pick weapon -> forecast opens (PLAN item 158).
  await clickTile(page, 24, 4);
  const picker = page.locator('[data-testid="weapon-picker"]');
  if (await picker.isVisible()) {
    await picker.locator('button').first().click();
  }
  await expect(page.getByText(/COMBAT FORECAST/)).toBeVisible();
  // Pick a different destination instead of confirming: the stale forecast
  // must close (before the fix it stayed armed and Attack both attacked the
  // old target and moved the unit).
  await clickTile(page, 23, 5);
  await expect(page.getByText(/COMBAT FORECAST/)).toHaveCount(0);
  await expect(page.getByText('Actions (Marth)')).toBeVisible();
  // From (23,5) the pirate at (24,4) is out of Rapier range: no Attack.
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/bug-fixed.png` });
});

test('action-menu/80 Attack locks target selection to enemies in range', async ({ page }) => {
  await gotoBattle(page);
  await seedPositions(page, {
    enemy_pirate_5: { x: 24, y: 4 },
    enemy_thief: { x: 23, y: 5 },
  });
  await openMarthMenu(page);
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  // Target-lock: the menu hides; clicks outside the targets do nothing.
  await expect(page.getByText('Actions (Marth)')).toHaveCount(0);
  await clickTile(page, 22, 5);
  await expect(page.getByText(/COMBAT FORECAST/)).toHaveCount(0);
  await expect(page.getByText('Actions (Marth)')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/target-lock.png` });
  // Clicking the destination tile returns to the menu.
  await clickTile(page, 24, 5);
  await expect(page.getByText('Actions (Marth)')).toBeVisible();
  // Attack again, then pick a target: pick weapon if shown -> forecast opens.
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await clickTile(page, 24, 4);
  const picker = page.locator('[data-testid="weapon-picker"]');
  if (await picker.isVisible()) {
    await picker.locator('button').first().click();
  }
  await expect(page.getByText(/COMBAT FORECAST/)).toBeVisible();
  // Cancel the forecast (returns to picker if multiple weapons reach), close picker, and verify menu.
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  if (await picker.isVisible()) {
    await picker.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await expect(page.getByText('Actions (Marth)')).toBeVisible();
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await expect(page.getByText('Actions (Marth)')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Actions (Marth)')).toBeVisible();
});
