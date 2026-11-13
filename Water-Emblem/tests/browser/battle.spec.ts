import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

test('3D scene loads character and terrain models without browser errors', async ({ page }) => {
  const errors: string[] = [];
  const loaded = new Set<string>();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/models/')) {
      if (response.status() !== 200) errors.push(`${path}: ${response.status()}`);
      loaded.add(path);
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await expect(page.locator('[data-models-ready]')).toHaveAttribute('data-models-ready', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  expect([...loaded].sort()).toEqual([
    '/models/characters/barbarian.glb',
    '/models/characters/knight.glb',
    '/models/characters/mage.glb',
    '/models/characters/ranger.glb',
    '/models/nature/PineTree_1.mtl',
    '/models/nature/PineTree_1.obj',
    '/models/nature/Rock_1.mtl',
    '/models/nature/Rock_1.obj',
  ].sort());
  expect(errors).toEqual([]);
});

test('left drag pans, right drag rotates, and wheel zooms continuously', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await expect(page.locator('[data-models-ready]')).toHaveAttribute('data-models-ready', 'true');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  const initial = await canvas.screenshot();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 35, y + 15, { steps: 5 });
  await page.mouse.up();
  const pannedOnce = await canvas.screenshot();
  expect(pannedOnce.equals(initial)).toBe(false);

  await page.mouse.down();
  await page.mouse.move(x + 70, y + 30, { steps: 5 });
  await page.mouse.up();
  const pannedTwice = await canvas.screenshot();
  expect(pannedTwice.equals(pannedOnce)).toBe(false);

  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 95, y + 30, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  const rotatedOnce = await canvas.screenshot();
  expect(rotatedOnce.equals(pannedTwice)).toBe(false);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + 120, y + 35, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  const rotatedTwice = await canvas.screenshot();
  expect(rotatedTwice.equals(rotatedOnce)).toBe(false);

  const beforeZoom = await cameraDistance(page);
  await page.mouse.wheel(0, -80);
  await expect.poll(() => cameraDistance(page)).toBeLessThan(beforeZoom - 0.1);
  const firstZoom = await cameraDistance(page);
  await page.mouse.wheel(0, -80);
  await expect.poll(() => cameraDistance(page)).toBeLessThan(firstZoom - 0.1);
});

test('minimap follows selected tile and zoom controls are below it', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await expect(page.locator('[data-models-ready]')).toHaveAttribute('data-models-ready', 'true');
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const tile = await tilePoint(page, 25, 8, box!.width, box!.height);
  await page.mouse.click(box!.x + tile.x, box!.y + tile.y);
  await expect(page.getByRole('img', { name: 'Bản đồ nhỏ quanh ô 26, 9' })).toBeVisible();
  const nextTile = await tilePoint(page, 25, 9, box!.width, box!.height);
  await page.mouse.click(box!.x + nextTile.x, box!.y + nextTile.y);
  await expect(page.getByRole('img', { name: 'Bản đồ nhỏ quanh ô 26, 10' })).toBeVisible();

  const plus = page.getByRole('button', { name: 'Phóng to' });
  const minus = page.getByRole('button', { name: 'Thu nhỏ' });
  const miniBox = await page.getByRole('img', { name: /Bản đồ nhỏ quanh ô/ }).boundingBox();
  const plusBox = await plus.boundingBox();
  expect(miniBox && plusBox && plusBox.y >= miniBox.y + miniBox.height).toBe(true);

  for (let i = 0; i < 8; i++) await minus.click();
  await expect.poll(async () => Math.abs((await cameraPose(page)).target[0] - 14.5)).toBeLessThan(0.2);
  await canvas.screenshot({ path: 'test-results/overview-map.png' });
  const farDistance = await cameraDistance(page);
  await plus.click();
  await expect.poll(() => cameraDistance(page)).toBeLessThan(farDistance - 0.1);
  const firstZoom = await cameraDistance(page);
  await plus.click();
  await expect.poll(() => cameraDistance(page)).toBeLessThan(firstZoom - 0.1);

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const beforeWheel = await cameraDistance(page);
  await page.mouse.wheel(0, 80);
  await expect.poll(() => cameraDistance(page)).toBeGreaterThan(beforeWheel + 0.1);
});

async function cameraPose(page: Page): Promise<{ position: [number, number, number]; target: [number, number, number] }> {
  return page.locator('canvas').evaluate((canvas) => ({
    position: canvas.dataset.cameraPosition!.split(',').map(Number) as [number, number, number],
    target: canvas.dataset.cameraTarget!.split(',').map(Number) as [number, number, number],
  }));
}

async function cameraDistance(page: Page): Promise<number> {
  const { position, target } = await cameraPose(page);
  return new Vector3(position[0], position[1], position[2]).distanceTo(new Vector3(target[0], target[1], target[2]));
}

async function tilePoint(page: Page, x: number, y: number, width: number, height: number, surfaceY = -0.2) {
  const pose = await cameraPose(page);
  const camera = new PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
  camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  camera.updateMatrixWorld();
  const point = new Vector3(x, surfaceY, y).project(camera);
  return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
}

test('3D move and wait, two turns, and IndexedDB save/load', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const clickTile = async (x: number, y: number) => {
    const point = await tilePoint(page, x, y, box!.width, box!.height);
    await page.mouse.click(box!.x + point.x, box!.y + point.y);
  };
  await clickTile(25, 8);
  await clickTile(25, 7);
  await expect(page.getByText('Lựa chọn hành động (Caeda)')).toBeVisible();
  await page.getByRole('button', { name: /Chờ \(Wait\)/ }).click();
  await page.getByRole('button', { name: /Kết thúc lượt/ }).click();
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Lưu Game/ }).click();
  await expect(page.getByText(/Đã lưu tiến độ/)).toBeVisible();
  await page.getByRole('button', { name: /Kết thúc lượt/ }).click();
  await expect(page.getByText('Turn: 3')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Nạp Game/ }).click();
  await expect(page.getByText('Turn: 2')).toBeVisible();
  await expect(page.getByText(/Đã nạp lại tiến độ/)).toBeVisible();
});

test('enemy phase starts automatically after every player unit waits', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const playerTiles = [[25, 9], [24, 9], [25, 8], [24, 8], [26, 9], [25, 10], [26, 8]] as const;
  for (const [x, y] of playerTiles) {
    const point = await tilePoint(page, x, y, box!.width, box!.height);
    await page.mouse.click(box!.x + point.x, box!.y + point.y);
    await page.mouse.click(box!.x + point.x, box!.y + point.y);
    await page.getByRole('button', { name: /Chờ \(Wait\)/ }).click();
  }
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
});

test('chapter two preparation keeps reserve units in the save', async ({ page }) => {
  await page.goto('/');
  await page.locator('select').selectOption('chapter_02');
  await expect(page.getByRole('heading', { name: /Chuẩn bị xuất trận/ })).toBeVisible();
  await page.getByRole('checkbox', { name: /Abel/ }).uncheck();
  await expect(page.getByText('Đang chọn 10/11')).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu chương' }).click();
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await page.getByRole('button', { name: /Lưu Game/ }).click();
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
  await page.getByRole('button', { name: /Nạp Game/ }).click();
  await expect(page.getByText(/Đã nạp lại tiến độ/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Chuẩn bị xuất trận/ })).toHaveCount(0);
});

test('a valid near-victory save can seize the gate and carry HP to chapter two', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await page.getByRole('button', { name: /Lưu Game/ }).click();
  await expect(page.getByText(/Đã lưu tiến độ/)).toBeVisible();
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
        marth.unit.position = { x: 3, y: 9 };
        marth.stats.hp = 7;
        boss.unit.isDead = true;
        boss.stats.hp = 0;
        store.put(record);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.getByRole('button', { name: /Nạp Game/ }).click();
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Thu nhỏ' }).click();
  await expect.poll(async () => Math.abs((await cameraPose(page)).target[0] - 14.5)).toBeLessThan(0.05);
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const point = await tilePoint(page, 3, 9, box!.width, box!.height, 0.4);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.getByRole('button', { name: /Chiếm cổng thành/ }).click();
  await expect(page.getByRole('heading', { name: /CHIẾN THẮNG/ })).toBeVisible();
  await page.getByRole('button', { name: /Tiến quân sang Chương 2/ }).click();
  await expect(page.getByRole('heading', { name: /Chuẩn bị xuất trận/ })).toBeVisible();
  await expect(page.getByText(/Marth — HP 7\/18/)).toBeVisible();
});

test('a valid defeated snapshot shows game over and can restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await page.getByRole('button', { name: /Lưu Game/ }).click();
  await expect(page.getByText(/Đã lưu tiến độ/)).toBeVisible();
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
        store.put(record);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.getByRole('button', { name: /Nạp Game/ }).click();
  await expect(page.getByRole('heading', { name: /THẤT BẠI/ })).toBeVisible();
  await page.getByRole('button', { name: /Chơi lại từ đầu/ }).click();
  await expect(page.getByRole('button', { name: /Vào trận đánh/ })).toBeVisible();
});

test('Caeda recruits Castor through a talk action and can save afterward', async ({ page }) => {
  await page.goto('/');
  await page.locator('select').selectOption('chapter_02');
  await page.getByRole('button', { name: 'Bắt đầu chương' }).click();
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await page.getByRole('button', { name: /Lưu Game/ }).click();
  await expect(page.getByText(/Đã lưu tiến độ/)).toBeVisible();
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
        caeda.unit.position = { x: 11, y: 6 };
        store.put(record);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.getByRole('button', { name: /Nạp Game/ }).click();
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const point = await tilePoint(page, 11, 6, box!.width, box!.height);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.getByRole('button', { name: /Nói chuyện: Castor/ }).click();
  await page.getByRole('button', { name: /Lưu Game/ }).click();
  await expect(page.getByText(/Đã lưu tiến độ/)).toBeVisible();
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
