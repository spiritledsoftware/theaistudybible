interface ImportMetaEnv {
  readonly VITE_DONATION_LINK: string;
  readonly VITE_POSTHOG_API_HOST: string;
  readonly VITE_POSTHOG_API_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_STAGE: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
