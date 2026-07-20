import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['./app/**/*.test.{ts,tsx}', './src/**/*.test.{ts,tsx}'],
  },
});
