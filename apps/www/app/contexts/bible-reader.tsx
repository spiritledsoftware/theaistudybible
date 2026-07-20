import { findTextContentByVerseNumbers } from '@/core/utils/bibles/find-by-verse-id';
import { formNumberSequenceString } from '@/core/utils/number';
import type { Content } from '@/schemas/bibles/contents';
import type { Bible, Book, Chapter, Verse } from '@/schemas/bibles/types';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type React from 'react';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { type StoreApi, createStore } from 'zustand/vanilla';

export type SelectedVerseInfo = {
  number: number;
  contentIds: string[];
  text: string;
};

export type BibleReaderTextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

export type BibleReaderState = {
  bible: Bible;
  book: Book;
  chapter: Omit<Chapter, 'content'> & { content?: Content[] };
  verse: (Omit<Verse, 'content'> & { content?: Content[] }) | null;
  selectedVerseInfos: SelectedVerseInfo[];
  textSize: BibleReaderTextSize;
  selectedIds: string[];
  selectedTitle: string;
  selectedText: string;
};

export type BibleReaderActions = {
  setBible: React.Dispatch<React.SetStateAction<Bible>>;
  setBook: React.Dispatch<React.SetStateAction<Book>>;
  setChapter: React.Dispatch<
    React.SetStateAction<Omit<Chapter, 'content'> & { content?: Content[] }>
  >;
  setVerse: React.Dispatch<
    React.SetStateAction<(Omit<Verse, 'content'> & { content?: Content[] }) | null>
  >;
  setSelectedVerseInfos: React.Dispatch<React.SetStateAction<SelectedVerseInfo[]>>;
  setTextSize: React.Dispatch<React.SetStateAction<BibleReaderTextSize>>;
  updateComputedValues: () => void;
};

export type BibleReaderStore = BibleReaderState & BibleReaderActions;

export type BibleReaderContextValue = StoreApi<BibleReaderStore>;

export const BibleReaderContext = createContext<BibleReaderContextValue | null>(null);

export type BibleReaderProviderProps = {
  bible: Bible;
  book: Book;
  chapter: Omit<Chapter, 'content'> & { content?: Content[] };
  verse?: Omit<Verse, 'content'> & { content?: Content[] };
  selectedVerseInfos?: SelectedVerseInfo[];
  children: ReactNode;
};

// Helper functions defined outside component to prevent re-creation
const calculateSelectedIds = (verseInfos: SelectedVerseInfo[]): string[] => {
  return verseInfos.flatMap((info) => info.contentIds);
};

const calculateSelectedTitle = (state: BibleReaderState): string => {
  if (state.selectedVerseInfos.length === 0) {
    return '';
  }
  const verseNumbers = Array.from(
    new Set<number>(state.selectedVerseInfos.map((info) => info.number).sort((a, b) => a - b)),
  );
  return `${state.book.shortName} ${state.chapter.number}:${formNumberSequenceString(verseNumbers)} (${state.bible.abbreviationLocal})`;
};

const calculateSelectedText = (selectedVerseInfos: SelectedVerseInfo[]): string => {
  return selectedVerseInfos
    .sort((a, b) => a.number - b.number)
    .flatMap((info, index, array) => {
      let text = '';
      const prev = array[index - 1];
      if (prev && prev.number + 1 !== info.number) {
        text += '... ';
      }
      text += info.text;
      // Add space between verses
      if (index !== array.length - 1) {
        text += ' ';
      }
      return text;
    })
    .join('')
    .trim();
};

export const BibleReaderProvider = (props: BibleReaderProviderProps) => {
  const searchParams = useSearch({ strict: false });
  const getVerseInfosFromVerseSearchParams = useCallback(() => {
    const verseNumbers = searchParams.verseNumbers;
    if (!verseNumbers) return [];

    const content = props.verse ? props.verse.content : props.chapter.content;
    if (!content || !content.length) return [];

    if (verseNumbers.length) {
      return verseNumbers.map((verseNumber) => {
        const texts = findTextContentByVerseNumbers(content, [verseNumber]);
        return {
          number: verseNumber,
          contentIds: texts.map((t) => t.id),
          text: texts.map((t) => t.text).join(''),
        } as SelectedVerseInfo;
      });
    }

    return [];
  }, [props.chapter, searchParams, props.verse]);

  const storeRef = useRef<BibleReaderContextValue>(null);

  // Create store once and memoize its initialization
  if (!storeRef.current) {
    storeRef.current = createStore<BibleReaderStore>()(
      persist(
        (set, get) => {
          const selectedVerseInfos =
            props.selectedVerseInfos ?? getVerseInfosFromVerseSearchParams();

          return {
            bible: props.bible,
            book: props.book,
            chapter: props.chapter,
            verse: props.verse ?? null,
            selectedVerseInfos,
            textSize: 'md' as BibleReaderTextSize,
            selectedIds: calculateSelectedIds(selectedVerseInfos),
            selectedTitle: calculateSelectedTitle({
              bible: props.bible,
              book: props.book,
              chapter: props.chapter,
              verse: props.verse ?? null,
              selectedVerseInfos,
              textSize: 'md',
              selectedIds: [],
              selectedTitle: '',
              selectedText: '',
            }),
            selectedText: calculateSelectedText(selectedVerseInfos),

            setBible: (input) => {
              let bible: Bible;
              if (typeof input === 'function') {
                bible = input(get().bible);
              } else {
                bible = input;
              }
              set({ bible });
            },
            setBook: (input) => {
              let book: Book;
              if (typeof input === 'function') {
                book = input(get().book);
              } else {
                book = input;
              }
              set({ book });
            },
            setChapter: (input) => {
              let chapter: Omit<Chapter, 'content'> & { content?: Content[] };
              if (typeof input === 'function') {
                chapter = input(get().chapter);
              } else {
                chapter = input;
              }
              set({ chapter });
            },
            setVerse: (input) => {
              let verse: (Omit<Verse, 'content'> & { content?: Content[] }) | null;
              if (typeof input === 'function') {
                verse = input(get().verse);
              } else {
                verse = input;
              }
              set({ verse });
            },
            setSelectedVerseInfos: (input) => {
              let selectedVerseInfos: SelectedVerseInfo[];
              if (typeof input === 'function') {
                selectedVerseInfos = input(get().selectedVerseInfos);
              } else {
                selectedVerseInfos = input;
              }

              set({
                selectedVerseInfos,
                selectedIds: calculateSelectedIds(selectedVerseInfos),
                selectedTitle: calculateSelectedTitle({
                  ...get(),
                  selectedVerseInfos: selectedVerseInfos,
                }),
                selectedText: calculateSelectedText(selectedVerseInfos),
              });
            },
            setTextSize: (input) => {
              let textSize: BibleReaderTextSize;
              if (typeof input === 'function') {
                textSize = input(get().textSize);
              } else {
                textSize = input;
              }
              set({ textSize });
            },
            updateComputedValues: () => {
              const state = get();
              set({
                selectedIds: calculateSelectedIds(state.selectedVerseInfos),
                selectedTitle: calculateSelectedTitle(state),
                selectedText: calculateSelectedText(state.selectedVerseInfos),
              });
            },
          };
        },
        { name: 'bible-reader' },
      ),
    );
  }

  useEffect(() => {
    if (storeRef.current) {
      const store = storeRef.current;
      store.setState((s) => ({
        ...s,
        bible: props.bible,
        book: props.book,
        chapter: props.chapter,
        verse: props.verse ?? null,
        selectedVerseInfos: props.selectedVerseInfos ?? [],
      }));
    }
  }, [props.bible, props.book, props.chapter, props.verse, props.selectedVerseInfos]);

  const navigate = useNavigate({ from: '/bible/$bibleAbbreviation/$bookCode/$chapterNumber' });
  const navigateToVerses = useCallback(
    (state: BibleReaderStore) => {
      const verseNumbers = Array.from(new Set(state.selectedVerseInfos.map((info) => info.number)));
      navigate({
        replace: true,
        search: { verseNumbers: verseNumbers.length ? verseNumbers : undefined },
      });
    },
    [navigate],
  );

  useEffect(() => {
    const unsubscribe = storeRef.current?.subscribe(navigateToVerses);
    return () => unsubscribe?.();
  }, [navigateToVerses]);

  return (
    <BibleReaderContext.Provider value={storeRef.current}>
      {props.children}
    </BibleReaderContext.Provider>
  );
};

const selectBibleReaderStore = (state: BibleReaderStore) => state;

export const useBibleReaderStore = <T = BibleReaderStore>(
  selector?: (state: BibleReaderStore) => T,
): T => {
  const bibleReaderStoreContext = useContext(BibleReaderContext);
  if (!bibleReaderStoreContext) {
    throw new Error('useBibleReaderStore must be used within BibleReaderProvider');
  }

  return useStore(
    bibleReaderStoreContext,
    useShallow(selector ?? (selectBibleReaderStore as (state: BibleReaderStore) => T)),
  );
};
