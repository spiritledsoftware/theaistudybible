import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.WEB_APP_URL,
    env: {
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
      TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
    },
    defaultCommandTimeout: process.env.STAGE === 'local' ? 20_000 : 10_000,
    retries: { runMode: 2 },
    includeShadowDom: true,
  },
});
