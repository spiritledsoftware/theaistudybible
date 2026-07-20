import {
  getApprovedChristianTraditions,
  isChristianTraditionApproved,
} from '@/core/christian-tradition-approvals';
import { CHRISTIAN_TRADITION_LABELS, type ChristianTradition } from '@/core/christian-traditions';
import { db } from '@/core/database';
import { userSettings } from '@/core/database/schema';
import { UpdateUserSettingsSchema } from '@/schemas/users/settings';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/www/components/ui/form';
import { useAuth } from '@/www/hooks/use-auth';
import { requireAuthMiddleware } from '@/www/server/middleware/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { SmallBiblePicker } from '../../bible/small-bible-picker';
import { PushNotificationToggle } from '../../push-notification-toggle';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Switch } from '../../ui/switch';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const getAvailableChristianTraditions = createServerFn({ method: 'GET' }).handler(async () => {
  const approvals = await getApprovedChristianTraditions();
  return approvals.map((approval) => approval.tradition);
});

const updateSettings = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(UpdateUserSettingsSchema)
  .handler(async ({ context, data }) => {
    if (data.christianTradition && !(await isChristianTraditionApproved(data.christianTradition))) {
      throw new Error('This Christian Tradition is not currently approved');
    }
    const { user } = context;
    let settings = await db.query.userSettings.findFirst({
      where: (userSettings, { eq }) => eq(userSettings.userId, user.id),
    });
    if (settings) {
      [settings] = await db
        .update(userSettings)
        .set(data)
        .where(eq(userSettings.userId, user.id))
        .returning();
    } else {
      [settings] = await db
        .insert(userSettings)
        .values({ userId: user.id, ...data })
        .returning();
    }
    return { settings };
  });

export function SettingsCard() {
  const { settings, refetch } = useAuth();
  const approvedTraditions = useQuery({
    queryKey: ['approved-christian-traditions'],
    queryFn: () => getAvailableChristianTraditions(),
    staleTime: 1000 * 60 * 5,
  });

  const form = useForm<z.infer<typeof UpdateUserSettingsSchema>>({
    resolver: zodResolver(UpdateUserSettingsSchema),
    defaultValues: settings || { emailNotifications: true },
  });

  const [toastId, setToastId] = useState<string | number>();
  const handleSubmit = useMutation({
    mutationFn: (values: z.infer<typeof UpdateUserSettingsSchema>) =>
      updateSettings({ data: values }),
    onMutate: () => {
      setToastId(toast.loading('Updating settings...', { duration: Number.POSITIVE_INFINITY }));
    },
    onSuccess: () => {
      toast.dismiss(toastId);
      toast.success('Settings updated');
    },
    onError: (error) => {
      toast.dismiss(toastId);
      toast.error(error.message);
    },
    onSettled: () => refetch(),
  });

  return (
    <Card className='flex h-full w-full flex-col'>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Manage your account settings and preferences.</CardDescription>
      </CardHeader>
      <CardContent className='flex h-full w-full flex-1 flex-col'>
        <Form {...form}>
          <form
            className='flex grow flex-col gap-6'
            onSubmit={form.handleSubmit((values) => handleSubmit.mutateAsync(values))}
          >
            <div className='flex h-full flex-1 flex-col gap-6'>
              <div className='flex items-center gap-12'>
                <div className='flex flex-col gap-6'>
                  <PushNotificationToggle />
                  <FormField
                    control={form.control}
                    name='emailNotifications'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Notifications</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(v) => {
                              form.setValue(field.name, v);
                            }}
                            className='flex items-center gap-2'
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name='preferredBibleAbbreviation'
                  render={({ field }) => (
                    <div className='flex flex-col gap-2'>
                      <FormItem>
                        <FormLabel>Preferred Bible</FormLabel>
                        <FormControl>
                          <SmallBiblePicker
                            value={field.value ?? undefined}
                            onValueChange={(b) => form.setValue(field.name, b?.abbreviation)}
                            className='w-fit'
                          />
                        </FormControl>
                      </FormItem>
                    </div>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name='aiInstructions'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Preferences</FormLabel>
                    <FormControl>
                      <Textarea {...field} maxLength={1_000} value={field.value ?? undefined} />
                    </FormControl>
                    <FormDescription>
                      Optional preferences for tone, response length, reading level, and study
                      goals.
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='christianTradition'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Christian Tradition</FormLabel>
                    <Select
                      value={field.value ?? 'NONE'}
                      onValueChange={(value) =>
                        field.onChange(value === 'NONE' ? null : (value as ChristianTradition))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='No preference' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='NONE'>No preference</SelectItem>
                        {(approvedTraditions.data ?? []).map((tradition) => (
                          <SelectItem key={tradition} value={tradition}>
                            {CHRISTIAN_TRADITION_LABELS[tradition]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional. Saving this preference stores it with your Account and frames
                      disputed theological questions. It is never inferred or sent to analytics.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={form.formState.isSubmitting || form.formState.isLoading}
              >
                Save
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
