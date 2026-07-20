import { stripe } from '@/core/stripe';
import { getStripeData, syncStripeData } from '@/core/stripe/utils';
import { useSubscription } from '@/www/hooks/use-pro-subscription';
import { requireAuthMiddleware } from '@/www/server/middleware/auth';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { formatDate } from 'date-fns';
import { type ComponentProps, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';

const unsubscribe = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const { user } = context;
    if (!user.stripeCustomerId) throw new Error('User has no Stripe customer ID');

    const subData = await getStripeData(user.stripeCustomerId);
    if (subData.status !== 'active' && subData.status !== 'trialing') {
      throw new Error('User has no active subscription');
    }

    await stripe.subscriptions.update(subData.subscriptionId, { cancel_at_period_end: true });
    await syncStripeData(user.stripeCustomerId);
    return { success: true };
  });

const renew = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const { user } = context;
    if (!user.stripeCustomerId) throw new Error('User has no Stripe customer ID');

    const subData = await getStripeData(user.stripeCustomerId);
    if (subData.status !== 'active' && subData.status !== 'trialing') {
      throw new Error('User has no active subscription');
    }

    await stripe.subscriptions.update(subData.subscriptionId, { cancel_at_period_end: false });
    await syncStripeData(user.stripeCustomerId);
    return { success: true };
  });

export type SubscriptionButtonProps = Omit<ComponentProps<typeof Button>, 'children' | 'onClick'>;

export const SubscriptionButton = (props: SubscriptionButtonProps) => {
  const { isActive, subscription, refetch } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);

  const handleUnsubscribe = useMutation({
    mutationFn: () => unsubscribe(),
    onSuccess: () => {
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      refetch();
    },
  });

  const handleRenew = useMutation({
    mutationFn: () => renew(),
    onSuccess: () => {
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      refetch();
    },
  });

  if (isActive && subscription.cancelAtPeriodEnd) {
    return (
      <Button onClick={() => handleRenew.mutate()} {...props}>
        Renew
      </Button>
    );
  }

  if (isActive) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button {...props}>Unsubscribe</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsubscribe</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to unsubscribe? Your subscription will end on{' '}
            {formatDate(new Date(subscription.currentPeriodEnd * 1000), 'MMMM d, yyyy')}
          </DialogDescription>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleUnsubscribe.mutate()}>Unsubscribe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button {...props} asChild>
      <Link to='/pro'>Upgrade to Pro</Link>
    </Button>
  );
};
