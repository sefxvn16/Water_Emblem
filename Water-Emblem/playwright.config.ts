import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  // WebGL scenes render slowly in headless Chromium; parallel workers starve each other and time out.
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 900 } },
  // Phải là `vite dev`, không được đổi sang `vite preview`: `src/main.tsx` chỉ đọc tham số `seed`
  // khi `import.meta.env.DEV`, nên trên bản production seed bị bỏ qua, RNG khác đi và các test
  // replay theo seed không bao giờ tới STAGE CLEAR — chúng đốt hết `test.setTimeout(300_000)`.
  // Đã thử và xác nhận 2026-11-20 (PLAN mục 174).
  // timeout 120s thay cho 30s: khi gate chạy, vite dev phải khởi động ngay sau `vitest run` và
  // `tsc && vite build` trên cùng máy, trong thư mục OneDrive đang đồng bộ.
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
