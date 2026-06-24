import dns from 'node:dns';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

dns.setDefaultResultOrder('ipv4first');

const viteCacheDir = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA ?? tmpdir(), 'SportPilot', 'vite-cache')
  : 'node_modules/.vite';

function createOpenFoodFactsProxy(
  target: string,
  rewrite: (path: string) => string,
): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    secure: true,
    timeout: 20_000,
    proxyTimeout: 20_000,
    headers: {
      'User-Agent': 'SportPilot/0.13.0-alpha.6 (local PWA; Open Food Facts integration)',
    },
    rewrite,
    configure(proxy) {
      proxy.on('error', (error) => {
        const code = 'code' in error && error.code ? String(error.code) : error.name;
        console.error(`[Open Food Facts proxy] ${code}: ${error.message}`);
      });
    },
  };
}

export default defineConfig({
  cacheDir: viteCacheDir,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'SportPilot — Suivi sport et nutrition',
        short_name: 'SportPilot',
        description: 'Application locale de suivi sportif, nutritionnel et calorique.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f8fafc',
        theme_color: '#0f766e',
        categories: ['health', 'fitness', 'lifestyle'],
        shortcuts: [
          {
            name: 'Ajouter un aliment',
            short_name: 'Aliment',
            description: 'Ajouter un aliment au journal du jour.',
            url: './#/food/select',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Ajouter une activité',
            short_name: 'Activité',
            description: 'Enregistrer une activité sportive.',
            url: './#/activities/add',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Renseigner le poids',
            short_name: 'Poids',
            description: 'Ajouter une pesée.',
            url: './#/weight',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api/open-food-facts/search': createOpenFoodFactsProxy(
        'https://search.openfoodfacts.org',
        (path) => path.replace(/^\/api\/open-food-facts\/search/, '/search'),
      ),
      '/api/open-food-facts/legacy-search': createOpenFoodFactsProxy(
        'https://world.openfoodfacts.org',
        (path) => path.replace(/^\/api\/open-food-facts\/legacy-search/, '/cgi/search.pl'),
      ),
      '/api/open-food-facts/product': createOpenFoodFactsProxy(
        'https://world.openfoodfacts.org',
        (path) => path.replace(/^\/api\/open-food-facts\/product/, '/api/v3.6/product'),
      ),
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 1,
    isolate: false,
  },
});
