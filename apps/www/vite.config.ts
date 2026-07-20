import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import alchemy from 'alchemy/cloudflare/tanstack-start';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';

const directory = path.dirname(fileURLToPath(import.meta.url));
const buildRevision = process.env.GITHUB_SHA ?? 'development';
const generatedConfigPath = path.resolve(directory, '.alchemy/local/wrangler.jsonc');
const configPath = existsSync(generatedConfigPath)
  ? generatedConfigPath
  : path.resolve(directory, 'wrangler.build.jsonc');

export default defineConfig({
  envPrefix: 'VITE_',
  plugins: [
    alchemy({ configPath }),
    tanstackStart({ srcDirectory: 'app' }),
    viteReact(),
    tailwindcss(),
    wasm(),
    VitePWA({
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      srcDir: 'app',
      filename: 'service-worker.ts',
      manifest: {
        name: 'The AI Study Bible',
        short_name: 'TASB',
        description:
          'Study the Bible with scripture-grounded guidance, multiple translations, highlights, notes, and bookmarks.',
        scope: '/',
        start_url: '/',
        theme_color: '#030527',
        icons: [
          { src: '/pwa/64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa/192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa/512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Read the Bible', url: '/bible', short_name: 'Read' },
          { name: 'Ask the Assistant', url: '/chat', short_name: 'Assistant' },
          { name: 'View Devotionals', url: '/devotion', short_name: 'Devotionals' },
        ],
      },
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,png,svg,ico,wasm,webp,woff,woff2,ttf,eot,json,jpg,jpeg,gif,mp3,mp4,wav,avif}',
        ],
        manifestTransforms: [
          (manifest) => ({
            manifest: [...manifest, { url: '/', revision: buildRevision, size: 0 }],
            warnings: [],
          }),
        ],
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true,
        navigateFallback: '/',
        navigateFallbackAllowlist: [/^\/$/],
        type: 'module',
      },
    }),
    process.env.ANALYZE === 'true' && analyzer(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@/www': path.resolve(directory, './app'),
      '@/schemas': path.resolve(directory, '../../packages/schemas/src'),
      '@/core': path.resolve(directory, '../../packages/core/src'),
      '@/ai': path.resolve(directory, '../../packages/ai/src'),
      '@/email': path.resolve(directory, '../../packages/email/src'),
      '@/workers': path.resolve(directory, '../workers/src'),
      '@/scripts': path.resolve(directory, '../../tools/scripts/src'),
    },
  },
});
