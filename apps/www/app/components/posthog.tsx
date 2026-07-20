import { posthog } from 'posthog-js';
import { useEffect } from 'react';

export const PostHog = () => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
        api_host: import.meta.env.VITE_POSTHOG_API_HOST,
        opt_out_capturing_by_default: import.meta.env.VITE_STAGE !== 'production',
        disable_session_recording: true,
      });
    }
  }, []);

  return null;
};
