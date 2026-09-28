import { defineConfig } from 'cypress';
import { type BuildOptions, build, context } from 'esbuild';

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
    setupNodeEvents(on) {
      // Cypress's default preprocessor compiles specs with ts-loader, which needs the
      // TypeScript JS compiler API that TypeScript 7 no longer ships. Bundle with esbuild.
      on('file:preprocessor', async (file) => {
        const options: BuildOptions = {
          entryPoints: [file.filePath],
          outfile: file.outputPath,
          bundle: true,
          format: 'iife',
          platform: 'browser',
          sourcemap: 'inline',
          logLevel: 'silent',
        };
        if (!file.shouldWatch) {
          await build(options);
          return file.outputPath;
        }

        // `cypress open`: rebuild on change and ask Cypress to rerun the spec.
        let builds = 0;
        const { promise: firstBuild, resolve } = Promise.withResolvers<void>();
        const watcher = await context({
          ...options,
          plugins: [
            {
              name: 'cypress-rerun',
              setup(pluginBuild) {
                pluginBuild.onEnd(() => {
                  builds += 1;
                  if (builds === 1) resolve();
                  else file.emit('rerun');
                });
              },
            },
          ],
        });
        file.on('close', () => void watcher.dispose());
        await watcher.watch();
        await firstBuild;
        return file.outputPath;
      });
    },
  },
});
