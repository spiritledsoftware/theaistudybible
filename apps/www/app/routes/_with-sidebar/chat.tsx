import { getChatsQueryOptions } from '@/www/components/chat/sidebar';
import { ChatWindow } from '@/www/components/chat/window';
import { useChatStore } from '@/www/contexts/chat';
import { Navigate, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/_with-sidebar/chat')({
  beforeLoad: async ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: '/sign-in', search: { redirectUrl: location.href } });
    }

    const qc = context.queryClient;
    await qc.prefetchInfiniteQuery(getChatsQueryOptions());
  },
  validateSearch: z.object({
    query: z.string().optional(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const chat = useChatStore((s) => s.chat);
  if (chat) {
    return <Navigate to='/chat/$id' params={{ id: chat.id }} />;
  }

  return <ChatWindow />;
}
