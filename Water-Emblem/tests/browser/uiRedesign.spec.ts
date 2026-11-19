// UI redesign acceptance tests (PLAN item 76, specs/design-system.md,
// specs/hud-basic-info.md, specs/unit-inspector.md,
// specs/combat-forecast-ui.md, specs/settings-menu.md).
// Runs on the 2D grid only, same tile-click pattern as chapterReplay.spec.ts.
import { expect, test, type Page } from '@playwright/test';
import { closeSettings, openSettings } from './settingsMenu';
import { readFileSync } from 'node:fs';

const CHARACTERS = JSON.parse(readFileSync('data/characters.json', 'utf8')) as {
  characters: { id: string; name: string; classId: string; level: number; baseStats: Record<string, number> }[];
};
const CLASSES = JSON.parse(readFileSync('data/classes.json', 'utf8')) as {
  classes: { id: string; name: string }[];
};

const VW = 1366;
const VH = 768;

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

async function tileBox(page: Page, x: number, y: number) {
  const box = await page.getByTestId(`tile-${x}-${y}`).boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

type Rect = { left: number; right: number; top: number; bottom: number };

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function scrollMap(page: Page, dx: number, dy: number) {
  await page.evaluate(({ dx, dy }) => {
    const tile = document.querySelector('[data-testid="tile-0-0"]');
    let el: HTMLElement | null = tile as HTMLElement | null;
    while (el) {
      if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) {
        el.scrollLeft += dx;
        el.scrollTop += dy;
        return;
      }
      el = el.parentElement;
    }
  }, { dx, dy });
}

/** Scroll the map until the tile's centre is at the given fraction of the viewport width. */
async function centerTileAt(page: Page, x: number, y: number, fracX: number) {
  for (let i = 0; i < 3; i++) {
    const box = await tileBox(page, x, y);
    const centerX = (box.x + box.width / 2) / VW;
    // Screen x = map offset - scrollLeft, so moving the tile right on screen
    // means decreasing scrollLeft by the same amount.
    const delta = (centerX - fracX) * VW;
    if (Math.abs(delta) < 5) break;
    await scrollMap(page, delta, 0);
  }
}

async function computedStyles(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((el) => {
    const cs = getComputedStyle(el);
    return { backgroundColor: cs.backgroundColor, borderColor: cs.borderColor, color: cs.color };
  });
}

function luminance(rgb: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r = 0, g = 0, b = 0] = rgb.map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const parse = (s: string): [number, number, number] => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
  };
  const l1 = luminance(parse(fg));
  const l2 = luminance(parse(bg));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Seed Marth at (4,4) via IndexedDB, load, and open the forecast on Gazzak. */
async function openForecast(page: Page) {
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
          extendedUnits: { unit: { id: string; position: { x: number; y: number } } }[];
        };
        const marth = record.extendedUnits.find(({ unit }) => unit.id === 'marth')!;
        marth.unit.position = { x: 4, y: 4 };
        (record as unknown as { timestamp: number }).timestamp = Date.now() + 1000;
        store.put(record);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await openSettings(page);
  await page.getByRole('button', { name: /(?:Load Game|Nạp Game)/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await closeSettings(page);
  await clickTile(page, 4, 4);
  await clickTile(page, 5, 4);
  await clickTile(page, 6, 4);
  await expect(page.getByTestId('forecast-window')).toBeVisible({ timeout: 10000 });
}

async function openInspector(page: Page, x: number, y: number) {
  await clickTile(page, x, y);
  await page.getByRole('button', { name: 'Details ℹ️' }).click();
  await expect(page.getByTestId('inspector')).toBeVisible();
}

test('design-system/A1 shared panel treatment', async ({ page }) => {
  await gotoBattle(page);
  // Hover banner + terrain window.
  await page.getByTestId('tile-24-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-24-5').hover();
  await expect(page.getByTestId('hover-banner')).toBeVisible();
  expect(await computedStyles(page, 'hover-banner')).toEqual({
    backgroundColor: 'rgb(12, 30, 91)',
    borderColor: 'rgb(234, 179, 8)',
    color: 'rgb(255, 255, 255)',
  });
  await page.getByTestId('tile-10-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-10-5').hover();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('terrain-window')).toBeVisible();
  expect(await computedStyles(page, 'terrain-window')).toEqual({
    backgroundColor: 'rgb(12, 30, 91)',
    borderColor: 'rgb(234, 179, 8)',
    color: 'rgb(255, 255, 255)',
  });
  // Inspector (player) and (enemy): faction-tinted panels (treatment B).
  await openInspector(page, 24, 5);
  expect(await computedStyles(page, 'inspector')).toEqual({
    backgroundColor: 'rgb(16, 26, 46)',
    borderColor: 'rgb(201, 162, 39)',
    color: 'rgb(248, 250, 252)',
  });
  expect(await page.getByTestId('inspector-accent').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(59, 130, 246)');
  await page.getByRole('button', { name: 'Close unit details' }).click();
  await openInspector(page, 6, 4);
  expect(await computedStyles(page, 'inspector')).toEqual({
    backgroundColor: 'rgb(43, 23, 25)',
    borderColor: 'rgb(201, 162, 39)',
    color: 'rgb(248, 250, 252)',
  });
  expect(await page.getByTestId('inspector-accent').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(239, 68, 68)');
  await page.getByRole('button', { name: 'Close unit details' }).click();
  // Settings menu.
  await openSettings(page);
  await expect(page.getByTestId('settings-menu')).toBeVisible();
  expect(await computedStyles(page, 'settings-menu')).toEqual({
    backgroundColor: 'rgb(12, 30, 91)',
    borderColor: 'rgb(234, 179, 8)',
    color: 'rgb(255, 255, 255)',
  });
  await closeSettings(page);
  // Forecast.
  await openForecast(page);
  expect(await computedStyles(page, 'forecast-window')).toEqual({
    backgroundColor: 'rgb(12, 30, 91)',
    borderColor: 'rgb(234, 179, 8)',
    color: 'rgb(255, 255, 255)',
  });
});

test('design-system/A2 one primary action per decision point', async ({ page }) => {
  await gotoBattle(page);
  // Settings: exactly one primary action in the whole menu (Save Game).
  await openSettings(page);
  const primaryCount = await page.getByTestId('settings-menu').evaluate((menu) => {
    let count = 0;
    for (const button of menu.querySelectorAll('button')) {
      if (getComputedStyle(button).backgroundColor === 'rgb(234, 179, 8)') count++;
    }
    return count;
  });
  expect(primaryCount).toBe(1);
  const saveBg = await page.getByRole('button', { name: /Save Game/i }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(saveBg).toBe('rgb(234, 179, 8)');
  await closeSettings(page);
  // Inspector: Close is the single action and uses the ghost treatment
  // (zero gold primaries, per R10).
  await openInspector(page, 24, 5);
  const closeBg = await page.getByRole('button', { name: 'Close unit details' }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(closeBg).toBe('rgba(0, 0, 0, 0)');
  const inspectorButtons = await page.getByTestId('inspector').locator('button').count();
  expect(inspectorButtons).toBe(1);
  await page.getByRole('button', { name: 'Close unit details' }).click();
  // Forecast: Attack primary (gold), Cancel secondary.
  await openForecast(page);
  const attackBg = await page.getByRole('button', { name: '⚔️ Attack!' }).evaluate((el) => getComputedStyle(el).backgroundColor);
  const cancelBg = await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(attackBg).toBe('rgb(234, 179, 8)');
  expect(cancelBg).toBe('rgb(30, 41, 59)');
});

test('design-system/A3 controls meet 44px target', async ({ page }) => {
  await gotoBattle(page);
  // Gear.
  const gear = await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox();
  expect(gear!.width).toBeGreaterThanOrEqual(44);
  expect(gear!.height).toBeGreaterThanOrEqual(44);
  // Hover Details button.
  await page.getByTestId('tile-24-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-24-5').hover();
  const details = await page.getByRole('button', { name: 'Details ℹ️' }).boundingBox();
  expect(details!.width).toBeGreaterThanOrEqual(44);
  expect(details!.height).toBeGreaterThanOrEqual(44);
  // Inspector Close.
  await page.getByRole('button', { name: 'Details ℹ️' }).click();
  const closeBtn = await page.getByRole('button', { name: 'Close unit details' }).boundingBox();
  expect(closeBtn!.width).toBeGreaterThanOrEqual(44);
  expect(closeBtn!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Close unit details' }).click();
  // Forecast buttons.
  await openForecast(page);
  for (const name of ['⚔️ Attack!', 'Cancel']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  // Settings menu controls.
  await openSettings(page);
  const menuButtons = await page.getByTestId('settings-menu').getByRole('button').all();
  expect(menuButtons.length).toBeGreaterThan(0);
  for (const button of menuButtons) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const selectBox = await page.getByTestId('settings-menu').locator('select').boundingBox();
  expect(selectBox!.height).toBeGreaterThanOrEqual(44);
});

test('design-system/A6 panel text contrast', async ({ page }) => {
  await gotoBattle(page);
  // Hover banner body text on navy.
  await page.getByTestId('tile-24-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-24-5').hover();
  const banner = await computedStyles(page, 'hover-banner');
  expect(contrastRatio(banner.color, banner.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  // Inspector body text on both faction backgrounds.
  await openInspector(page, 24, 5);
  const ally = await computedStyles(page, 'inspector');
  expect(contrastRatio(ally.color, ally.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Close unit details' }).click();
  await openInspector(page, 6, 4);
  const enemy = await computedStyles(page, 'inspector');
  expect(contrastRatio(enemy.color, enemy.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Close unit details' }).click();
  // Settings menu body text on navy.
  await openSettings(page);
  const menu = await computedStyles(page, 'settings-menu');
  expect(contrastRatio(menu.color, menu.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  // Forecast body text on navy.
  await closeSettings(page);
  await openForecast(page);
  const forecast = await computedStyles(page, 'forecast-window');
  expect(contrastRatio(forecast.color, forecast.backgroundColor)).toBeGreaterThanOrEqual(4.5);
});

test('design-system/A7 html lang matches UI language', async ({ page }) => {
  await page.goto('/');
  const lang = await page.evaluate(() => document.documentElement.lang);
  expect(lang).toBe('en');
});

test('hud-basic-info/A1 hover and terrain content', async ({ page }) => {
  await gotoBattle(page);
  await page.getByTestId('tile-24-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-24-5').hover();
  const banner = page.getByTestId('hover-banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByText('Marth', { exact: true })).toBeVisible();
  await expect(banner.getByText('HP 18 / 18')).toBeVisible();
  await expect(banner.getByText('Lord')).toBeVisible();
  await expect(banner.getByText('Rapier', { exact: true })).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Details ℹ️' })).toBeVisible();
  await page.getByTestId('tile-10-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-10-5').hover();
  await page.waitForTimeout(800);
  const terrain = page.getByTestId('terrain-window');
  await expect(terrain).toBeVisible();
  await expect(terrain.getByText(/Avoid : \d+%/)).toBeVisible();
});

test('hud-basic-info/A2 banner tracks tile on scroll', async ({ page }) => {
  await gotoBattle(page);
  // Marth starts at (24,5), too close to the map's right edge to scroll across
  // the viewport middle at 1366px (max scrollLeft 712 leaves his centre at
  // x=916); move him to (19,5) first so the flip is reachable.
  await clickTile(page, 24, 5);
  await clickTile(page, 19, 5);
  await expect(page.getByText(/Actions \(Marth\)/i)).toBeVisible();
  await page.getByRole('button', { name: /Wait/i }).click();
  await expect(page.getByText(/Actions \(Marth\)/i)).toHaveCount(0);
  await page.waitForTimeout(2000); // let the move animation finish
  // Pin Marth so the banner stays on him while the map scrolls underneath.
  await clickTile(page, 19, 5);
  await centerTileAt(page, 19, 5, 0.65);
  const banner = page.getByTestId('hover-banner');
  await expect(banner).toBeVisible();
  const before = await banner.boundingBox();
  expect(before!.x).toBeLessThan(VW / 2);
  // Scroll the map so Marth's tile crosses the viewport middle.
  await scrollMap(page, 500, 0);
  await expect.poll(async () => {
    const box = await banner.boundingBox();
    return box ? box.x : -1;
  }).toBeGreaterThan(VW / 2);
});

test('hud-basic-info/A3 Details is the only click target', async ({ page }) => {
  await gotoBattle(page);
  await page.getByTestId('tile-24-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-24-5').hover();
  const banner = page.getByTestId('hover-banner');
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('button')).toHaveCount(1);
  const details = await banner.getByRole('button', { name: 'Details ℹ️' }).boundingBox();
  expect(details!.height).toBeGreaterThanOrEqual(44);
  // The banner container itself is not a button.
  expect(await banner.evaluate((el) => el.getAttribute('role'))).toBeNull();
});

test('hud-basic-info/A4 pinned beats hovered beats selected', async ({ page }) => {
  await gotoBattle(page);
  const banner = page.getByTestId('hover-banner');
  // Pin Caeda; hovering Marth must not switch the banner.
  await clickTile(page, 25, 5);
  await expect(banner.getByText('Caeda', { exact: true })).toBeVisible();
  await page.getByTestId('tile-24-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-24-5').hover();
  await expect(banner.getByText('Caeda', { exact: true })).toBeVisible();
  // Click an empty tile to unpin; move the mouse away first, then hover Marth
  // again — the empty-tile click clears the hover summary, and hovering a tile
  // the cursor already sits on fires no new hover event.
  await clickTile(page, 10, 5);
  await page.getByTestId('tile-12-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-12-5').hover();
  await page.getByTestId('tile-24-5').hover();
  await expect(banner.getByText('Marth', { exact: true })).toBeVisible();
  // Move the cursor to an empty tile: no pinned/hovered/selected unit, so the
  // banner hides instead of showing a stale unit (see DESIGN.md "Unconfirmed").
  await page.getByTestId('tile-12-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-12-5').hover();
  await expect(banner).toHaveCount(0);
});

test('hud-basic-info/A5 empty tile shows terrain only', async ({ page }) => {
  await gotoBattle(page);
  await page.getByTestId('tile-10-5').scrollIntoViewIfNeeded();
  await page.getByTestId('tile-10-5').hover();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('terrain-window')).toBeVisible();
  await expect(page.getByTestId('hover-banner')).toHaveCount(0);
});

test('hud-basic-info/A6 banner clears HUD cluster and selected tile', async ({ page }) => {
  await gotoBattle(page);
  await clickTile(page, 24, 5);
  const banner = page.getByTestId('hover-banner');
  await expect(banner).toBeVisible();
  const bannerBox = await banner.boundingBox();
  const tile = await tileBox(page, 24, 5);
  expect(overlaps(
    { left: bannerBox!.x, right: bannerBox!.x + bannerBox!.width, top: bannerBox!.y, bottom: bannerBox!.y + bannerBox!.height },
    { left: tile.x, right: tile.x + tile.width, top: tile.y, bottom: tile.y + tile.height },
  )).toBe(false);
  const gear = await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox();
  const endTurn = await page.getByRole('button', { name: /End Turn/i }).boundingBox();
  for (const control of [gear, endTurn]) {
    expect(overlaps(
      { left: bannerBox!.x, right: bannerBox!.x + bannerBox!.width, top: bannerBox!.y, bottom: bannerBox!.y + bannerBox!.height },
      { left: control!.x, right: control!.x + control!.width, top: control!.y, bottom: control!.y + control!.height },
    )).toBe(false);
  }
});

test('unit-inspector/A1 content matches chapter data', async ({ page }) => {
  await gotoBattle(page);
  await openInspector(page, 24, 5);
  const marth = CHARACTERS.characters.find((c) => c.id === 'marth')!;
  const className = CLASSES.classes.find((c) => c.id === marth.classId)!.name;
  const text = await page.getByTestId('inspector').textContent();
  expect(text).toContain('Marth');
  expect(text).toContain(className);
  expect(text).toContain(`LV ${marth.level}`);
  expect(text).toContain(`HP ${marth.baseStats.hp} / ${marth.baseStats.hp}`);
  expect(text).toContain('Rapier');
  for (const [label, key] of [['Str', 'str'], ['Skl', 'skill'], ['Spd', 'spd'], ['Lck', 'lck'], ['Mag', 'mag'], ['Def', 'def'], ['Res', 'res']] as const) {
    expect(text).toMatch(new RegExp(`${label}:\\s*${marth.baseStats[key]}`));
  }
});

test('unit-inspector/A3 close paths and target size', async ({ page }) => {
  await gotoBattle(page);
  await openInspector(page, 24, 5);
  const closeBtn = await page.getByRole('button', { name: 'Close unit details' }).boundingBox();
  expect(closeBtn!.width).toBeGreaterThanOrEqual(44);
  expect(closeBtn!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Close unit details' }).click();
  await expect(page.getByTestId('inspector')).toHaveCount(0);
  // Outside click closes.
  await openInspector(page, 24, 5);
  await page.mouse.click(100, 100);
  await expect(page.getByTestId('inspector')).toHaveCount(0);
  // Escape closes.
  await openInspector(page, 24, 5);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('inspector')).toHaveCount(0);
});

test('unit-inspector/A4 values share one right-aligned column per column/box', async ({ page }) => {
  await gotoBattle(page);
  await openInspector(page, 24, 5);
  // J2 layout: the Combat column, the Attributes column, and the Vitals box
  // each carry their own right-aligned value column. For each group, every
  // value shares the group's right edge (within 2px).
  const groups = await page.getByTestId('inspector').evaluate((inspector) => {
    const testIds = ['inspector-col-combat', 'inspector-col-attributes', 'inspector-box-vitals'];
    return testIds.map((testId) => {
      const container = inspector.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
      if (!container) return { testId, containerRight: -1, strongRights: [] as number[] };
      return {
        testId,
        containerRight: container.getBoundingClientRect().right,
        strongRights: [...container.querySelectorAll('strong')].map((el) => el.getBoundingClientRect().right),
      };
    });
  });
  expect(groups).toHaveLength(3);
  for (const group of groups) {
    expect(group.strongRights.length).toBeGreaterThan(0);
    expect(Math.max(...group.strongRights) - Math.min(...group.strongRights)).toBeLessThanOrEqual(2);
    for (const right of group.strongRights) {
      expect(Math.abs(group.containerRight - right)).toBeLessThanOrEqual(2);
    }
  }
});

test('unit-inspector/A5 longest unit name fits', async ({ page }) => {
  await gotoBattle(page);
  const longest = CHARACTERS.characters.map((c) => c.name).sort((a, b) => b.length - a.length)[0];
  expect(longest).toBe('Galder Pirate (Lv 3)');
  if (longest === undefined) throw new Error('characters.json has no characters');
  await openInspector(page, 4, 1);
  const inspector = page.getByTestId('inspector');
  await expect(inspector.getByText(longest, { exact: true })).toBeVisible();
  const overflow = await inspector.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Close unit details' })).toBeVisible();
});

test('unit-inspector/A6 empty items state keeps its place', async ({ page }) => {
  await gotoBattle(page);
  await openInspector(page, 24, 5);
  const inspector = page.getByTestId('inspector');
  // J2 empty state: four dashed slots, each "—".
  const slots = inspector.getByTestId('inspector-items').locator(':scope > div');
  await expect(slots).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(slots.nth(i)).toHaveText('—');
    const borderStyle = await slots.nth(i).evaluate((el) => getComputedStyle(el).borderStyle);
    expect(borderStyle).toBe('dashed');
  }
  await expect(inspector.getByText('Max HP:')).toBeVisible();
  await expect(inspector.getByText('Move:')).toBeVisible();
});

test('combat-forecast-ui/A2 Attack is the only primary action', async ({ page }) => {
  await gotoBattle(page);
  await openForecast(page);
  const attackBg = await page.getByRole('button', { name: '⚔️ Attack!' }).evaluate((el) => getComputedStyle(el).backgroundColor);
  const cancelBg = await page.getByRole('button', { name: 'Cancel', exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(attackBg).toBe('rgb(234, 179, 8)');
  expect(attackBg).not.toBe('rgb(220, 38, 38)');
  expect(cancelBg).toBe('rgb(30, 41, 59)');
  await expect(page.getByTestId('forecast-window')).toBeVisible();
  await page.screenshot({ path: '/home/hatch/workspace/water-emblem/repo/work/water-ui-redesign/after/05-forecast.png' });
});

test('combat-forecast-ui/A5 forecast clears attacker and defender tiles on scroll and resize', async ({ page }) => {
  await gotoBattle(page);
  await openForecast(page);
  const forecast = page.getByTestId('forecast-window');
  const assertClear = async () => {
    const forecastBox = await forecast.boundingBox();
    const attacker = await tileBox(page, 5, 4);
    const defender = await tileBox(page, 6, 4);
    for (const tile of [attacker, defender]) {
      expect(overlaps(
        { left: forecastBox!.x, right: forecastBox!.x + forecastBox!.width, top: forecastBox!.y, bottom: forecastBox!.y + forecastBox!.height },
        { left: tile.x, right: tile.x + tile.width, top: tile.y, bottom: tile.y + tile.height },
      )).toBe(false);
    }
  };
  await assertClear();
  await scrollMap(page, 200, 0);
  await page.waitForTimeout(300);
  await assertClear();
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.waitForTimeout(300);
  await assertClear();
});

test('combat-forecast-ui/A6 no forecast data shows no window', async ({ page }) => {
  await gotoBattle(page);
  await expect(page.getByTestId('forecast-window')).toHaveCount(0);
});

test('settings-menu/A2 menu opens upward and auto-closes', async ({ page }) => {
  await gotoBattle(page);
  await openSettings(page);
  const menu = page.getByTestId('settings-menu');
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  const gearBox = await page.getByRole('button', { name: 'Settings', exact: true }).boundingBox();
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(gearBox!.y);
  // Chapter change closes the menu.
  await page.getByTestId('settings-menu').locator('select').selectOption('chapter_02');
  await expect(menu).toHaveCount(0);
  // The chapter change opens Battle Preparation; start chapter 2 and dismiss
  // its story intro, then reopen the menu and open another screen.
  await page.getByRole('button', { name: 'Start Chapter' }).click();
  const startBattle = page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i });
  if (await startBattle.isVisible()) {
    await startBattle.click();
  }
  await expect(page.getByTestId('tile-0-0')).toBeVisible({ timeout: 15000 });
  await openSettings(page);
  await expect(menu).toBeVisible();
  await page.getByRole('button', { name: /World Map/i }).click();
  await expect(page.getByRole('heading', { name: /CONTINENT OF ARCHANEA/i })).toBeVisible();
  await expect(menu).toHaveCount(0);
});

test('settings-menu/A3 nav actions grouped under one heading', async ({ page }) => {
  await gotoBattle(page);
  await openSettings(page);
  const menu = page.getByTestId('settings-menu');
  await expect(menu.getByRole('heading', { name: 'Navigation', exact: true })).toBeVisible();
  const backgrounds = await menu.evaluate((el) => {
    const out: Record<string, string> = {};
    for (const button of el.querySelectorAll('button')) {
      const name = button.textContent?.trim() ?? '';
      if (['🏰 Title', '🗺️ World Map', '📁 Save Files', '💾 Save Game', '📂 Load Game'].includes(name)) {
        out[name] = getComputedStyle(button).backgroundColor;
      }
    }
    return out;
  });
  expect(Object.keys(backgrounds)).toHaveLength(5);
  const values = Object.values(backgrounds);
  expect(values.filter((bg) => bg === 'rgb(30, 41, 59)')).toHaveLength(4);
  expect(values.filter((bg) => bg === 'rgb(234, 179, 8)')).toHaveLength(1);
  expect(backgrounds['💾 Save Game']).toBe('rgb(234, 179, 8)');
});

test('settings-menu/A4 panel uses shared treatment', async ({ page }) => {
  await gotoBattle(page);
  await openSettings(page);
  expect(await computedStyles(page, 'settings-menu')).toEqual({
    backgroundColor: 'rgb(12, 30, 91)',
    borderColor: 'rgb(234, 179, 8)',
    color: 'rgb(255, 255, 255)',
  });
});

test('settings-menu/A5 Save and Load close the menu', async ({ page }) => {
  await gotoBattle(page);
  await openSettings(page);
  await page.getByRole('button', { name: /Save Game/i }).click();
  await expect(page.getByText(/(?:Game progress saved|Đã lưu tiến độ)/i)).toBeVisible();
  await expect(page.getByTestId('settings-menu')).toHaveCount(0);
  await openSettings(page);
  await page.getByRole('button', { name: /Load Game/i }).click();
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible();
  await expect(page.getByTestId('settings-menu')).toHaveCount(0);
});

test('settings-menu/A6 status group and empty combat log', async ({ page }) => {
  await gotoBattle(page);
  await openSettings(page);
  const menu = page.getByTestId('settings-menu');
  await expect(menu.getByRole('heading', { name: 'Status', exact: true })).toBeVisible();
  await expect(menu.getByText(/💰 0 G/)).toBeVisible();
  await expect(menu.getByText('Turn: 1')).toBeVisible();
  await expect(menu.getByText('PLAYER PHASE')).toBeVisible();
  await expect(menu.getByText('No battle engagements yet.')).toBeVisible();
});

test('settings-menu/A7 menu controls meet 44px and menu is not cut off', async ({ page }) => {
  await gotoBattle(page);
  await openSettings(page);
  const menu = page.getByTestId('settings-menu');
  const menuBox = await menu.boundingBox();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.y).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(VW);
  expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(VH);
  const buttons = await menu.getByRole('button').all();
  expect(buttons.length).toBeGreaterThan(0);
  for (const button of buttons) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const selectBox = await menu.locator('select').boundingBox();
  expect(selectBox!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: '/home/hatch/workspace/water-emblem/repo/work/water-ui-redesign/after/06-settings.png' });
});
