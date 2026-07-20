import fs from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { promoteExistingAccount } from './users/promote-admin';

await yargs(hideBin(process.argv))
  .scriptName('scripts')
  .command('auth', 'Auth commands', (yargs) =>
    yargs.command(
      'cleanup-sessions',
      'Cleanup expired sessions',
      (yargs) => yargs,
      async () => {
        const { cleanupSessions } = await import('./auth/cleanup-sessions');
        await cleanupSessions();
      },
    ),
  )
  .command('db', 'Database commands', (yargs) =>
    yargs.command(
      'seed',
      'Run database seeding',
      (yargs) => yargs,
      async () => {
        const { seedDatabase } = await import('./database/seed');
        await seedDatabase();
      },
    ),
  )
  .command('bibles', 'Bible commands', (yargs) =>
    yargs
      .command(
        'create',
        'Create a new bible',
        (yargs) =>
          yargs
            .option('zip-path', {
              alias: 'z',
              type: 'string',
              description: 'Path to the zip file containing the bible',
            })
            .option('publication-id', {
              alias: 'p',
              type: 'string',
              description: 'ID of the publication to use',
            })
            .option('overwrite', {
              alias: 'o',
              type: 'boolean',
              description: 'Overwrite existing bibles',
              default: false,
            })
            .option('generate-embeddings', {
              alias: 'e',
              type: 'boolean',
              description: 'Generate embeddings for the bible',
              default: false,
            })
            .demandOption(['zip-path']),
        async (argv) => {
          const { createBibleFromDblZip } = await import('@/core/utils/bibles/create-from-dbl-zip');
          const zipBuffer = fs.readFileSync(argv['zip-path']);
          await createBibleFromDblZip({
            zipBuffer,
            publicationId: argv['publication-id'],
            overwrite: argv.overwrite,
            generateEmbeddings: argv['generate-embeddings'],
          });
        },
      )
      .command(
        'remove-links',
        'Remove existing bible links between verses and chapters',
        (yargs) => yargs,
        async () => {
          const { removeBibleLinks } = await import('./one-off/remove-bible-links');
          await removeBibleLinks();
        },
      ),
  )
  .command('users', 'Account commands', (yargs) =>
    yargs
      .command(
        'create-default-settings',
        'Create default Account settings for all Readers',
        (yargs) => yargs,
        async () => {
          const { createUserSettings } = await import('./one-off/create-user-settings');
          await createUserSettings();
        },
      )
      .command(
        'promote-admin',
        'Promote an existing production Account to administrator',
        (yargs) =>
          yargs
            .option('database', {
              type: 'string',
              demandOption: true,
              description: 'Production D1 database name or UUID',
            })
            .option('email', { type: 'string', demandOption: true })
            .option('stage', { type: 'string', choices: ['production'], demandOption: true })
            .option('confirm', {
              type: 'string',
              demandOption: true,
              description: 'Exact confirmation phrase: PROMOTE <email>',
            }),
        async (argv) => {
          await promoteExistingAccount({
            database: argv.database,
            email: argv.email,
            stage: argv.stage,
            confirmation: argv.confirm,
          });
        },
      ),
  )
  .showHelpOnFail(true)
  .help('h')
  .alias('h', 'help')
  .parse();
