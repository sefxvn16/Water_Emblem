import { expect, test, type Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
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
  const view3dBtn = page.getByRole('button', { name: /3D View/i });
  if (await view3dBtn.isVisible()) {
    await view3dBtn.click();
  }
}


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
  await enterBattle(page);
  await expect(page.locator('[data-models-ready]')).toHaveAttribute('data-models-ready', 'true', { timeout: 15000 });
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => page.locator('canvas').getAttribute('data-fps')).not.toBeNull();
  const metrics = await page.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return ({
    fps: Number(canvas.dataset.fps),
    drawCalls: Number(canvas.dataset.drawCalls),
    triangles: Number(canvas.dataset.triangles),
    });
  });
  expect(metrics.fps).toBeGreaterThan(0);
  expect(metrics.drawCalls).toBeGreaterThan(0);
  expect(metrics.triangles).toBeGreaterThan(0);
  console.log('3D_METRICS', metrics);
  expect([...loaded].sort()).toEqual([
    '/models/buildings/Textures/colormap.png',
    '/models/buildings/castle.glb',
    '/models/buildings/fort.glb',
    '/models/buildings/gate.glb',
    '/models/characters/barbarian.glb',
    '/models/characters/knight.glb',
    '/models/characters/mage.glb',
    '/models/characters/ranger.glb',
    '/models/characters/rogue.glb',
    '/models/characters/skeleton.glb',
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
  await enterBattle(page);
  await expect(page.locator('[data-models-ready]')).toHaveAttribute('data-models-ready', 'true', { timeout: 15000 });
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
  await expect.poll(() => cameraDistance(page), { timeout: 15000 }).toBeLessThan(beforeZoom - 0.1);
  const firstZoom = await cameraDistance(page);
  await page.mouse.wheel(0, -80);
  await expect.poll(() => cameraDistance(page), { timeout: 15000 }).toBeLessThan(firstZoom - 0.1);
});

test('minimap follows selected tile and zoom controls are below it', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await expect(page.locator('[data-models-ready]')).toHaveAttribute('data-models-ready', 'true', { timeout: 15000 });
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const tile = await tilePoint(page, 25, 5, box!.width, box!.height);
  await page.mouse.click(box!.x + tile.x, box!.y + tile.y);
  await expect(page.getByRole('img', { name: /(?:Mini-map near tile|Bản đồ nhỏ quanh ô) 26, 6/i })).toBeVisible();
  const nextTile = await tilePoint(page, 26, 5, box!.width, box!.height);
  await page.mouse.click(box!.x + nextTile.x, box!.y + nextTile.y);
  await expect(page.getByRole('img', { name: /(?:Mini-map near tile|Bản đồ nhỏ quanh ô) 27, 6/i })).toBeVisible();

  const plus = page.getByRole('button', { name: /(?:Zoom In|Phóng to)/i });
  const minus = page.getByRole('button', { name: /(?:Zoom Out|Thu nhỏ)/i });
  const miniBox = await page.getByRole('img', { name: /(?:Mini-map near tile|Bản đồ nhỏ quanh ô)/i }).boundingBox();
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
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const clickTile = async (x: number, y: number) => {
    const point = await tilePoint(page, x, y, box!.width, box!.height);
    await page.mouse.click(box!.x + point.x, box!.y + point.y);
  };
  await clickTile(25, 5);
  await clickTile(26, 5);
  await expect(page.getByText(/(?:Actions|Lựa chọn hành động) \(Caeda\)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  await page.getByRole('button', { name: /(?:End Turn|Kết thúc lượt)/i }).click();
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:End Turn|Kết thúc lượt)/i }).click();
  await expect(page.getByText('Turn: 3')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText('Turn: 2')).toBeVisible();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
});

test('a carried Vulnerary heals once and promotion consumes a Master Seal', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
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
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const clickTile = async (x: number, y: number) => {
    const tile = await tilePoint(page, x, y, box!.width, box!.height);
    await page.mouse.click(box!.x + tile.x, box!.y + tile.y);
  };
  await clickTile(24, 5);
  await clickTile(24, 5);
  await expect(page.getByRole('button', { name: /(?:Use Vulnerary|Dùng thuốc hồi máu)/i })).toBeVisible();
  await page.getByRole('button', { name: /(?:Use Vulnerary|Dùng thuốc hồi máu)/i }).click();
  await expect(page.getByText(/Marth (?:used Vulnerary|dùng Thuốc hồi máu): HP 18\/18/i)).toBeVisible();
  await clickTile(23, 3);
  await clickTile(23, 3);
  await page.getByRole('button', { name: /(?:Promote: Sniper|Thăng cấp: Thiện xạ)/i }).click();
  await expect(page.getByText(/Gordin (?:promoted to Sniper|thăng cấp thành Thiện xạ)/i)).toBeVisible();
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
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const point = await tilePoint(page, 23, 4, box!.width, box!.height);
  const selectJagen = () => page.mouse.click(box!.x + point.x, box!.y + point.y);
  await selectJagen();
  await page.getByRole('button', { name: /(?:Dismount|Xuống ngựa)/i }).click();
  await expect(page.getByRole('button', { name: /(?:Mount|Lên ngựa)/i })).toBeVisible();
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:Mount|Lên ngựa)/i }).click();
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await selectJagen();
  await expect(page.getByRole('button', { name: /(?:Mount|Lên ngựa)/i })).toBeVisible();
});

test('Chapter 3 can save and reload its map and roster', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await dismissTitle(page);
  await page.locator('select').selectOption('chapter_03');
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);
  await page.getByRole('button', { name: /(?:Save Game|Lưu Game)/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await page.locator('select').selectOption('chapter_01');
  await enterBattle(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.locator('select')).toHaveValue('chapter_03');
});

test('enemy phase starts automatically after every player unit waits', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
  await expect(page.locator('canvas')).toBeVisible();
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const playerTiles = [[24, 5], [25, 5], [23, 4], [22, 7], [23, 7], [22, 3], [23, 3]] as const;
  for (const [x, y] of playerTiles) {
    const point = await tilePoint(page, x, y, box!.width, box!.height);
    await page.mouse.click(box!.x + point.x, box!.y + point.y);
    await page.mouse.click(box!.x + point.x, box!.y + point.y);
    await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  }
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
});

test('chapter two preparation keeps reserve units in the save', async ({ page }) => {
  await page.goto('/');
  await dismissTitle(page);
  await page.locator('select').selectOption('chapter_02');
  await expect(page.getByRole('heading', { name: /(?:Battle Preparation|Chuẩn bị xuất trận)/i })).toBeVisible();
  await page.getByRole('checkbox', { name: /Abel/ }).uncheck();
  await expect(page.getByText(/(?:Deployed: 10\/11|Đang chọn 10\/11)/i)).toBeVisible();
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);
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
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /(?:Battle Preparation|Chuẩn bị xuất trận)/i })).toHaveCount(0);
});

test('a valid near-victory save can seize the gate and carry HP to chapter two', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);
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
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: /(?:Zoom Out|Thu nhỏ)/i }).click();
  await expect.poll(async () => Math.abs((await cameraPose(page)).target[0] - 14.5)).toBeLessThan(0.05);
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const point = await tilePoint(page, 4, 4, box!.width, box!.height, 0.4);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
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
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByRole('heading', { name: /(?:GAME OVER|THẤT BẠI)/i })).toBeVisible();
  await page.getByRole('button', { name: /(?:Restart Chapter|Chơi lại từ đầu)/i }).click();
  await expect(page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i })).toBeVisible();
});

test('Caeda recruits Castor through a talk action and can save afterward', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await dismissTitle(page);
  await page.locator('select').selectOption('chapter_02');
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);
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
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  const box = await page.locator('canvas').boundingBox();
  expect(box).not.toBeNull();
  const point = await tilePoint(page, 5, 5, box!.width, box!.height);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.mouse.click(box!.x + point.x, box!.y + point.y);
  await page.getByRole('button', { name: /(?:Talk: Castor|Nói chuyện: Castor)/i }).click();
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
