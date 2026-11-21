import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': path.resolve(import.meta.dirname, './src/core'),
      '@renderer': path.resolve(import.meta.dirname, './src/renderer'),
      '@ui': path.resolve(import.meta.dirname, './src/ui'),
      '@data': path.resolve(import.meta.dirname, './data'),
    },
  },
  server: {
    // Dev server không được theo dõi các thư mục sinh ra trong lúc test chạy.
    // Playwright ghi `test-results/` ngay khi đang chạy (trace, error-context.md), `vite build`
    // ghi `dist/`, và OneDrive còn đồng bộ tiếp sau đó. Mỗi file mới là một sự kiện watcher làm
    // trang nạp lại giữa suite, nên một lỗi nhỏ ban đầu kéo theo cả loạt test đổ: đúng dấu hiệu
    // "12 pass rồi 35 fail" ghi ở PLAN mục 174. Bỏ theo dõi chúng không làm yếu test nào.
    watch: { ignored: ['**/dist/**', '**/test-results/**', '**/playwright-report/**'] },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/howler') || id.includes('node_modules/dexie')) {
            return 'vendor-audio-storage';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/core/**/*.test.ts'],
  },
});
