import type { Bible, Book, Chapter, Verse } from '@/schemas/bibles/types';
import { type ReactNode, createContext, useContext, useEffect, useRef } from 'react';
import type { StoreApi } from 'zustand';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { createStore } from 'zustand/vanilla';

export type BibleState = {
  bible: Bible | null;
  book: Book | null;
  chapter: Omit<Chapter, 'content'> | null;
  verse: Omit<Verse, 'content'> | null;
};

export type BibleActions = {
  setBible: React.Dispatch<React.SetStateAction<Bible | null>>;
  setBook: React.Dispatch<React.SetStateAction<Book | null>>;
  setChapter: React.Dispatch<React.SetStateAction<Omit<Chapter, 'content'> | null>>;
  setVerse: React.Dispatch<React.SetStateAction<Omit<Verse, 'content'> | null>>;
};

export type BibleStore = BibleState & BibleActions;

export type BibleContextValue = StoreApi<BibleStore>;

export const BibleContext = createContext<BibleContextValue | null>(null);

export type BibleProviderProps = {
  bible?: Bible;
  book?: Book;
  chapter?: Omit<Chapter, 'content'>;
  verse?: Omit<Verse, 'content'>;
  children: ReactNode;
};

export const BibleProvider = ({ bible, book, chapter, verse, children }: BibleProviderProps) => {
  const storeRef = useRef<BibleContextValue>(null);
  if (!storeRef.current) {
    storeRef.current = createStore<BibleStore>()(
      persist(
        (set, get) => ({
          bible: bible ?? null,
          book: book ?? null,
          chapter: chapter ?? null,
          verse: verse ?? null,
          setBible: (input) => {
            let bible: Bible | null;
            if (typeof input === 'function') {
              bible = input(get().bible);
            } else {
              bible = input;
            }
            set({ bible });
          },
          setBook: (input) => {
            let book: Book | null;
            if (typeof input === 'function') {
              book = input(get().book);
            } else {
              book = input;
            }
            set({ book });
          },
          setChapter: (input) => {
            let chapter: Omit<Chapter, 'content'> | null;
            if (typeof input === 'function') {
              chapter = input(get().chapter);
            } else {
              chapter = input;
            }
            set({ chapter });
          },
          setVerse: (input) => {
            let verse: Omit<Verse, 'content'> | null;
            if (typeof input === 'function') {
              verse = input(get().verse);
            } else {
              verse = input;
            }
            set({ verse });
          },
        }),
        { name: 'bible' },
      ),
    );
  }

  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.setState((s) => ({
        ...s,
        bible: bible ?? s.bible,
        book: book ?? s.book,
        chapter: chapter ?? s.chapter,
        verse: verse ?? s.verse,
      }));
    }
  }, [bible, book, chapter, verse]);

  return <BibleContext.Provider value={storeRef.current}>{children}</BibleContext.Provider>;
};

const selectBibleStore = (state: BibleStore) => state;

export const useBibleStore = <T = BibleStore>(selector?: (state: BibleStore) => T): T => {
  const bibleStoreContext = useContext(BibleContext);
  if (!bibleStoreContext) {
    throw new Error('useBibleStore must be used within BibleProvider');
  }

  return useStore(
    bibleStoreContext,
    useShallow(selector ?? (selectBibleStore as (state: BibleStore) => T)),
  );
};
