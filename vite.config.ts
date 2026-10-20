import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      {
        name: 'sync-docs-on-build',
        closeBundle() {
          try {
            const distDir = path.resolve(process.cwd(), 'dist');
            const docsDir = path.resolve(process.cwd(), 'docs');
            if (fs.existsSync(distDir)) {
              fs.cpSync(distDir, docsDir, { recursive: true });
              const nojekyll = path.join(docsDir, '.nojekyll');
              if (!fs.existsSync(nojekyll)) {
                fs.writeFileSync(nojekyll, '');
              }
            }
          } catch (err) {
            console.error('Error syncing docs:', err);
          }
        },
      },
      {
        name: 'suppress-vite-ws-error',
        transform(code, id) {
          if (id.includes('vite/dist/client/client.mjs')) {
            return code
              .replace(
                /reject\([^)]*new Error\("WebSocket closed without opened\."\)\)/g,
                'resolve()'
              )
              .replace(
                'transport.connect(createHMRHandler(handleMessage));',
                '/* HMR disabled in preview iframe */'
              );
          }
          return null;
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: './',
          name: 'MacroFit Pro — Nutrição & Macros',
          short_name: 'MacroFit',
          description: 'Calculadora inteligente de macronutrientes, TMB/GET, hidratação e base TACO + FatSecret sincronizada na nuvem.',
          theme_color: '#090D16',
          background_color: '#090D16',
          display: 'standalone',
          orientation: 'portrait',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/assets/aistudio/**', '**/*.apk', '**/*.idsig', '**/*.pdf'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      ws: false,
      watch: null,
    },
  };
});
