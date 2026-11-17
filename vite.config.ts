import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

// BUILD_TARGET=android makes the copy that goes inside the APK (Phase 3).
// That copy needs no service worker because every file is already on the phone.
const isAndroid = process.env.BUILD_TARGET === 'android';

export default defineConfig({
  // Relative paths, so the same build works at any address
  // (GitHub Pages sub-folder, localhost, or inside the Android app).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __ANDROID_BUILD__: JSON.stringify(isAndroid),
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  plugins: [
    react(),
    VitePWA({
      disable: isAndroid,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      workbox: {
        // Precache EVERY file so the game works with no connection at all.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,jpg,mp3,woff2,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'Laro at Aral',
        short_name: 'Laro at Aral',
        description: 'Larong pang-aral para sa batang Pilipino. Gumagana kahit walang internet.',
        lang: 'fil',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#fdf3d7',
        theme_color: '#f2b63c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
