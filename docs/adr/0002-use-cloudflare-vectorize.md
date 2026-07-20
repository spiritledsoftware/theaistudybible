# Use Cloudflare Vectorize for semantic scripture search

Replace Upstash Vector with Cloudflare Vectorize so the application’s vector storage runs on the target platform. This deliberately accepts a re-indexing and relevance-validation cutover instead of preserving the existing provider; semantic-search behavior must be benchmarked before production traffic moves.
