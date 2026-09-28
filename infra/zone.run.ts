/**
 * Zone-wide configuration for theaistudybible.com that every stage shares, deployed once by the
 * operator rather than by each stage (destroying a preview must never touch it):
 *
 *   pnpm exec alchemy deploy infra/zone.run.ts --stage production --env-file .env.production
 *
 * - Email Service sending for noreply@theaistudybible.com (the background worker's EMAIL binding).
 * - Email Routing: every inbound address, including the info@ reply-to and the terms@/privacy@
 *   contacts on the legal pages, forwards to the maintainer's inbox. Cloudflare emails that inbox
 *   a verification link on first deploy; forwarding starts once it is clicked.
 */
import alchemy from 'alchemy';
import { EmailAddress, EmailCatchAll, EmailRouting } from 'alchemy/cloudflare';
import { CloudflareStateStore } from 'alchemy/state';
import { EmailSendingDomain } from './email-sending-domain.ts';

const zone = 'theaistudybible.com';
const forwardTo = 'ian.g.pascoe@gmail.com';

const app = await alchemy('theaistudybible-zone', {
  stateStore: (scope) =>
    new CloudflareStateStore(scope, { scriptName: 'theaistudybible-alchemy-state' }),
});

await EmailSendingDomain('email-sending-domain', { name: zone });

await EmailRouting('email-routing', { enabled: true, skipWizard: true, zone });
const destination = await EmailAddress('forward-destination', { email: forwardTo });

await EmailCatchAll('forward-all', {
  actions: [{ type: 'forward', value: [destination.email] }],
  enabled: true,
  zone,
});

console.log({ destinationVerified: destination.verified, forwardTo, zone });

await app.finalize();
