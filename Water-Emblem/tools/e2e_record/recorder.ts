// Records the UI steps a heuristic bot takes, so a fixed replay can be committed as a test fixture.
// Not part of the gate. Run: npx playwright test -c tools/e2e_record/playwright.record.config.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import type { Page, TestInfo } from '@playwright/test';

export const SEED = 20261117;

export type ReplayStep =
  | { kind: 'tile'; testId: string }
  | { kind: 'button'; name: string }
  | { kind: 'select'; value: string };

export async function recordOn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const steps: unknown[] = [];
    (window as unknown as { __REPLAY_STEPS__: unknown[] }).__REPLAY_STEPS__ = steps;
    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      if (!target) return;
      const tile = target.closest('[data-testid^="tile-"]');
      if (tile) {
        steps.push({ kind: 'tile', testId: tile.getAttribute('data-testid') });
        return;
      }
      const button = target.closest('button');
      if (button) {
        steps.push({ kind: 'button', name: (button.textContent ?? '').trim() });
        return;
      }
      steps.push({ kind: 'unknown', tag: target.tagName, text: (target.textContent ?? '').slice(0, 40) });
    }, true);
    document.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement | null;
      if (target && target.tagName === 'SELECT') steps.push({ kind: 'select', value: target.value });
    }, true);
  });
}

export async function saveRecording(page: Page, info: TestInfo, name: string): Promise<void> {
  const steps = await page.evaluate(() => (window as unknown as { __REPLAY_STEPS__: unknown[] }).__REPLAY_STEPS__);
  mkdirSync('tests/browser/fixtures', { recursive: true });
  const file = `tests/browser/fixtures/${name}.replay.json`;
  writeFileSync(file, `${JSON.stringify({ seed: SEED, recordedFrom: info.title, status: info.status, steps }, null, 1)}\n`);
}
