import { db } from '@/core/database';
import { QueryBoundary } from '@/www/components/query-boundary';
import { H1, Muted } from '@/www/components/ui/typography';
import { useBibleStore } from '@/www/contexts/bible';
import { BibleReaderProvider } from '@/www/contexts/bible-reader';
import { useSwipe } from '@/www/hooks/use-swipe';
import { cn } from '@/www/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ChevronLeft, ChevronRight, Copyright } from 'lucide-react';
import { type RefObject, useEffect, useRef } from 'react';
import { z } from 'zod';
import { Button, buttonVariants } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { ReaderContent } from '../reader';
import { BibleReaderMenu } from '../reader/menu';

const getChapterReaderData = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      bibleAbbreviation: z.string(),
      bookCode: z.string(),
      chapterNumber: z.number(),
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
              limit: 1,
              where: (chapters, { eq }) => eq(chapters.number, data.chapterNumber),
              with: {
                previous: { columns: { code: true, number: true, name: true } },
                next: { columns: { code: true, number: true, name: true } },
              },
            },
            previous: {
              columns: { code: true },
              with: {
                chapters: {
                  columns: { code: true, number: true, name: true },
                  orderBy: (chapters, { desc }) => desc(chapters.number),
                  limit: 1,
                },
              },
            },
            next: {
              columns: { code: true },
              with: {
                chapters: {
                  columns: { code: true, number: true, name: true },
                  orderBy: (chapters, { asc }) => asc(chapters.number),
                  limit: 1,
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

    const chapter = chapters[0];

    return { bible, book, chapter, rightsHolder: biblesToRightsHolders[0].rightsHolder };
  });

export const chapterReaderQueryOptions = (props: {
  bibleAbbreviation: string;
  bookCode: string;
  chapterNumber: number;
}) => ({
  queryKey: ['chapter-reader', props],
  queryFn: () => getChapterReaderData({ data: props }),
  staleTime: 1000 * 60 * 60, // 1 hour
});

export type ChapterReaderProps = {
  bibleAbbreviation: string;
  bookCode: string;
  chapterNumber: number;
};

type ChapterReaderData = Awaited<ReturnType<typeof getChapterReaderData>>;

function ChapterReaderContent({
  bible,
  book,
  chapter,
  rightsHolder,
  containerRef,
}: ChapterReaderData & { containerRef: RefObject<HTMLDivElement | null> }) {
  const navigate = useNavigate();
  const router = useRouter();
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
    setVerse(null);
  }, [bible, book, chapter, setBible, setBook, setChapter, setVerse]);

  const previousChapter = chapter.previous ?? book.previous?.chapters[0];
  const previousChapterRoute =
    `/bible/${bible.abbreviation}/${previousChapter?.code.split('.')[0]}` +
    `/${previousChapter?.number}`;
  const nextChapter = chapter.next ?? book.next?.chapters[0];
  const nextChapterRoute = `/bible/${bible.abbreviation}/${nextChapter?.code.split('.')[0]}/${nextChapter?.number}`;

  useEffect(() => {
    if (previousChapter) {
      router.preloadRoute({ to: previousChapterRoute });
    }

    if (nextChapter) {
      router.preloadRoute({ to: nextChapterRoute });
    }
  }, [router, previousChapter, nextChapter, previousChapterRoute, nextChapterRoute]);

  useSwipe(containerRef, {
    onSwipeLeft: () => {
      if (nextChapter && !router.state.isLoading) {
        navigate({ to: nextChapterRoute });
      }
    },
    onSwipeRight: () => {
      if (previousChapter && !router.state.isLoading) {
        navigate({ to: previousChapterRoute });
      }
    },
  });

  return (
    <BibleReaderProvider bible={bible} book={book} chapter={chapter}>
      <BibleReaderMenu />
      <div className='my-5 w-full'>
        <ReaderContent contents={chapter.content} />
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
      {previousChapter && (
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants(),
              'sm:-translate-y-1/2 fixed bottom-safe-offset-1 left-safe-offset-1 flex size-10 items-center justify-center rounded-full p-2 sm:top-1/2 md:left-safe-offset-2 md:size-12 lg:left-[12%]',
              router.state.isLoading && 'pointer-events-none opacity-50',
            )}
            asChild
          >
            <Link to={previousChapterRoute}>
              <ChevronLeft className='size-full' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='right'>
            <p>{previousChapter.name}</p>
          </TooltipContent>
        </Tooltip>
      )}
      {nextChapter && (
        <Tooltip>
          <TooltipTrigger
            className={cn(
              buttonVariants(),
              'sm:-translate-y-1/2 fixed right-safe-offset-1 bottom-safe-offset-1 flex size-10 items-center justify-center rounded-full p-2 sm:top-1/2 md:right-safe-offset-2 md:size-12 lg:right-[12%]',
              router.state.isLoading && 'pointer-events-none opacity-50',
            )}
            asChild
          >
            <Link to={nextChapterRoute}>
              <ChevronRight className='size-full' />
            </Link>
          </TooltipTrigger>
          <TooltipContent side='left'>
            <p>{nextChapter.name}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </BibleReaderProvider>
  );
}

export function ChapterReader(props: ChapterReaderProps) {
  const navigate = useNavigate();

  const { setBible, setBook, setChapter, setVerse } = useBibleStore((state) => ({
    setBible: state.setBible,
    setBook: state.setBook,
    setChapter: state.setChapter,
    setVerse: state.setVerse,
  }));

  const query = useQuery(
    chapterReaderQueryOptions({
      bibleAbbreviation: props.bibleAbbreviation,
      bookCode: props.bookCode,
      chapterNumber: props.chapterNumber,
    }),
  );

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className='flex h-full w-full max-w-3xl flex-1 flex-col justify-center pb-5'
      ref={containerRef}
    >
      <QueryBoundary
        query={query}
        notFoundFallback={
          <div className='flex h-full w-full flex-1 flex-col items-center justify-center'>
            <H1>Chapter Not Found</H1>
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
        render={(data) => <ChapterReaderContent {...data} containerRef={containerRef} />}
      />
    </div>
  );
}
