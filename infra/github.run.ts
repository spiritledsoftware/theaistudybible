/**
 * Manages the GitHub Actions configuration for one deployment environment.
 *
 *   pnpm exec alchemy deploy infra/github.run.ts --stage <production|staging|preview> \
 *     --env-file .env.<stage>
 *
 * The stage names the GitHub Environment. Every value the deploy workflows read is written as an
 * Environment secret from the operator's env file, except CLOUDFLARE_API_TOKEN, which is a
 * dedicated deploy token minted here so CI never holds the operator's token.
 */
import alchemy from 'alchemy';
import { AccountApiToken, createCloudflareApi, getZoneByDomain } from 'alchemy/cloudflare';
import { GitHubSecret, RepositoryEnvironment } from 'alchemy/github';
import { CloudflareStateStore } from 'alchemy/state';

const owner = 'spiritledsoftware';
const repository = 'theaistudybible';

/** Values copied verbatim from the operator's env file into the GitHub Environment. */
const passthroughSecrets = [
  'ALCHEMY_PASSWORD',
  'ALCHEMY_STATE_TOKEN',
  'AI_CONTEXT_SIZE',
  'APPLE_AUTH_KEY',
  'APPLE_CLIENT_ID',
  'APPLE_KEY_ID',
  'APPLE_TEAM_ID',
  'CLOUDFLARE_ACCOUNT_ID',
  'DONATION_LINK',
  'FREE_CHAT_DAILY_LIMIT',
  'FREE_IMAGE_DAILY_LIMIT',
  'FREE_SUGGESTION_DAILY_LIMIT',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OPENROUTER_API_KEY',
  'OPENROUTER_CHAT_MODEL',
  'OPENROUTER_EMBEDDING_DIMENSIONS',
  'OPENROUTER_EMBEDDING_MODEL',
  'OPENROUTER_IMAGE_MODEL',
  'OPENROUTER_RERANK_MODEL',
  'POSTHOG_API_HOST',
  'POSTHOG_API_KEY',
  'PRO_CHAT_DAILY_LIMIT',
  'PRO_IMAGE_DAILY_LIMIT',
  'PRO_SUGGESTION_DAILY_LIMIT',
  'SENTRY_DSN',
  'STRIPE_SECRET_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_PUBLIC_KEY',
  'TEST_USER_EMAIL',
  'TEST_USER_PASSWORD',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
] as const;

const app = await alchemy('theaistudybible-github', {
  stateStore: (scope) =>
    new CloudflareStateStore(scope, { scriptName: 'theaistudybible-alchemy-state' }),
});

if (!['production', 'staging', 'preview'].includes(app.stage)) {
  throw new Error(`Unknown GitHub Environment "${app.stage}"`);
}

const accountId = alchemy.env('CLOUDFLARE_ACCOUNT_ID');
const zone = await getZoneByDomain(await createCloudflareApi(), 'theaistudybible.com');
if (!zone) throw new Error('Cloudflare zone theaistudybible.com not found');

const deployToken = await AccountApiToken('deploy-token', {
  name: `theaistudybible-github-${app.stage}`,
  policies: [
    {
      effect: 'allow',
      permissionGroups: [
        'Workers Scripts Write',
        'D1 Write',
        'Workers R2 Storage Write',
        'Queues Write',
        'Vectorize Write',
        'Account Settings Read',
        'Workers Tail Read',
        'Workers Observability Write',
        'Email Sending Write',
      ],
      resources: { [`com.cloudflare.api.account.${accountId}`]: '*' },
    },
    {
      effect: 'allow',
      permissionGroups: [
        'Zone Read',
        'Workers Routes Write',
        'Zone DNS Settings Write',
        'DNS Write',
        'SSL and Certificates Write',
      ],
      resources: { [`com.cloudflare.api.account.zone.${zone.id}`]: '*' },
    },
  ],
});

await RepositoryEnvironment('environment', {
  name: app.stage,
  owner,
  repository,
  // Previews deploy from pull-request branches; staging and production only from main.
  ...(app.stage === 'preview'
    ? {}
    : {
        branchPatterns: ['main'],
        deploymentBranchPolicy: { customBranchPolicies: true, protectedBranches: false },
      }),
});

await GitHubSecret('CLOUDFLARE_API_TOKEN', {
  environment: app.stage,
  name: 'CLOUDFLARE_API_TOKEN',
  owner,
  repository,
  value: deployToken.value!,
});

const skipped: string[] = [];
for (const name of passthroughSecrets) {
  const value = process.env[name];
  if (!value) {
    skipped.push(name);
    continue;
  }
  await GitHubSecret(name, {
    environment: app.stage,
    name,
    owner,
    repository,
    value: alchemy.secret(value),
  });
}

if (skipped.length > 0) {
  console.warn(`Not set in the env file, so not written to GitHub: ${skipped.join(', ')}`);
}

await app.finalize();
