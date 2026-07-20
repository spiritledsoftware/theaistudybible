# Use Durable Objects for exact rate limits

Replace Upstash Redis rate-limit state with Cloudflare Durable Objects. Workers KV was rejected because eventual consistency and non-atomic updates cannot preserve global sliding-window quotas or token rollback under concurrency; a Durable Object will serialize each limiter key and retain those observable semantics.
