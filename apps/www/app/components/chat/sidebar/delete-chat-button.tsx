import { db } from '@/core/database';
import { chats } from '@/core/database/schema';
import type { Chat } from '@/schemas/chats/types';
import { Button } from '@/www/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/www/components/ui/dialog';
import { useChatStore } from '@/www/contexts/chat';
import { requireAuthMiddleware } from '@/www/server/middleware/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

// Create server function for deleting chats
const deleteChatServerFn = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(z.object({ chatId: z.string() }))
  .handler(async ({ data, context }) => {
    // Server-side auth check and database delete
    await db.delete(chats).where(and(eq(chats.userId, context.user.id), eq(chats.id, data.chatId)));
    return { success: true };
  });

export type DeleteChatButtonProps = {
  chat: Chat;
};

export const DeleteChatButton = (props: DeleteChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { chat, setChat } = useChatStore((state) => ({
    chat: state.chat,
    setChat: state.setChat,
  }));

  // Setup mutation for deleting chat
  const deleteChatMutation = useMutation({
    mutationFn: () => deleteChatServerFn({ data: { chatId: props.chat.id } }),
    onSuccess: () => {
      setIsOpen(false);
      // Handle navigation and state updates
      if (chat?.id === props.chat.id) {
        setChat(null);
        if (location.pathname.startsWith('/chat')) {
          navigate({ to: '/chat' });
        }
      }
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast.success('Chat deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete chat');
    },
  });

  const handleDelete = () => {
    deleteChatMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' className='size-8'>
          <Trash size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure you want to delete this chat?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant='destructive'
            onClick={handleDelete}
            disabled={deleteChatMutation.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
