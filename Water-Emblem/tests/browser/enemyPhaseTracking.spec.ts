import { expect, test, type Page } from '@playwright/test';
import { closeSettings, dismissRewardPopup, expectPlayerPhase, expectTurnNumber, openSettings } from './settingsMenu';
interface CameraSample {
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly centreTile: string | null;
  readonly phase: string | null;
  readonly enemyTiles: readonly string[];
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
  await expect(page.getByTestId('tile-0-0')).toBeVisible({ timeout: 15000 });
}

async function clickTile(page: Page, x: number, y: number) {
  await dismissRewardPopup(page);
  await page.getByTestId(`tile-${x}-${y}`).dispatchEvent('click');
}

test('enemy phase runs with camera tracking and indicator focus', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await enterBattle(page);

  // Enable Auto End Turn in Settings
  await openSettings(page);
  await page.getByRole('group', { name: 'Auto End Turn' }).getByRole('button', { name: 'On' }).click();
  await closeSettings(page);

  // Wait all player units to trigger enemy phase
  const playerTiles = [[24, 5], [25, 5], [23, 4], [22, 7], [23, 7], [22, 3], [23, 3]] as const;
  for (const [x, y] of playerTiles) {
    await clickTile(page, x, y);
    await clickTile(page, x, y);
    await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  }

  // Verify Enemy Phase completes and advances to Turn 2 Player Phase smoothly
  await openSettings(page);
  await expectTurnNumber(page, 2);
  await expectPlayerPhase(page);
});

/**
 * PLAN item 201, for item 186 criterion (4). The test above never looks at the
 * camera: it only checks that the enemy phase ends on turn 2. It could not look
 * at it either, because Playwright reports a headless user agent, so the enemy
 * phase ran in fast playback with its waits collapsed — the scroll calls went
 * out faster than any test could sample them.
 *
 * `?cameraTracking=1` (src/renderer/movementAnimation.ts) turns fast playback
 * off for this run alone, so the phase plays at the pace a player sees. The
 * test then samples the map's scroll container while the enemy phase runs and
 * asserts that it came to rest centred on one enemy after another.
 */
test('camera tracking scrolls the map onto each acting enemy during the enemy phase', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/?cameraTracking=1');
  await enterBattle(page);

  await openSettings(page);
  await page.getByRole('group', { name: 'Auto End Turn' }).getByRole('button', { name: 'On' }).click();
  await closeSettings(page);

  // Sample the map's scroll position, the tile at the centre of the view and
  // where every enemy stands, 20 times a second, for the whole enemy phase.
  await page.evaluate(() => {
    const win = window as unknown as {
      __camSamples?: unknown[];
      __camTimer?: number;
      __WATER_EMBLEM_STATE__?: {
        turnState?: { activePhase?: string };
        extendedUnits?: { unit: { faction: string; isDead?: boolean; position: { x: number; y: number } } }[];
      };
    };
    const scroller = [...document.querySelectorAll('div')]
      .find((node) => getComputedStyle(node).overflow === 'auto');
    if (!scroller) throw new Error('no scroll container found');
    win.__camSamples = [];
    win.__camTimer = window.setInterval(() => {
      const box = scroller.getBoundingClientRect();
      const atCentre = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const tile = atCentre?.closest('[data-testid^="tile-"]');
      const state = win.__WATER_EMBLEM_STATE__;
      win.__camSamples!.push({
        scrollLeft: Math.round(scroller.scrollLeft),
        scrollTop: Math.round(scroller.scrollTop),
        centreTile: tile?.getAttribute('data-testid') ?? null,
        phase: state?.turnState?.activePhase ?? null,
        enemyTiles: (state?.extendedUnits ?? [])
          .filter(({ unit }) => unit.faction === 'enemy' && !unit.isDead)
          .map(({ unit }) => `tile-${unit.position.x}-${unit.position.y}`),
      });
    }, 50);
  });

  // Wait every player unit so the enemy phase begins.
  const playerTiles = [[24, 5], [25, 5], [23, 4], [22, 7], [23, 7], [22, 3], [23, 3]] as const;
  for (const [x, y] of playerTiles) {
    await clickTile(page, x, y);
    await clickTile(page, x, y);
    await page.getByRole('button', { name: /(?:Wait|Chờ)/i }).click();
  }

  await openSettings(page);
  await expectTurnNumber(page, 2);
  await expectPlayerPhase(page);
  await closeSettings(page);

  const samples = await page.evaluate(() => {
    const win = window as unknown as { __camSamples?: CameraSample[]; __camTimer?: number };
    if (win.__camTimer !== undefined) window.clearInterval(win.__camTimer);
    return win.__camSamples ?? [];
  });

  const duringEnemyPhase = samples.filter((sample) => sample.phase === 'enemy_phase');
  // The flag has to have taken effect: in fast playback the whole phase is
  // over inside one or two samples.
  expect(duringEnemyPhase.length).toBeGreaterThan(10);

  // The map moved, repeatedly, while the enemies acted.
  const scrollStops = new Set(duringEnemyPhase.map(({ scrollLeft, scrollTop }) => `${scrollLeft},${scrollTop}`));
  expect(scrollStops.size).toBeGreaterThanOrEqual(3);

  // And it came to rest centred on enemies, not on arbitrary tiles: collect
  // the tiles that were at the centre of the view at a moment an enemy was
  // standing there.
  const centredOnEnemies = new Set(duringEnemyPhase
    .filter((sample) => sample.centreTile !== null && sample.enemyTiles.includes(sample.centreTile))
    .map((sample) => sample.centreTile));
  expect(centredOnEnemies.size).toBeGreaterThanOrEqual(2);
});
