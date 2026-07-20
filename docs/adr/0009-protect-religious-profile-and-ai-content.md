# Protect religious-profile and AI content as sensitive data

Treat Christian Tradition as an optional sensitive preference: require an explicit save action and purpose disclosure, never infer it, exclude it from analytics and logs, allow it to be cleared, and delete it with the account. Disable OpenRouter prompt logging and require Zero Data Retention for every AI request, accepting a smaller eligible provider pool to prevent chat and religious-profile content from being retained for inference.

Remove Braintrust rather than copy production prompts and responses into a separate trace store. Operational telemetry may include model, cost, latency, tool names, status, and anonymous correlation identifiers, but never message content, scripture notes, identity, or Christian Tradition; full-content evaluation uses only a separate curated corpus.
