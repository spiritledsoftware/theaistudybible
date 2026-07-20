import { db } from '@/core/database';
import {
  ApproveDataSourceButton,
  RejectDataSourceButton,
} from '@/www/components/admin/data-sources/approve-button';
import { DeleteDataSourceButton } from '@/www/components/admin/data-sources/delete-button';
import { EditDataSourceButton } from '@/www/components/admin/data-sources/edit-button';
import { SyncDataSourceButton } from '@/www/components/admin/data-sources/sync-button';
import { QueryBoundary } from '@/www/components/query-boundary';
import { Button } from '@/www/components/ui/button';
import { DataTable } from '@/www/components/ui/data-table';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { formatDate } from 'date-fns';
import { Pencil, RefreshCw, ShieldCheck, ShieldX, Trash } from 'lucide-react';
import { z } from 'zod';

export const Route = createFileRoute('/_with-sidebar/admin/data-sources')({
  component: RouteComponent,
});

const getSources = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      offset: z.number(),
      limit: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const sources = await db.query.dataSources.findMany({
      offset: data.offset,
      limit: data.limit,
    });
    return {
      sources,
      nextCursor: sources.length === data.limit ? data.offset + data.limit : null,
    };
  });

function RouteComponent() {
  const query = useInfiniteQuery({
    queryKey: ['data-sources'],
    queryFn: ({ pageParam }) => getSources({ data: { offset: pageParam ?? 0, limit: 10 } }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    refetchInterval: 10000,
  });

  return (
    <QueryBoundary query={query}>
      {({ pages }) => (
        <div className='flex flex-col gap-4'>
          <DataTable
            columns={[
              { accessorKey: 'id', header: 'ID' },
              { accessorKey: 'type', header: 'Type' },
              { accessorKey: 'name', header: 'Name' },
              {
                accessorKey: 'url',
                header: 'URL',
                cell: (props) => (
                  <div className='max-w-52 truncate'>{props.row.getValue('url')}</div>
                ),
              },
              {
                accessorKey: 'syncSchedule',
                header: 'Schedule',
              },
              {
                accessorKey: 'approvalStatus',
                header: 'Approval',
              },
              {
                accessorKey: 'numberOfDocuments',
                header: 'Documents',
              },
              {
                accessorKey: 'lastManualSync',
                header: 'Last Manual Sync',
                cell: (props) =>
                  props.row.getValue('lastManualSync')
                    ? formatDate(props.row.getValue('lastManualSync'), 'MM/dd/yyyy hh:mm a')
                    : 'N/A',
              },
              {
                accessorKey: 'lastAutomaticSync',
                header: 'Last Automatic Sync',
                cell: (props) =>
                  props.row.getValue('lastAutomaticSync')
                    ? formatDate(props.row.getValue('lastAutomaticSync'), 'MM/dd/yyyy hh:mm a')
                    : 'N/A',
              },
              {
                accessorKey: 'id',
                header: 'Actions',
                cell: (props) => (
                  <div className='flex gap-1'>
                    <ApproveDataSourceButton
                      variant='ghost'
                      size='icon'
                      dataSource={props.row.original}
                      className='size-8'
                      title='Approve Grounding Source'
                    >
                      <ShieldCheck />
                    </ApproveDataSourceButton>
                    <RejectDataSourceButton
                      variant='ghost'
                      size='icon'
                      dataSource={props.row.original}
                      className='size-8'
                      title='Reject Grounding Source'
                    >
                      <ShieldX />
                    </RejectDataSourceButton>
                    <SyncDataSourceButton
                      variant='ghost'
                      size='icon'
                      dataSource={props.row.original}
                      className='size-8'
                    >
                      <RefreshCw />
                    </SyncDataSourceButton>
                    <EditDataSourceButton
                      variant='ghost'
                      size='icon'
                      dataSource={props.row.original}
                      className='size-8'
                    >
                      <Pencil />
                    </EditDataSourceButton>
                    <DeleteDataSourceButton
                      variant='ghost'
                      size='icon'
                      dataSource={props.row.original}
                      className='size-8'
                    >
                      <Trash />
                    </DeleteDataSourceButton>
                  </div>
                ),
              },
            ]}
            data={pages.flatMap((page) => page.sources)}
          />
          {query.hasNextPage && <Button onClick={() => query.fetchNextPage()}>Load more</Button>}
        </div>
      )}
    </QueryBoundary>
  );
}
