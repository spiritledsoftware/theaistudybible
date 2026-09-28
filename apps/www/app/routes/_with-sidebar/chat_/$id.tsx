import { ChatWindow } from '@/www/components/chat/window';
import { getChatMessagesQueryProps, getChatQueryProps } from '@/www/hooks/use-chat';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/_with-sidebar/chat_/$id')({
  params: z.object({
    id: z.string(),
  }),
  validateSearch: z.object({
    query: z.string().optional(),
  }),
  beforeLoad: async ({ params, context }) => {
    const qc = context.queryClient;
    await Promise.all([
      qc.prefetchQuery(getChatQueryProps(params.id)),
      qc.prefetchInfiniteQuery(getChatMessagesQueryProps(params.id)),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return <ChatWindow id={id} />;
}
