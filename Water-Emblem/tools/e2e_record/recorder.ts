// Records the UI steps a heuristic bot takes, so a fixed replay can be committed as a test fixture.
// Not part of the gate. Run: npx playwright test -c tools/e2e_record/playwright.record.config.ts
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
        // Circular action buttons carry their label in aria-label; their
        // textContent is only the glyph (or empty). Record the accessible
        // name so the replay can find the button by role.
        let name = button.getAttribute('aria-label');
        if (!name) {
          const clone = button.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
          name = clone.textContent ?? '';
        }
        name = name.trim();
        // The bot opens/closes the Settings menu for its own navigation;
        // the replay drives Settings itself, and a real click on the gear
        // is intercepted by the story intro overlay. Don't record it.
        if (name === 'Settings') return;
        // Reward popups are dismissed by the replay at every step; a
        // recorded OK click would race that dismissal and time out.
        if (button.closest('[data-testid="reward-popup"]')) return;
        steps.push({ kind: 'button', name });
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
  const dir = existsSync('Water-Emblem/tests/browser') ? 'Water-Emblem/tests/browser/fixtures' : 'tests/browser/fixtures';
  mkdirSync(dir, { recursive: true });
  const file = `${dir}/${name}.replay.json`;
  writeFileSync(file, `${JSON.stringify({ seed: SEED, recordedFrom: info.title, status: info.status, steps }, null, 1)}\n`);
}
