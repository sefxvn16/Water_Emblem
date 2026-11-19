import { expect, test, type Page } from '@playwright/test';
import { closeSettings, openSettings } from './settingsMenu';

async function dismissTitle(page: Page) {
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) {
    await resumeBtn.click();
  }
}

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
  // 2D is the default view (PLAN.md item 47) and the only tested view
  // (owner decision 2026-11-19: 3D tests dropped, 3D frozen until the port
  // phase). Wait for the 2D grid instead of the 3D canvas.
  await expect(page.getByTestId('tile-0-0')).toBeVisible({ timeout: 15000 });
}

// 2D tile clicks use the grid's data-testid, the same pattern as
// chapterReplay.spec.ts (dispatchEvent avoids overlay hit-testing).
async function clickTile(page: Page, x: number, y: number) {
  await page.getByTestId(`tile-${x}-${y}`).dispatchEvent('click');
}

test('move and wait, two turns, and IndexedDB save/load', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await openSettings(page);
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
  // The settings panel covers the action menu; close it before clicking tiles.
  await closeSettings(page);
  await clickTile(page, 25, 5);
  await clickTile(page, 26, 5);
  await expect(page.getByText(/(?:Actions|Lựa chọn hành động) \(Caeda\)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  await closeSettings(page);
  await page.getByRole('button', { name: /(?:End Turn|Kết thúc lượt)/i }).click();
  await openSettings(page);
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await closeSettings(page);
  await page.getByRole('button', { name: /(?:End Turn|Kết thúc lượt)/i }).click();
  await openSettings(page);
  await expect(page.getByText('Turn: 3')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await openSettings(page);
  await expect(page.getByText('Turn: 2')).toBeVisible();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
});

test('a carried Vulnerary heals once and promotion consumes a Master Seal', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('saves', 'readwrite');
      const request = transaction.objectStore('saves').get('main');
      request.onsuccess = () => {
        const record = request.result as {
          extendedUnits: { unit: { id: string }; stats: { hp: number }; level: number; inventory: { itemId: string; uses: number }[] }[];
        };
        const marth = record.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
        const gordin = record.extendedUnits.find(({ unit }) => unit.id === 'gordin')!;
        marth.stats.hp = 8;
        marth.inventory.push({ itemId: 'vulnerary', uses: 2 });
        gordin.level = 10;
        gordin.inventory.push({ itemId: 'master_seal', uses: 1 });
        (record as any).timestamp = Date.now() + 1000;
        transaction.objectStore('saves').put(record);
        transaction.objectStore('saves').put({ ...record, slot: 'slot1' });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  // Wait for the load to apply before clicking tiles (the save edit lands
  // asynchronously), and close the settings panel so it cannot cover the
  // action menu.
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await closeSettings(page);
  await clickTile(page, 24, 5);
  await clickTile(page, 24, 5);
  await expect(page.getByRole('button', { name: /(?:Use Vulnerary|Dùng thuốc hồi máu)/i })).toBeVisible();
  await page.getByRole('button', { name: /(?:Use Vulnerary|Dùng thuốc hồi máu)/i }).click();
  await openSettings(page);
  await expect(page.getByText(/Marth (?:used Vulnerary|dùng Thuốc hồi máu): HP 18\/18/i)).toBeVisible();
  await closeSettings(page);
  await clickTile(page, 23, 3);
  await clickTile(page, 23, 3);
  await page.getByRole('button', { name: /(?:Promote: Sniper|Thăng cấp: Thiện xạ)/i }).click();
  await openSettings(page);
  await expect(page.getByText(/Gordin (?:promoted to Sniper|thăng cấp thành Thiện xạ)/i)).toBeVisible();
  await closeSettings(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise<{ extendedUnits: { unit: { id: string; classId: string }; inventory: { itemId: string; uses: number }[] }[] }>((resolve, reject) => {
      const request = db.transaction('saves').objectStore('saves').get('main');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record.extendedUnits.filter(({ unit }) => unit.id === 'marth' || unit.id === 'gordin');
  });
  expect(saved.find(({ unit }) => unit.id === 'marth')?.inventory.find((item) => item.itemId === 'vulnerary')?.uses).toBe(1);
  expect(saved.find(({ unit }) => unit.id === 'gordin')?.unit.classId).toBe('sniper');
  expect(saved.find(({ unit }) => unit.id === 'gordin')?.inventory.some((item) => item.itemId === 'master_seal')).toBe(false);
});

test('Jagen can dismount voluntarily and reload that class state', async ({ page }) => {
  await page.goto('/');
  await enterBattle(page);
  const selectJagen = () => clickTile(page, 23, 4);
  await selectJagen();
  await page.getByRole('button', { name: /(?:Dismount|Xuống ngựa)/i }).click();
  await expect(page.getByRole('button', { name: /(?:Mount|Lên ngựa)/i })).toBeVisible();
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:Mount|Lên ngựa)/i }).click();
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await selectJagen();
  await expect(page.getByRole('button', { name: /(?:Mount|Lên ngựa)/i })).toBeVisible();
});

test('Chapter 3 can save and reload its map and roster', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await dismissTitle(page);
  await openSettings(page);
  await page.locator('select').selectOption('chapter_03');
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await openSettings(page);
  await page.locator('select').selectOption('chapter_01');
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  // Settings closes when the loaded chapter changes; reopen after the load finishes (PLAN.md item 73).
  await expect(page.getByText(/(?:Save file loaded|Đã tải)/i)).toBeVisible();
  await openSettings(page);
  await expect(page.locator('select')).toHaveValue('chapter_03');
});

test('enemy phase starts automatically after every player unit waits', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  const playerTiles = [[24, 5], [25, 5], [23, 4], [22, 7], [23, 7], [22, 3], [23, 3]] as const;
  for (const [x, y] of playerTiles) {
    await clickTile(page, x, y);
    await clickTile(page, x, y);
    await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  }
  await openSettings(page);
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
});

test('chapter two preparation keeps reserve units in the save', async ({ page }) => {
  await page.goto('/');
  await dismissTitle(page);
  await openSettings(page);
  await page.locator('select').selectOption('chapter_02');
  await expect(page.getByRole('heading', { name: /(?:Battle Preparation|Chuẩn bị xuất trận)/i })).toBeVisible();
  await page.getByRole('checkbox', { name: /Abel/ }).uncheck();
  await expect(page.getByText(/(?:Deployed: 10\/11|Đang chọn 10\/11)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise<boolean>((resolve, reject) => {
      const request = db.transaction('saves').objectStore('saves').get('main');
      request.onsuccess = () => resolve(request.result?.reserveUnits?.some(
        (entry: { unit: { id: string } }) => entry.unit.id === 'abel',
      ) === true);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return saved;
  })).toBe(true);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /(?:Battle Preparation|Chuẩn bị xuất trận)/i })).toHaveCount(0);
});

test('a valid near-victory save can seize the gate and carry HP to chapter two', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('saves', 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.get('main');
      request.onsuccess = () => {
        const record = request.result as {
          extendedUnits: { unit: { id: string; position: { x: number; y: number }; isDead: boolean }; stats: { hp: number } }[];
        };
        const marth = record.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
        const boss = record.extendedUnits.find(({ unit }) => unit.id === 'gazzak')!;
        marth.unit.position = { x: 4, y: 4 };
        marth.stats.hp = 7;
        boss.unit.isDead = true;
        boss.stats.hp = 0;
        (record as any).timestamp = Date.now() + 1000;
        store.put(record);
        store.put({ ...record, slot: 'slot1' });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  // Wait for the load to apply before clicking tiles, and close the settings
  // panel so it cannot cover the action menu.
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await closeSettings(page);
  await clickTile(page, 4, 4);
  await clickTile(page, 4, 4);
  await page.getByRole('button', { name: /(?:Seize|Chiếm cổng thành)/i }).click();
  await expect(page.getByRole('heading', { name: /(?:STAGE CLEAR|CHIẾN THẮNG)/i })).toBeVisible();
  await page.getByRole('button', { name: /(?:Advance to Chapter 2|Tiến quân sang Chương 2)/i }).click();
  await expect(page.getByRole('heading', { name: /(?:Battle Preparation|Chuẩn bị xuất trận)/i })).toBeVisible();
  await expect(page.getByText(/Marth — HP 7\/18/)).toBeVisible();
});

test('a valid defeated snapshot shows game over and can restart', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('saves', 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.get('main');
      request.onsuccess = () => {
        const record = request.result as {
          chapterOutcome: string;
          extendedUnits: { unit: { id: string; isDead: boolean }; stats: { hp: number } }[];
        };
        const marth = record.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
        marth.unit.isDead = true;
        marth.stats.hp = 0;
        record.chapterOutcome = 'defeat';
        (record as any).timestamp = Date.now() + 1000;
        store.put(record);
        store.put({ ...record, slot: 'slot1' });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByRole('heading', { name: /(?:GAME OVER|THẤT BẠI)/i })).toBeVisible();
  await page.getByRole('button', { name: /(?:Restart Chapter|Chơi lại từ đầu)/i }).click();
  await expect(page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i })).toBeVisible();
});

test('Caeda recruits Castor through a talk action and can save afterward', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await dismissTitle(page);
  await openSettings(page);
  await page.locator('select').selectOption('chapter_02');
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('saves', 'readwrite');
      const store = transaction.objectStore('saves');
      const request = store.get('main');
      request.onsuccess = () => {
        const record = request.result as { extendedUnits: { unit: { id: string; position: { x: number; y: number } } }[] };
        const caeda = record.extendedUnits.find(({ unit }) => unit.id === 'caeda')!;
        caeda.unit.position = { x: 5, y: 5 };
        (record as any).timestamp = Date.now() + 1000;
        store.put(record);
        store.put({ ...record, slot: 'slot1' });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  // Wait for the load to apply before clicking tiles, and close the settings
  // panel so it cannot cover the action menu.
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await closeSettings(page);
  await clickTile(page, 5, 5);
  await clickTile(page, 5, 5);
  await page.getByRole('button', { name: /(?:Talk: Castor|Nói chuyện: Castor)/i }).click();
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  const castorFaction = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('water_emblem');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const faction = await new Promise<string>((resolve, reject) => {
      const request = db.transaction('saves').objectStore('saves').get('main');
      request.onsuccess = () => {
        const record = request.result as { extendedUnits: { unit: { id: string; faction: string } }[] };
        resolve(record.extendedUnits.find(({ unit }) => unit.id === 'castor')!.unit.faction);
      };
      request.onerror = () => reject(request.error);
    });
    db.close();
    return faction;
  });
  expect(castorFaction).toBe('player');
});
