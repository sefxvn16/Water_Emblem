import { expect, test } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

test('3D selection, two turns, and IndexedDB save/load', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Vào trận đánh/ }).click();
  await expect(page.getByText('PLAYER PHASE')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const camera = new PerspectiveCamera(40, box!.width / box!.height, 0.1, 1000);
  const distance = 30 * 0.75;
  camera.position.set(14.5 + distance * 0.7, distance * 0.85, 6 + distance * 0.7);
  camera.lookAt(14.5, 0, 6);
  camera.updateMatrixWorld();
  const marth = new Vector3(25, 0.3, 9).project(camera);
  await page.mouse.click(box!.x + (marth.x + 1) * box!.width / 2, box!.y + (1 - marth.y) * box!.height / 2);
  await expect(page.getByText('Marth', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: /Lưu Game/ }).click();
  await expect(page.getByText(/Đã lưu tiến độ/)).toBeVisible();
  await page.getByRole('button', { name: /Kết thúc lượt/ }).click();
  await expect(page.getByText('Turn: 2')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /Nạp Game/ }).click();
  await expect(page.getByText('Turn: 1')).toBeVisible();
  await expect(page.getByText(/Đã nạp lại tiến độ/)).toBeVisible();
});
