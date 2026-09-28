import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import alchemy from 'alchemy/cloudflare/tanstack-start';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';

const directory = path.dirname(fileURLToPath(import.meta.url));
// The SSR shell is precached under "/", so its revision must change on every build.
const buildRevision = process.env.GITHUB_SHA ?? randomUUID();
const generatedConfigPath = path.resolve(directory, '.alchemy/local/wrangler.jsonc');
const configPath = existsSync(generatedConfigPath)
  ? generatedConfigPath
  : path.resolve(directory, 'wrangler.build.jsonc');

// vite-plugin-pwa predates Vite environments: it reads the top-level resolved config, which the
// Cloudflare plugin points at the worker (SSR) build, so it skips the service worker and writes the
// manifest into dist/server. Hand it the client build options and emit its files only from the
// client build; its virtual modules still resolve everywhere because SSR renders the registrar.
function clientPWA(options: Partial<VitePWAOptions>): Plugin[] {
  return VitePWA(options).map((plugin) => {
    const { configResolved } = plugin;
    return {
      ...plugin,
      applyToEnvironment:
        plugin.name === 'vite-plugin-pwa:build'
          ? (environment) => environment.name === 'client'
          : undefined,
      configResolved:
        typeof configResolved === 'function'
          ? function (config) {
              return configResolved.call(this, {
                ...config,
                build: config.environments.client?.build ?? config.build,
              });
            }
          : configResolved,
    };
  });
}

export default defineConfig({
  envPrefix: 'VITE_',
  plugins: [
    alchemy({ configPath }),
    tanstackStart({ srcDirectory: 'app' }),
    viteReact(),
    tailwindcss(),
    clientPWA({
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
