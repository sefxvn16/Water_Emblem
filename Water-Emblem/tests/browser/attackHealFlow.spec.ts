import { expect, test, type Page } from '@playwright/test';
import { closeSettings, dismissRewardPopup, openSettings } from './settingsMenu';

const VW = 1366;
const VH = 768;
// Relative path under work/ (gitignored) per AGENTS.md guidelines
const SHOTS = 'work/water-attack-heal-flow';

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

async function gotoBattle(page: Page) {
  await page.setViewportSize({ width: VW, height: VH });
  await page.goto('/');
  await enterBattle(page);
}

async function clickTile(page: Page, x: number, y: number) {
  await dismissRewardPopup(page);
  await page.getByTestId(`tile-${x}-${y}`).dispatchEvent('click');
}

test('attack-heal-flow: interactive target-weapon-forecast flow for attack and staff on 2D grid', async ({ page }) => {
  test.setTimeout(90_000);
  await gotoBattle(page);

  // --- PART 1: ATTACK FLOW (Chapter 1) ---
  // Marth at (24, 5). Pirate at (24, 4). Add iron_sword to Marth so he has Rapier + Iron Sword.
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
      const request = store.get('slot1');
      request.onsuccess = () => {
        const record = request.result as {
          extendedUnits: Array<{
            unit: { id: string; position: { x: number; y: number } };
            inventory: Array<{
              id: string;
              itemId: string;
              name: string;
              uses: number;
              maxUses: number;
            }>;
          }>;
        };

        const marth = record.extendedUnits.find(({ unit }) => unit.id === 'marth');
        if (marth) {
          marth.unit.position = { x: 24, y: 5 };
          // Add Iron Sword so Marth has 2 usable swords (Rapier + Iron Sword)
          marth.inventory.push({
            id: 'marth_iron_sword',
            itemId: 'iron_sword',
            name: 'Iron Sword',
            uses: 40,
            maxUses: 40,
          });
        }

        const pirate = record.extendedUnits.find(({ unit }) => unit.id === 'enemy_pirate_5');
        if (pirate) {
          pirate.unit.position = { x: 24, y: 4 };
        }

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
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible({ timeout: 15000 });
  await closeSettings(page);

  // Select Marth and open Action Menu
  await clickTile(page, 24, 5);
  await clickTile(page, 24, 5);
  await expect(page.getByText('Actions (Marth)')).toBeVisible();

  // Click Attack -> target selection mode (menu hides)
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await expect(page.getByText('Actions (Marth)')).toHaveCount(0);

  // Click target pirate at (24, 4)
  await clickTile(page, 24, 4);

  // WeaponPicker must appear because Marth has both Rapier and Iron Sword
  const weaponPicker = page.locator('[data-testid="weapon-picker"]');
  await expect(weaponPicker).toBeVisible();
  await expect(weaponPicker.getByText(/Rapier/i)).toBeVisible();
  await expect(weaponPicker.getByText(/Iron Sword/i)).toBeVisible();

  // Pick Rapier
  await weaponPicker.getByText(/Rapier/i).click();

  // Combat forecast opens
  const combatForecast = page.getByTestId('forecast-window');
  await expect(combatForecast).toBeVisible();
  await expect(page.getByText(/COMBAT FORECAST/)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/01-attack-forecast.png` });

  // Cancel forecast -> returns to WeaponPicker
  const cancelForecastBtn = combatForecast.locator('button[aria-label="Cancel"]');
  if (await cancelForecastBtn.isVisible()) {
    await cancelForecastBtn.click();
  } else {
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await expect(combatForecast).toHaveCount(0);
  await expect(weaponPicker).toBeVisible();

  // Cancel WeaponPicker -> returns to Action Menu
  await weaponPicker.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Actions (Marth)')).toBeVisible();

  // Close Action Menu
  await page.keyboard.press('Escape');

  // --- PART 2: HEAL / STAFF FLOW (Chapter 3) ---
  // Switch to Chapter 3 where Lena (Sister / Cleric) is present
  await openSettings(page);
  await page.locator('select').selectOption('chapter_03');
  await page.getByRole('button', { name: /(?:Start Chapter|Bắt đầu chương)/i }).click();
  await enterBattle(page);

  // In Chapter 3, save, add Heal staff to Lena, move Julian to (24, 3) adjacent to Lena at (24, 4) and injure him
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
      const request = store.get('slot1');
      request.onsuccess = () => {
        const record = request.result as {
          extendedUnits: Array<{
            unit: { id: string; position: { x: number; y: number } };
            stats: { hp: number; maxHp: number };
            inventory: Array<{
              id: string;
              itemId: string;
              name: string;
              uses: number;
              maxUses: number;
            }>;
          }>;
        };

        const lena = record.extendedUnits.find(({ unit }) => unit.id === 'lena');
        if (lena) {
          lena.unit.position = { x: 24, y: 4 };
          // Add heal staff alongside warp staff
          lena.inventory.push({
            id: 'lena_heal_staff',
            itemId: 'heal_staff',
            name: 'Heal',
            uses: 20,
            maxUses: 20,
          });
        }

        const julian = record.extendedUnits.find(({ unit }) => unit.id === 'julian');
        if (julian) {
          julian.unit.position = { x: 24, y: 3 }; // adjacent north of Lena
          julian.stats.hp = 6; // injured
        }

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
  await expect(page.getByText(/(?:Save file loaded|Đã nạp lại tiến độ)/i)).toBeVisible({ timeout: 15000 });
  await closeSettings(page);

  // Select Lena at (24, 4) and open Action Menu
  await clickTile(page, 24, 4);
  await clickTile(page, 24, 4);
  await expect(page.getByText('Actions (Lena)')).toBeVisible();

  // Click Staff button -> enters ally targeting mode
  const staffActionBtn = page.getByTestId('action-staff-heal_staff');
  await expect(staffActionBtn).toBeVisible();
  await staffActionBtn.click();
  await expect(page.getByText('Actions (Lena)')).toHaveCount(0);

  // Click injured ally Julian at (24, 3)
  await clickTile(page, 24, 3);

  // Lena has both Warp staff and Heal staff, so WeaponPicker opens for staves
  const staffPicker = page.locator('[data-testid="weapon-picker"]');
  if (await staffPicker.isVisible()) {
    await staffPicker.getByText(/Heal/i).click();
  }

  // StaffForecastWindow opens!
  const staffForecast = page.getByTestId('staff-forecast-window');
  await expect(staffForecast).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/STAFF FORECAST/i)).toBeVisible();
  await expect(staffForecast.getByText('Lena')).toBeVisible();
  await expect(staffForecast.getByText('Julian')).toBeVisible();
  await expect(staffForecast.getByText(/\+\d+\s*HP/i)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/02-staff-forecast.png` });

  // Test Cancel button on Staff Forecast -> returns to staff picker
  const cancelStaffBtn = page.getByTestId('staff-cancel-btn');
  await expect(cancelStaffBtn).toBeVisible();
  await cancelStaffBtn.click();
  await expect(staffForecast).toHaveCount(0);

  // If staff picker reopened, pick Heal staff again
  if (await staffPicker.isVisible()) {
    await staffPicker.getByText(/Heal/i).click();
  } else {
    await clickTile(page, 24, 4);
    await page.getByTestId('action-staff-heal_staff').click();
    await clickTile(page, 24, 3);
    if (await staffPicker.isVisible()) {
      await staffPicker.getByText(/Heal/i).click();
    }
  }

  await expect(staffForecast).toBeVisible();

  // Confirm Heal
  const confirmStaffBtn = page.getByTestId('staff-confirm-btn');
  await expect(confirmStaffBtn).toBeVisible();
  await confirmStaffBtn.click();

  // Forecast closes after healing
  await expect(staffForecast).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/03-heal-executed.png` });
});
