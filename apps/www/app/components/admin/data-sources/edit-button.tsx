import { vectorStore } from '@/ai/vector-store';
import { db } from '@/core/database';
import { dataSources } from '@/core/database/schema';
import { UpdateDataSourceSchema } from '@/schemas/data-sources';
import type { DataSource } from '@/schemas/data-sources/types';
import { requireAdminMiddleware } from '@/www/server/middleware/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { eq, getTableColumns } from 'drizzle-orm';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ZodIssueCode, z } from 'zod';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';

const EditableDataSourceSchema = UpdateDataSourceSchema.omit({
  approvalStatus: true,
  approvedAt: true,
  approvedBy: true,
  numberOfDocuments: true,
});

const editDataSource = createServerFn({ method: 'POST' })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string(),
      data: EditableDataSourceSchema,
    }),
  )
  .handler(async ({ data }) => {
    const existing = await db.query.dataSources.findFirst({
      where: (table, { eq: equals }) => equals(table.id, data.id),
    });
    if (!existing) return { dataSource: null };

    const requiresReapproval =
      (data.data.url !== undefined && data.data.url !== existing.url) ||
      (data.data.type !== undefined && data.data.type !== existing.type) ||
      (data.data.version !== undefined && data.data.version !== existing.version) ||
      (data.data.checksum !== undefined && data.data.checksum !== existing.checksum) ||
      (data.data.rightsBasis !== undefined && data.data.rightsBasis !== existing.rightsBasis) ||
      (data.data.attribution !== undefined && data.data.attribution !== existing.attribution) ||
      (data.data.metadata !== undefined &&
        JSON.stringify(data.data.metadata) !== JSON.stringify(existing.metadata)) ||
      (data.data.traditionClassification !== undefined &&
        JSON.stringify(data.data.traditionClassification) !==
          JSON.stringify(existing.traditionClassification));

    if (requiresReapproval) {
      const indexedDocuments = await db.query.dataSourcesToSourceDocuments.findMany({
        where: (table, { eq: equals }) => equals(table.dataSourceId, data.id),
        columns: { sourceDocumentId: true },
      });
      if (indexedDocuments.length > 0) {
        await vectorStore.deleteDocuments(
          indexedDocuments.map(({ sourceDocumentId }) => sourceDocumentId),
        );
      }
    }

    const [dataSource] = await db
      .update(dataSources)
      .set(
        requiresReapproval
          ? {
              ...data.data,
              approvalStatus: 'PENDING',
              approvedAt: null,
              approvedBy: null,
              numberOfDocuments: 0,
            }
          : data.data,
      )
      .where(eq(dataSources.id, data.id))
      .returning();
    return { dataSource };
  });

const UpdateDataSourceFormSchema = UpdateDataSourceSchema.extend({
  metadata: z
    .record(z.string(), z.string())
    .or(
      z.string().transform((str, ctx) => {
        if (!str) {
          return {};
        }
        try {
          return JSON.parse(str);
        } catch (e) {
          ctx.addIssue({
            code: ZodIssueCode.custom,
            message: (e as Error).message,
          });
          return z.NEVER;
        }
      }),
    )
    .optional(),
});

export type EditDataSourceButtonProps = React.ComponentProps<typeof Button> & {
  dataSource: DataSource;
};

export const EditDataSourceButton = ({ dataSource, ...props }: EditDataSourceButtonProps) => {
  const qc = useQueryClient();

  const form = useForm<z.infer<typeof UpdateDataSourceFormSchema>>({
    resolver: zodResolver(UpdateDataSourceFormSchema),
    defaultValues: {
      name: dataSource.name,
      url: dataSource.url,
      type: dataSource.type,
      syncSchedule: dataSource.syncSchedule,
      metadata: JSON.stringify(dataSource.metadata, null, 2),
    },
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = useMutation({
    mutationFn: (data: z.infer<typeof UpdateDataSourceFormSchema>) =>
      editDataSource({ data: { id: dataSource.id, data } }),
    onSuccess: () => {
      setIsOpen(false);
      toast.success('Data source updated');
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['data-sources'] }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button {...props} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Data Source</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => handleSubmit.mutate(data))}>
            <div className='flex flex-col gap-4'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem className='flex flex-col gap-2'>
                    <FormLabel>Type</FormLabel>
                    <Select {...field}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getTableColumns(dataSources).type.enumValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='flex flex-col gap-2'>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='url'
                render={({ field }) => (
                  <FormItem className='flex flex-col gap-2'>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input type='url' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='metadata'
                render={({ field }) => (
                  <FormItem className='flex flex-col gap-2'>
                    <FormLabel>Metadata (JSON)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='syncSchedule'
                render={({ field }) => (
                  <FormItem className='flex flex-col gap-2'>
                    <FormLabel>Sync Schedule</FormLabel>
                    <Select {...field}>
                      <FormControl>
                        <SelectTrigger className='w-fit min-w-24'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getTableColumns(dataSources).syncSchedule.enumValues.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type='submit' disabled={form.formState.isSubmitting}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
