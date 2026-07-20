import { db } from '@/core/database';
import { vectorStore } from '@/ai/vector-store';
import { dataSources } from '@/core/database/schema';
import { getPrivateSourceKey, getPrivateSourcesBucket } from '@/core/storage';
import type { DataSource } from '@/schemas/data-sources/types';
import { requireAdminMiddleware } from '@/www/server/middleware/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
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

const deleteDataSource = createServerFn({ method: 'POST' })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const dataSource = await db.query.dataSources.findFirst({
      where: (table, { eq: equals }) => equals(table.id, data.id),
    });
    if (!dataSource) return { dataSource: null };

    const indexedDocuments = await db.query.dataSourcesToSourceDocuments.findMany({
      where: (table, { eq: equals }) => equals(table.dataSourceId, data.id),
      columns: { sourceDocumentId: true },
    });
    if (indexedDocuments.length > 0) {
      await vectorStore.deleteDocuments(
        indexedDocuments.map(({ sourceDocumentId }) => sourceDocumentId),
      );
    }

    const privateSourceKey = getPrivateSourceKey(dataSource.url);
    if (privateSourceKey) {
      await getPrivateSourcesBucket().delete(privateSourceKey);
    }

    await db.delete(dataSources).where(eq(dataSources.id, data.id));
    return { dataSource };
  });

export type DeleteDataSourceButtonProps = React.ComponentProps<typeof Button> & {
  dataSource: DataSource;
};

export const DeleteDataSourceButton = ({ dataSource, ...props }: DeleteDataSourceButtonProps) => {
  const qc = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = useMutation({
    mutationFn: () => deleteDataSource({ data: { id: dataSource.id } }),
    onSuccess: () => {
      setIsOpen(false);
      toast.success('Data source deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['data-sources'] }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='destructive' {...props} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Data Source</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {dataSource.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={() => handleDelete.mutate()}
            disabled={handleDelete.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
