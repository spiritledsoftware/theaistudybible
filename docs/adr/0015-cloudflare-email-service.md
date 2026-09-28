# Send outbound email with Cloudflare Email Service

Move outbound email from Amazon SES to Cloudflare Email Service. The background Worker sends through a `send_email` binding restricted to `noreply@theaistudybible.com`, and Alchemy manages the sending domain and binding alongside the rest of the Cloudflare infrastructure, so no AWS credentials or AWS control plane remain in the application.

Cloudflare Email Service is in beta. We accept that risk because outbound volume is low and limited to transactional mail (password resets, devotion emails, and operator dead-letter summaries); send failures surface in Sentry and queued emails retry through the existing idempotent email queue.

Sending-domain onboarding creates the SPF, DKIM, and DMARC DNS records in the Cloudflare zone, so deliverability records live with the domain rather than being maintained by hand.
