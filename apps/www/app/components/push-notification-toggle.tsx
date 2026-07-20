import { env } from '@/core/env';
import { db } from '@/core/database';
import { pushSubscriptions } from '@/core/database/schema';
import { useMutation } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useServiceWorker } from '../contexts/service-worker';
import { requireAuthMiddleware } from '../server/middleware/auth';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

const getVapidPublicKey = createServerFn({ method: 'GET' }).handler(() => {
  return { publicKey: env.VAPID_PUBLIC_KEY };
});

const subscribeToPushNotifications = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      endpoint: z.string().min(1),
      keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    }),
  )
  .handler(async ({ data, context }) => {
    await db.insert(pushSubscriptions).values({
      userId: context.user.id,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    });
    return { success: true };
  });

const unsubscribeFromPushNotifications = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      endpoint: z.string().min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, context.user.id),
          eq(pushSubscriptions.endpoint, data.endpoint),
        ),
      );
    return { success: true };
  });

export type PushNotificationToggleProps = {
  onSuccess?: () => void;
};

export function PushNotificationToggle(props: PushNotificationToggleProps) {
  const { registration } = useServiceWorker();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    // Check if push notifications are supported
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
  }, []);

  useEffect(() => {
    if (!registration) return;

    // Check if already subscribed
    try {
      registration.pushManager.getSubscription().then((subscription) => {
        setIsSubscribed(!!subscription);
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  }, [registration]);

  const handleSubscribeToPushNotifications = useMutation({
    mutationFn: async () => {
      if (!registration) {
        throw new Error('No service worker registration found');
      }

      // Get the push subscription
      let subscription = await registration.pushManager.getSubscription();
      // If not subscribed, create a new subscription
      if (!subscription) {
        const { publicKey } = await getVapidPublicKey();
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.endpoint || !subscriptionJson.keys) {
        throw new Error('No endpoint or keys found in subscription');
      }
      // Send the subscription to your server
      await subscribeToPushNotifications({
        data: {
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: subscriptionJson.keys.p256dh,
            auth: subscriptionJson.keys.auth,
          },
        },
      });
    },
    onSuccess: () => {
      setIsSubscribed(true);
      toast.success('Successfully subscribed to notifications');
      props.onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to subscribe to notifications: ${error.message}`);
    },
  });

  const handleUnsubscribeFromPushNotifications = useMutation({
    mutationFn: async () => {
      if (!registration) {
        throw new Error('No service worker registration found');
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        // Notify your server about the unsubscription
        await unsubscribeFromPushNotifications({
          data: { endpoint: subscription.endpoint },
        });
      }
    },
    onSuccess: () => {
      setIsSubscribed(false);
      toast.success('Successfully unsubscribed from notifications');
      props.onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to unsubscribe from notifications: ${error.message}`);
    },
  });

  return (
    <div className='flex items-center gap-2'>
      <Label>Push Notifications</Label>
      <Switch
        disabled={!isSupported}
        checked={isSubscribed}
        onChange={(v) =>
          v
            ? handleSubscribeToPushNotifications.mutate()
            : handleUnsubscribeFromPushNotifications.mutate()
        }
      />
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
