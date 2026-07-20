import { defineConfig } from 'vitest/config';

const PROJECT_ROOTS = [
  'apps/workers',
  'apps/www',
  'packages/ai',
  'packages/core',
  'packages/schemas',
];

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    projects: PROJECT_ROOTS.map((root) => ({
      extends: true,
      root,
      test: { name: root },
    })),
  },
});
