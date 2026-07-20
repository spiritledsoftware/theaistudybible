# Run the application on Cloudflare with Alchemy

Replace SST and the Fly-hosted web runtime with Alchemy-managed Cloudflare infrastructure. Move the web app, functions, queues, object storage/CDN, and scheduled jobs to Cloudflare-native runtime services; retain external SaaS services only where Cloudflare has no safe functional equivalent. This avoids leaving the application split across two infrastructure control planes.

Amazon SES remains the outbound email provider because replacing a proven transactional-delivery service during the runtime migration would add deliverability risk without improving application parity. Cloudflare Workers will access SES with narrowly scoped credentials; no application compute remains on AWS.

Move relational data from Turso/libSQL to Cloudflare D1. The fresh production reset removes data-migration risk, while D1 gives the Workers runtime and Alchemy-managed preview environments a native, credential-free SQLite database.

Application code runs only in Cloudflare Workers, including queue consumers and scheduled work. Cloudflare Containers are not an escape hatch; Node-only libraries must be replaced or adapted while preserving their behavior.
