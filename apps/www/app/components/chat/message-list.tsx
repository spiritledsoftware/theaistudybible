import type { useChat } from '@/www/hooks/use-chat';
import type { UIMessage } from 'ai';
import { ChevronUp } from 'lucide-react';
import type { RefObject } from 'react';
import React from 'react';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { EmptyWindow } from './empty-window';
import { Message } from './message';

export type ChatMessageListProps = {
  messages: UIMessage[];
  messagesQuery: ReturnType<typeof useChat>['messagesQuery'];
  isLoading: boolean;
  append: ReturnType<typeof useChat>['append'];
  addToolResult: ReturnType<typeof useChat>['addToolResult'];
  additionalContext?: string;
  topOfLastMessageRef: RefObject<HTMLDivElement | null>;
  lastMessageIdx: number;
};

export const ChatMessageList = (props: ChatMessageListProps) => {
  return (
    <div className='flex w-full flex-1 flex-col items-center justify-end'>
      <div className='flex w-full items-start justify-center'>
        {props.messagesQuery.status === 'success' && props.messagesQuery.hasNextPage && (
          <div className='flex flex-col items-center justify-center'>
            <Button
              variant='link'
              size='icon'
              className='flex h-fit flex-col items-center justify-center py-4 text-foreground'
              disabled={props.messagesQuery.isFetchingNextPage}
              onClick={() => props.messagesQuery.fetchNextPage()}
              aria-label='Load previous messages'
            >
              {props.messagesQuery.isFetchingNextPage ? <Spinner size='sm' /> : <ChevronUp />}
            </Button>
          </div>
        )}
      </div>
      <div className='flex w-full flex-1 flex-col items-center justify-end'>
        {props.messages.length === 0 ? (
          <EmptyWindow append={props.append} additionalContext={props.additionalContext} />
        ) : (
          props.messages.map((message, idx) => (
            <React.Fragment key={message.id}>
              {idx === props.lastMessageIdx && (
                <div ref={props.topOfLastMessageRef} className='h-px w-full shrink-0' />
              )}
              <Message
                previousMessage={props.messages[idx - 1]}
                message={message}
                nextMessage={props.messages[idx + 1]}
                addToolResult={props.addToolResult}
                isLoading={props.isLoading}
              />
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
