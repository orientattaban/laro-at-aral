import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __ANDROID_BUILD__: 'false',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    setupFiles: ['tests/unit/setup.ts'],
  },
});
