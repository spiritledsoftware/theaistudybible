# Relaunch with fresh production state

Treat the revival as a clean production launch rather than a live migration. Do not carry forward prior Turso records, S3 objects, queue messages, vector indexes, or rate-limit counters; create new D1 and Cloudflare storage resources and rebuild canonical scripture/search data from source inputs. This removes dual-write, backfill, and zero-downtime cutover requirements because the application is already offline.

Squash the historical Turso migrations into one reviewed D1 baseline for the revived schema. Audit legacy Stripe billing before the reset, then notify, refund where appropriate, and cancel active legacy subscriptions so no customer remains charged without an application account.
