import { vectorStore } from '@/ai/vector-store';
import { db } from '@/core/database';
import { dataSources } from '@/core/database/schema';
import { env } from '@/core/env';
import type { DataSource } from '@/schemas/data-sources/types';
import { requireAdminMiddleware } from '@/www/server/middleware/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '../../ui/button';

const reviewGroundingSource = createServerFn({ method: 'POST' })
  .middleware([requireAdminMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      decision: z.enum(['APPROVED', 'REJECTED']),
    }),
  )
  .handler(async ({ data, context }) => {
    const source = await db.query.dataSources.findFirst({
      where: (table, { eq: equals }) => equals(table.id, data.id),
    });
    if (!source) throw new Error('Grounding Source not found');
    if (data.decision === 'APPROVED') {
      if (
        !source.rightsBasis ||
        !source.attribution ||
        !source.checksum ||
        source.version === 'unspecified' ||
        source.traditionClassification.length === 0
      ) {
        throw new Error(
          'Version, SHA-256 checksum, rights basis, attribution, and tradition classification are required before approval',
        );
      }
    } else {
      const indexedDocuments = await db.query.dataSourcesToSourceDocuments.findMany({
        where: (table, { eq: equals }) => equals(table.dataSourceId, source.id),
        columns: { sourceDocumentId: true },
      });
      if (indexedDocuments.length > 0) {
        await vectorStore.deleteDocuments(
          indexedDocuments.map(({ sourceDocumentId }) => sourceDocumentId),
        );
      }
    }

    await db
      .update(dataSources)
      .set({
        approvalStatus: data.decision,
        approvedAt: data.decision === 'APPROVED' ? new Date() : null,
        approvedBy: context.user.id,
        ...(data.decision === 'REJECTED' ? { numberOfDocuments: 0 } : {}),
      })
      .where(eq(dataSources.id, source.id));
    if (data.decision === 'APPROVED') {
      await env.GROUNDING_SOURCE_QUEUE.send({ id: source.id, manual: true });
    }
    return { success: true };
  });

export type ApproveDataSourceButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick'> & {
  dataSource: DataSource;
};

export function ApproveDataSourceButton({ dataSource, ...props }: ApproveDataSourceButtonProps) {
  const queryClient = useQueryClient();
  const approval = useMutation({
    mutationFn: () => reviewGroundingSource({ data: { id: dataSource.id, decision: 'APPROVED' } }),
    onSuccess: () => {
      toast.success('Grounding Source approved and queued for indexing');
      queryClient.invalidateQueries({ queryKey: ['data-sources'] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      {...props}
      disabled={dataSource.approvalStatus === 'APPROVED' || approval.isPending}
      onClick={() => approval.mutate()}
    />
  );
}

export function RejectDataSourceButton({ dataSource, ...props }: ApproveDataSourceButtonProps) {
  const queryClient = useQueryClient();
  const rejection = useMutation({
    mutationFn: () => reviewGroundingSource({ data: { id: dataSource.id, decision: 'REJECTED' } }),
    onSuccess: () => {
      toast.success('Grounding Source rejected');
      queryClient.invalidateQueries({ queryKey: ['data-sources'] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      {...props}
      disabled={dataSource.approvalStatus === 'REJECTED' || rejection.isPending}
      onClick={() => rejection.mutate()}
    />
  );
}
