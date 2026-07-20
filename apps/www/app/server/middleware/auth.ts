import type { Role } from '@/schemas/roles/types';
import type { Session, User, UserSettings } from '@/schemas/users/types';
import { redirect } from '@tanstack/react-router';
import { createMiddleware } from '@tanstack/react-start';
import { authenticate, getUserRolesAndSettings } from '../utils/authenticate';

type AuthContext = {
  session: Session | null;
  user: User | null;
  settings: UserSettings | null;
  roles: Role[] | null;
};

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { session, user } = await authenticate();
  if (!session || !user) {
    return next({
      context: { session: null, user: null, settings: null, roles: null } as AuthContext,
    });
  }
  const { settings, roles } = await getUserRolesAndSettings(user.id);
  return next({ context: { session, user, roles, settings } as AuthContext });
});

export const requireAuthMiddleware = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(({ context, next }) => {
    if (!context.session || !context.user) {
      throw redirect({ to: '/sign-in' });
    }
    return next({
      context: {
        ...context,
        session: context.session as Session,
        user: context.user as User,
        settings: context.settings as UserSettings,
        roles: context.roles as Role[],
      },
    });
  });

export const requireAdminMiddleware = createMiddleware({ type: 'function' })
  .middleware([requireAuthMiddleware])
  .server(({ context, next }) => {
    if (!context.roles?.some((role) => role.id === 'admin')) {
      throw redirect({ to: '/' });
    }
    return next();
  });
