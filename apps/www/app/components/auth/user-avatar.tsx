import { useAuth } from '@/www/hooks/use-auth';
import { useSubscription } from '@/www/hooks/use-pro-subscription';
import { cn } from '@/www/lib/utils';
import { type ComponentProps, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

export const UserAvatar = ({ className, ...rest }: ComponentProps<typeof Avatar>) => {
  const { user } = useAuth();
  const { isPro } = useSubscription();

  const src = useMemo(() => user?.image || undefined, [user]);
  const fallback = useMemo(
    () =>
      `${user?.firstName?.charAt(0) || user?.email?.charAt(0) || '?'}${
        user?.lastName?.charAt(0) || ''
      }`,
    [user],
  );

  return (
    <span className={cn('relative', className)}>
      <Avatar className={cn('relative size-10', className)} {...rest}>
        <AvatarImage src={src} className='size-full' />
        <AvatarFallback className='size-full'>{fallback}</AvatarFallback>
      </Avatar>
      {isPro ? (
        <Badge
          variant='outline'
          className='-right-2 -bottom-2 absolute h-fit w-fit bg-card px-1 py-0.5 text-[8px]'
        >
          Pro
        </Badge>
      ) : null}
    </span>
  );
};
