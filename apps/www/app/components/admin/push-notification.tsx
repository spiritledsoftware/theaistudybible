import { env } from '@/core/env';
import { requireAdminMiddleware } from '@/www/server/middleware/auth';
import { useMutation } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

const triggerPushNotification = createServerFn({ method: 'POST' })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      title: z.string().min(1, 'Title is required'),
      body: z.string().min(1, 'Body is required'),
      url: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await env.NOTIFICATION_QUEUE.send({
      title: data.title,
      body: data.body,
      url: data.url || '/',
    });
    return { success: true };
  });

export const PushNotificationContent = () => {
  const [toastId, setToastId] = useState<string | number>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');

  const triggerNotificationMutation = useMutation({
    mutationFn: () => triggerPushNotification({ data: { title, body, url } }),
    onMutate: () => {
      setToastId(toast.loading('Sending notifications...', { duration: Number.POSITIVE_INFINITY }));
    },
    onSuccess: () => {
      toast.dismiss(toastId);
      toast.success('Notifications sent!');
      setTitle('');
      setBody('');
      setUrl('');
    },
    onError: (error) => {
      toast.dismiss(toastId);
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Push Notification</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Notification Title'
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder='Notification Body'
        />
        <Input
          type='url'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder='URL (optional)'
        />
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => triggerNotificationMutation.mutate()}
          disabled={!title || !body || triggerNotificationMutation.isPending}
        >
          Send Notification
        </Button>
      </CardFooter>
    </Card>
  );
};
