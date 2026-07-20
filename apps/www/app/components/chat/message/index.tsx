import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/www/components/ui/accordion';
import { Button } from '@/www/components/ui/button';
import { cn } from '@/www/lib/utils';
import type { useChat } from '@/www/hooks/use-chat';
import { getMessageId } from '@/www/utils/message';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { UserAvatar } from '../../auth/user-avatar';
import { Icon } from '../../branding/icon';
import { MemoizedMarkdown } from '../../ui/memoized-markdown';
import { MessageReactionButtons } from './reaction-buttons';
import { Tool } from './tools';

export type MessageProps = {
  previousMessage?: UIMessage;
  nextMessage?: UIMessage;
  message: UIMessage;
  addToolResult: ReturnType<typeof useChat>['addToolResult'];
  isLoading: boolean;
};

export const Message = ({
  message,
  previousMessage,
  nextMessage,
  addToolResult,
  isLoading,
}: MessageProps) => {
  const [, copy] = useCopyToClipboard();
  const messageText = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');

  return (
    <article
      className={cn(
        'flex w-full max-w-3xl space-x-4 overflow-hidden px-3 py-4',
        previousMessage?.role === message.role ? 'border-t-0' : 'border-t',
      )}
      aria-label={`${message.role === 'assistant' ? 'AI' : 'User'} message`}
    >
      <div className='mt-2 flex h-full w-10 shrink-0 items-start'>
        {previousMessage?.role !== message.role &&
          (message.role === 'user' ? (
            <UserAvatar className='size-10 shrink-0' aria-label='User avatar' />
          ) : message.role === 'assistant' ? (
            <div
              role='img'
              className={cn(
                'relative flex size-10 shrink-0 place-items-center justify-center rounded-full bg-primary p-2',
                isLoading &&
                  !nextMessage &&
                  'before:absolute before:inset-0 before:scale-110 before:animate-spin before:rounded-full before:border-3 before:border-accent-foreground before:border-t-transparent before:border-r-transparent before:border-l-transparent before:duration-500',
              )}
              aria-label='AI assistant avatar'
            >
              <Icon width={300} height={300} className='shrink-0' aria-hidden='true' />
            </div>
          ) : null)}
      </div>
      <div className='flex w-full flex-col gap-4 overflow-hidden'>
        {message.parts.map((part, idx) => {
          if (part.type === 'text') {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: AI SDK text parts have no stable identifier and are append-only
              <MemoizedMarkdown key={`${part.type}-${idx}`} id={message.id}>
                {part.text}
              </MemoizedMarkdown>
            );
          }
          if (part.type === 'reasoning') {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: AI SDK reasoning parts have no stable identifier and are append-only
              <Accordion key={`${part.type}-${idx}`} type='single' collapsible>
                <AccordionItem value='reasoning'>
                  <AccordionTrigger className='text-muted-foreground text-sm'>
                    View reasoning
                  </AccordionTrigger>
                  <AccordionContent>
                    <MemoizedMarkdown id={message.id}>{part.text}</MemoizedMarkdown>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          }
          if (isToolUIPart(part)) {
            return (
              <Tool
                key={part.toolCallId}
                toolInvocation={{
                  args: part.input,
                  result: part.state === 'output-available' ? part.output : undefined,
                  toolCallId: part.toolCallId,
                  toolName: getToolName(part),
                }}
                addToolResult={addToolResult}
                isLoading={isLoading && !nextMessage}
              />
            );
          }
          return null;
        })}
        {message.role === 'assistant' && message.role !== nextMessage?.role && (
          <div className='flex items-center gap-1' role='toolbar' aria-label='Message actions'>
            <Button
              variant='ghost'
              className='h-fit w-fit p-1'
              onClick={() => {
                copy(messageText);
                toast.success('Text copied');
              }}
              aria-label='Copy message'
            >
              <Copy size={15} aria-hidden='true' />
            </Button>
            <MessageReactionButtons messageId={getMessageId(message)} />
          </div>
        )}
      </div>
    </article>
  );
};
