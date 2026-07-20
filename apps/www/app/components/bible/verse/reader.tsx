import { db } from '@/core/database';
import { QueryBoundary } from '@/www/components/query-boundary';
import { H1, Muted } from '@/www/components/ui/typography';
import { useBibleStore } from '@/www/contexts/bible';
import { BibleReaderProvider } from '@/www/contexts/bible-reader';
import { useSwipe } from '@/www/hooks/use-swipe';
import { cn } from '@/www/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ChevronLeft, ChevronRight, Copyright } from 'lucide-react';
import { type RefObject, useEffect, useRef } from 'react';
import { z } from 'zod';
import { Button, buttonVariants } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ReaderContent } from '../reader';
import { BibleReaderMenu } from '../reader/menu';

const getVerseReaderData = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      bibleAbbreviation: z.string(),
      bookCode: z.string(),
      chapterNum: z.number(),
      verseNum: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const bibleData = await db.query.bibles.findFirst({
      where: (bibles, { and, eq }) =>
        and(eq(bibles.abbreviation, data.bibleAbbreviation), eq(bibles.readyForPublication, true)),
      with: {
        biblesToRightsHolders: { with: { rightsHolder: true } },
        books: {
          limit: 1,
          where: (books, { eq }) => eq(books.code, data.bookCode),
          with: {
            chapters: {
              columns: { content: false },
              limit: 1,
              where: (chapters, { eq }) => eq(chapters.number, data.chapterNum),
              with: {
                verses: {
                  limit: 1,
                  where: (verses, { eq }) => eq(verses.number, data.verseNum),
                  with: {
                    previous: { columns: { code: true, number: true, name: true } },
                    next: { columns: { code: true, number: true, name: true } },
                  },
                },
                previous: {
                  columns: { code: true },
                  with: {
                    verses: {
                      columns: { code: true, number: true, name: true },
                      orderBy: (verses, { desc }) => desc(verses.number),
                      limit: 1,
                    },
                  },
                },
                next: {
                  columns: { code: true },
                  with: {
                    verses: {
                      columns: { code: true, number: true, name: true },
                      orderBy: (verses, { asc }) => asc(verses.number),
                      limit: 1,
                    },
                  },
                },
              },
            },
            previous: {
              columns: { code: true },
              with: {
                chapters: {
                  columns: { code: true, number: true },
                  orderBy: (chapters, { desc }) => desc(chapters.number),
                  with: {
                    verses: {
                      columns: { code: true, number: true, name: true },
                      orderBy: (verses, { desc }) => desc(verses.number),
                      limit: 1,
                    },
                  },
                },
              },
            },
            next: {
              columns: { code: true },
              with: {
                chapters: {
                  columns: { code: true, number: true },
                  orderBy: (chapters, { asc }) => asc(chapters.number),
                  with: {
                    verses: {
                      columns: { code: true, number: true, name: true },
                      orderBy: (verses, { asc }) => asc(verses.number),
                      limit: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!bibleData) {
      throw new Error('Bible not found');
    }

    const { books, biblesToRightsHolders, ...bible } = bibleData;
    if (!books[0]) {
      throw new Error('Book not found');
    }

    const { chapters, ...book } = books[0];
    if (!chapters[0]) {
      throw new Error('Chapter not found');
    }

    const { verses, ...chapter } = chapters[0];
    if (!verses[0]) {
      throw new Error('Verse not found');
    }
    const verse = verses[0];

    return { bible, book, chapter, verse, rightsHolder: biblesToRightsHolders[0].rightsHolder };
  });

export const getVerseReaderQueryOptions = (props: {
  bibleAbbreviation: string;
  bookCode: string;
  chapterNum: number;
  verseNum: number;
}) => ({
  queryKey: ['verse-reader', props],
  queryFn: () => getVerseReaderData({ data: props }),
  staleTime: 1000 * 60 * 60, // 1 hour
});

export type VerseReaderProps = {
  bibleAbbreviation: string;
  bookCode: string;
  chapterNum: number;
  verseNum: number;
};

type VerseReaderData = Awaited<ReturnType<typeof getVerseReaderData>>;

function VerseReaderContent({
  bible,
  book,
  chapter,
  verse,
  rightsHolder,
  containerRef,
}: VerseReaderData & { containerRef: RefObject<HTMLDivElement | null> }) {
  const navigate = useNavigate();
  const router = useRouter();
  const routerState = useRouterState();
  const { setBible, setBook, setChapter, setVerse } = useBibleStore((state) => ({
    setBible: state.setBible,
    setBook: state.setBook,
    setChapter: state.setChapter,
    setVerse: state.setVerse,
  }));

  useEffect(() => {
    setBible(bible);
    setBook(book);
    setChapter(chapter);
    setVerse(verse);
  }, [bible, book, chapter, verse, setBible, setBook, setChapter, setVerse]);

  const previousVerse =
    verse.previous ?? chapter.previous?.verses[0] ?? book.previous?.chapters[0]?.verses[0];
  const previousVerseRoute =
    `/bible/${bible.abbreviation}/${previousVerse?.code.split('.')[0]}` +
    `/${previousVerse?.code.split('.')[1]}/${previousVerse?.number}`;
  const nextVerse = verse.next ?? chapter.next?.verses[0] ?? book.next?.chapters[0]?.verses[0];
  const nextVerseRoute =
    `/bible/${bible.abbreviation}/${nextVerse?.code.split('.')[0]}` +
    `/${nextVerse?.code.split('.')[1]}/${nextVerse?.number}`;

  useEffect(() => {
    if (previousVerse) {
      router.preloadRoute({ to: previousVerseRoute });
    }

    if (nextVerse) {
      router.preloadRoute({ to: nextVerseRoute });
    }
  }, [router, previousVerse, nextVerse, previousVerseRoute, nextVerseRoute]);

  useSwipe(containerRef, {
    onSwipeLeft: () => {
      if (nextVerse && !routerState.isLoading) {
        navigate({ to: nextVerseRoute });
      }
    },
    onSwipeRight: () => {
      if (previousVerse && !routerState.isLoading) {
        navigate({ to: previousVerseRoute });
      }
    },
  });

  return (
    <BibleReaderProvider bible={bible} book={book} chapter={chapter} verse={verse}>
      <BibleReaderMenu />
      <div className='my-5'>
        <ReaderContent contents={verse.content} />
      </div>
      <div className='mb-20 flex flex-col items-center gap-2'>
        <Muted>
          Copyright
          <Copyright className='mx-2 inline-block size-4' />
          <Button variant='link' className='p-0 text-muted-foreground' asChild>
            <Link to={rightsHolder.url} target='_blank'>
              {rightsHolder.nameLocal}
            </Link>
          </Button>
        </Muted>
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Rights-holder markup is sanitized during import
          dangerouslySetInnerHTML={{ __html: bible.copyrightStatement }}
          className='flex flex-col items-center text-center text-muted-foreground text-xs'
        />
      </div>
      <div className='flex w-full flex-col items-center'>
        <Button asChild variant='outline'>
          <Link
            to='/bible/$bibleAbbreviation/$bookCode/$chapterNumber'
            params={{
              bibleAbbreviation: bible.abbreviation,
              bookCode: book.code,
              chapterNumber: chapter.number,
            }}
          >
            View all of <strong>{chapter.name}</strong>
          </Link>
        </Button>
      </div>
      {previousVerse && (
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants(),
              'sm:-translate-y-1/2 fixed bottom-safe-offset-1 left-safe-offset-1 flex size-10 items-center justify-center rounded-full p-2 sm:top-1/2 md:left-safe-offset-2 md:size-12 lg:left-[12%]',
              routerState.isLoading && 'pointer-events-none opacity-50',
            )}
            asChild
          >
            <Link to={previousVerseRoute}>
              <ChevronLeft className='size-full' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p>{previousVerse.name}</p>
          </TooltipContent>
        </Tooltip>
      )}
      {nextVerse && (
        <Tooltip>
          <TooltipTrigger
            asChild
            className={cn(
              buttonVariants(),
              'sm:-translate-y-1/2 fixed right-safe-offset-1 bottom-safe-offset-1 flex size-10 items-center justify-center rounded-full p-2 sm:top-1/2 md:right-safe-offset-2 md:size-12 lg:right-[12%]',
              routerState.isLoading && 'pointer-events-none opacity-50',
            )}
          >
            <Link to={nextVerseRoute}>
              <ChevronRight className='size-full' />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>{nextVerse.name}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </BibleReaderProvider>
  );
}

export function VerseReader(props: VerseReaderProps) {
  const navigate = useNavigate();

  const { setBible, setBook, setChapter, setVerse } = useBibleStore((state) => ({
    setBible: state.setBible,
    setBook: state.setBook,
    setChapter: state.setChapter,
    setVerse: state.setVerse,
  }));

  const containerRef = useRef<HTMLDivElement>(null);

  const query = useQuery(getVerseReaderQueryOptions(props));

  return (
    <div className='flex h-full w-full max-w-3xl flex-1 flex-col justify-center' ref={containerRef}>
      <QueryBoundary
        query={query}
        notFoundFallback={
          <div className='flex h-full w-full flex-1 flex-col place-items-center justify-center'>
            <H1>Verse Not Found</H1>
            <div className='flex items-center gap-2'>
              <Button
                onClick={() => {
                  setBible(null);
                  setBook(null);
                  setChapter(null);
                  setVerse(null);
                  navigate({ to: '/bible' });
                }}
              >
                View other bibles
              </Button>
            </div>
          </div>
        }
        render={(data) => <VerseReaderContent {...data} containerRef={containerRef} />}
      />
    </div>
  );
}
