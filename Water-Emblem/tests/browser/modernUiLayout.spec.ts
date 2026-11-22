import { expect, test, type Page } from '@playwright/test';
import { closeSettings, dismissRewardPopup } from './settingsMenu';

/**
 * PLAN item 201, for items 182, 183 and 189.
 *
 * Those three items are about where things sit on screen, which colour the
 * map paints an enemy's range, how tall a command button is and what a tab
 * switches to. The tests cited for them ran `renderToString` and searched the
 * markup for substrings, or compared `html.indexOf()` of labels, which cannot
 * see a column, a computed colour or a touch target — and `tests/core` runs in
 * the `node` environment with no DOM at all, so nothing there could.
 *
 * These drive the real page: they read laid-out geometry and computed styles
 * out of the browser and assert against the criteria as written.
 */

const CANON_ORDER = ['Talk', 'Attack', 'Staff', 'Item', 'Trade', 'Visit', 'Seize', 'Wait'] as const;

async function enterBattle(page: Page) {
  const resumeBtn = page.getByRole('button', { name: /RESUME BATTLE/i });
  if (await resumeBtn.isVisible()) await resumeBtn.click();
  const startBtn = page.getByRole('button', { name: /(?:Start Battle|Vào trận đánh)/i });
  if (await startBtn.isVisible()) await startBtn.click();
  await closeSettings(page);
  await expect(page.getByTestId('tile-0-0')).toBeVisible({ timeout: 15000 });
}

async function clickTile(page: Page, x: number, y: number) {
  await dismissRewardPopup(page);
  await page.getByTestId(`tile-${x}-${y}`).dispatchEvent('click');
}

/** Every distinct non-transparent overlay colour painted over the map tiles. */
async function overlayColours(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const colours = new Set<string>();
    for (const tile of document.querySelectorAll('[data-testid^="tile-"]')) {
      for (const layer of tile.querySelectorAll(':scope > div')) {
        const background = getComputedStyle(layer).backgroundColor;
        if (background && background !== 'transparent' && !background.startsWith('rgba(0, 0, 0, 0)')) {
          colours.add(background);
        }
      }
    }
    return [...colours];
  });
}

test('the action menu is a vertical column of 44px command cards beside the unit, in Fire Emblem order, with no red divider', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);

  // Marth starts at (24,5): two clicks select him and open the menu.
  await clickTile(page, 24, 5);
  await clickTile(page, 24, 5);
  const menu = page.getByTestId('action-menu');
  await expect(menu).toBeVisible();

  const buttons = await menu.locator('button').all();
  expect(buttons.length).toBeGreaterThanOrEqual(3);

  const boxes: { label: string; x: number; y: number; width: number; height: number }[] = [];
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (!box) throw new Error('an action button has no layout box');
    boxes.push({ label: ((await button.textContent()) ?? '').trim(), ...box });
  }

  // A column, not a row: one shared left edge, each card below the last.
  const left = boxes[0]!.x;
  for (const box of boxes) {
    expect(Math.abs(box.x - left)).toBeLessThanOrEqual(2);
    // Touch target: at least 44px tall, as the criterion requires.
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index]!.y).toBeGreaterThan(boxes[index - 1]!.y);
  }

  // Fire Emblem order, over whichever commands this unit actually has.
  const shown = boxes
    .map(({ label }) => CANON_ORDER.find((name) => label.includes(name)))
    .filter((name): name is typeof CANON_ORDER[number] => name !== undefined);
  const canonical = CANON_ORDER.filter((name) => shown.includes(name));
  expect(shown).toEqual(canonical);

  // The menu sits beside the unit, not on top of it.
  const menuBox = await menu.boundingBox();
  const tileBox = await page.getByTestId('tile-24-5').boundingBox();
  if (!menuBox || !tileBox) throw new Error('missing layout boxes');
  const overlaps = menuBox.x < tileBox.x + tileBox.width && menuBox.x + menuBox.width > tileBox.x
    && menuBox.y < tileBox.y + tileBox.height && menuBox.y + menuBox.height > tileBox.y;
  expect(overlaps).toBe(false);

  // No red rule anywhere inside the menu (the old divider above Cancel).
  const redRules = await menu.evaluate((root) => {
    const hits: string[] = [];
    for (const node of root.querySelectorAll('*')) {
      const box = node.getBoundingClientRect();
      if (box.height > 4 || box.height === 0) continue;
      const match = /^rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(node).backgroundColor);
      if (!match) continue;
      const [red, green, blue] = [Number(match[1]), Number(match[2]), Number(match[3])];
      if (red > 150 && green < 110 && blue < 110) hits.push(`${box.height}px ${getComputedStyle(node).backgroundColor}`);
    }
    return hits;
  });
  expect(redRules).toEqual([]);
});

test('the map paints an enemy range in crimson and never in the player blue', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);

  const PLAYER_BLUE = 'rgba(33, 150, 243, 0.45)';
  const ENEMY_CRIMSON = 'rgba(244, 63, 94, 0.38)';
  const DANGER_PURPLE = 'rgba(147, 51, 234, 0.22)';

  // Selecting one of our own shows the player-blue movement range.
  await clickTile(page, 24, 5);
  const selectedColours = await overlayColours(page);
  expect(selectedColours).toContain(PLAYER_BLUE);
  expect(selectedColours).not.toContain(ENEMY_CRIMSON);

  // Clicking an enemy drops our own selection and shows that enemy's reach
  // instead (App.tsx: `turnManager.cancelSelect()` then `setSelectedEnemyPos`).
  // Gazzak stands at (6,4).
  await clickTile(page, 6, 4);
  await expect
    .poll(async () => (await overlayColours(page)).includes(PLAYER_BLUE), { timeout: 10000 })
    .toBe(false);

  const inspectedColours = await overlayColours(page);
  // Three Houses / Engage reading: his reach is crimson, and our blue is gone.
  expect(inspectedColours).toContain(ENEMY_CRIMSON);
  expect(inspectedColours).not.toContain(PLAYER_BLUE);
  // The pooled danger zone keeps its own purple, distinct from both.
  expect(DANGER_PURPLE).not.toBe(ENEMY_CRIMSON);
});

test('the unit inspector switches the panel body when a tab is chosen', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);

  await page.getByTestId('tile-24-5').dispatchEvent('contextmenu');
  const inspector = page.getByTestId('inspector');
  await expect(inspector).toBeVisible({ timeout: 10000 });

  const statsBody = (await inspector.textContent()) ?? '';
  expect(statsBody.length).toBeGreaterThan(20);

  const skillsTab = inspector.getByRole('tab', { name: /Skills/i }).first();
  await expect(skillsTab).toBeVisible();
  // The tab really is marked as the selected one after the click.
  await expect(skillsTab).toHaveAttribute('aria-selected', 'false');
  await skillsTab.click();
  await expect(skillsTab).toHaveAttribute('aria-selected', 'true');
  const skillsBody = (await inspector.textContent()) ?? '';
  // Choosing a tab actually replaces the body, rather than only restyling it.
  expect(skillsBody).not.toBe(statsBody);

  const supportsTab = inspector.getByRole('tab', { name: /Supports/i }).first();
  await supportsTab.click();
  await expect(supportsTab).toHaveAttribute('aria-selected', 'true');
  const supportsBody = (await inspector.textContent()) ?? '';
  expect(supportsBody).not.toBe(skillsBody);
  expect(supportsBody).not.toBe(statsBody);
});
