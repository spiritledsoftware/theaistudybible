import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: 'packages/core/src/database/schema.ts',
  out: 'migrations/d1',
  dialect: 'sqlite',
});
