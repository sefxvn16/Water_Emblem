// Inspector J2 + faction tones B acceptance tests (PLAN item 79,
// specs/unit-inspector.md A7/A8). Runs on the 2D grid only, same helpers as
// uiRedesign.spec.ts. The intermediary and reinforcement tones are pinned by
// Vitest (tests/core/factionTones.test.ts + the SSR render in
// tests/core/uiRender.test.ts) because no chapter fields an `ally` unit yet
// and save validation rightly rejects faction flips in saved games.
import { expect, test, type Page } from '@playwright/test';
import { closeSettings } from './settingsMenu';

const VW = 1366;
const VH = 768;
const AFTER = '/home/hatch/workspace/water-emblem/repo/work/water-inspector-j2/after';

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

async function openInspector(page: Page, x: number, y: number) {
  await clickTile(page, x, y);
  await page.getByRole('button', { name: 'Details ℹ️' }).click();
  await expect(page.getByTestId('inspector')).toBeVisible();
}

async function inspectorStyles(page: Page) {
  const panel = await page.getByTestId('inspector').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { backgroundColor: cs.backgroundColor, borderColor: cs.borderColor, color: cs.color };
  });
  const accent = await page.getByTestId('inspector-accent').evaluate((el) => getComputedStyle(el).backgroundColor);
  const chip = await page.getByTestId('inspector-chip').textContent();
  return { panel, accent, chip };
}

test('unit-inspector/J2 weapons and items show their icons', async ({ page }) => {
  await gotoBattle(page);
  await openInspector(page, 24, 5);
  const inspector = page.getByTestId('inspector');

  // Weapons: 2×2 grid; Marth carries 2 weapons (Rapier + Iron Sword), so
  // 2 filled cells + 2 empty. (Before PLAN item 82 the equipped Rapier was
  // shown twice, filling 3 cells.)
  const cells = inspector.getByTestId('inspector-weapons').locator(':scope > div');
  await expect(cells).toHaveCount(4);
  for (let i = 0; i < 2; i++) {
    const img = cells.nth(i).locator('img');
    await expect(img).toHaveCount(1);
    const naturalWidth = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
    const box = await img.boundingBox();
    expect(Math.round(box!.width)).toBe(26);
    expect(Math.round(box!.height)).toBe(26);
  }
  await expect(cells.nth(0).locator('img')).toHaveAttribute('src', /Is_fe03_rapier\.png$/);
  await expect(cells.nth(2)).toHaveText('—');
  await expect(cells.nth(3)).toHaveText('—');

  // Items: Marth carries none — four dashed empty slots.
  const slots = inspector.getByTestId('inspector-items').locator(':scope > div');
  await expect(slots).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(slots.nth(i)).toHaveText('—');
  }

  // HP bar: full HP, so the fill spans the whole track (minus its 1px borders).
  const bar = inspector.getByText('HP 18 / 18').locator('xpath=..');
  const fill = bar.locator(':scope > div').first();
  const barBox = await bar.boundingBox();
  const fillBox = await fill.boundingBox();
  expect(fillBox!.width).toBeGreaterThan(0);
  expect(Math.abs(barBox!.width - 2 - fillBox!.width)).toBeLessThanOrEqual(2);

  await inspector.screenshot({ path: `${AFTER}/01-inspector-player.png` });
});

test('unit-inspector/B faction tones — player and enemy', async ({ page }) => {
  await gotoBattle(page);
  await openInspector(page, 24, 5);
  expect(await inspectorStyles(page)).toEqual({
    panel: { backgroundColor: 'rgb(16, 26, 46)', borderColor: 'rgb(201, 162, 39)', color: 'rgb(248, 250, 252)' },
    accent: 'rgb(59, 130, 246)',
    chip: 'Player',
  });
  await page.getByRole('button', { name: 'Close unit details' }).click();
  await openInspector(page, 6, 4);
  expect(await inspectorStyles(page)).toEqual({
    panel: { backgroundColor: 'rgb(43, 23, 25)', borderColor: 'rgb(201, 162, 39)', color: 'rgb(248, 250, 252)' },
    accent: 'rgb(239, 68, 68)',
    chip: 'Enemy',
  });
  await page.getByTestId('inspector').screenshot({ path: `${AFTER}/02-inspector-enemy.png` });
});
