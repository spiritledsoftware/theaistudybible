import type { Chat } from '@/schemas/chats/types';
import { type ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { type StoreApi, createStore } from 'zustand/vanilla';

export type ChatState = {
  chat: Chat | null;
};

export type ChatActions = {
  setChat: React.Dispatch<React.SetStateAction<Chat | null>>;
};

export type ChatStore = ChatState & ChatActions;

export type ChatContextValue = StoreApi<ChatStore>;

export const ChatContext = createContext<ChatContextValue | null>(null);

export type ChatProviderProps = {
  chat?: Chat | null;
  children: ReactNode;
};

export const ChatProvider = ({ chat, children }: ChatProviderProps) => {
  const storeRef = useRef<ChatContextValue>(null);

  if (!storeRef.current) {
    storeRef.current = createStore<ChatStore>()(
      persist(
        (set, get) => ({
          chat: chat ?? null,
          setChat: (input) => {
            let chat: Chat | null;
            if (typeof input === 'function') {
              chat = input(get().chat);
            } else {
              chat = input;
            }
            set({ chat });
          },
        }),
        { name: 'chat' },
      ),
    );
  }

  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.setState((s) => ({
        ...s,
        chat: chat ?? s.chat,
      }));
    }
  }, [chat]);

  return <ChatContext.Provider value={storeRef.current}>{children}</ChatContext.Provider>;
};

const selectChatStore = (state: ChatStore) => state;

export const useChatStore = <T = ChatStore>(selector?: (state: ChatStore) => T): T => {
  const chatStoreContext = useContext(ChatContext);
  if (!chatStoreContext) {
    throw new Error('useChatStore must be used within ChatProvider');
  }

  return useStore(
    chatStoreContext,
    useShallow(selector ?? (selectChatStore as (state: ChatStore) => T)),
  );
};
