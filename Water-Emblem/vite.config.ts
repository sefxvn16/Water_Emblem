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
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/core/**/*.test.ts'],
  },
});
