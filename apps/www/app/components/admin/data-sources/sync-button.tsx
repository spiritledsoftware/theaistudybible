import { db } from '@/core/database';
import { env } from '@/core/env';
import type { DataSource } from '@/schemas/data-sources/types';
import { requireAdminMiddleware } from '@/www/server/middleware/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../ui/button';

const queueSyncDataSource = createServerFn({ method: 'POST' })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const source = await db.query.dataSources.findFirst({
      where: (table, { eq }) => eq(table.id, data.id),
      columns: { approvalStatus: true },
    });
    if (source?.approvalStatus !== 'APPROVED') {
      throw new Error('Grounding Source must be approved before indexing');
    }
    await env.GROUNDING_SOURCE_QUEUE.send({ id: data.id, manual: true });
    return { success: true };
  });

export type SyncDataSourceButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick'> & {
  dataSource: DataSource;
};

const SyncDataSourceButton = ({ dataSource, ...props }: SyncDataSourceButtonProps) => {
  const queryClient = useQueryClient();

  const handleClick = useMutation({
    mutationFn: () => queueSyncDataSource({ data: { id: dataSource.id } }),
    onSuccess: () => {
      toast.success('Data source sync queued');
    },
    onError: () => {
      toast.error('Failed to queue data source sync');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
    },
  });

  return (
    <Button
      disabled={dataSource.approvalStatus !== 'APPROVED' || handleClick.isPending}
      onClick={() => handleClick.mutate()}
      {...props}
    />
  );
};

export { SyncDataSourceButton };
