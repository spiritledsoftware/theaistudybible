import { useQuery } from '@tanstack/react-query';
import posthog from 'posthog-js';
import { useEffect, useMemo } from 'react';
import { getAuth } from '../server/functions/auth';

let hasResetAnalyticsIdentity = false;

export const useAuth = () => {
  const { data, refetch } = useQuery({
    queryKey: ['auth'],
    queryFn: () => getAuth(),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) =>
      prev ??
      ({
        auth: {
          session: undefined,
          user: undefined,
          settings: undefined,
          roles: undefined,
        },
      } as unknown as Awaited<ReturnType<typeof getAuth>>),
  });

  const user = useMemo(() => data?.auth.user, [data?.auth.user]);

  useEffect(() => {
    if (user === undefined || hasResetAnalyticsIdentity) return;
    posthog.reset();
    hasResetAnalyticsIdentity = true;
  }, [user]);

  const session = useMemo(() => data?.auth.session, [data?.auth.session]);
  const roles = useMemo(() => data?.auth.roles, [data?.auth.roles]);
  const settings = useMemo(() => data?.auth.settings, [data?.auth.settings]);

  return {
    session,
    user,
    roles,
    settings,
    isLoaded: useMemo(
      () =>
        session !== undefined &&
        user !== undefined &&
        settings !== undefined &&
        roles !== undefined,
      [session, user, settings, roles],
    ),
    isSignedIn: useMemo(() => session !== null && user !== null, [session, user]),
    isAdmin: useMemo(() => roles?.some((role) => role.id === 'admin') ?? false, [roles]),
    refetch,
  };
};
