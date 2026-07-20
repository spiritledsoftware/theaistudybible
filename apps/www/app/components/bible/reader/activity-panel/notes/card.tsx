import { db } from '@/core/database';
import type { Prettify } from '@/core/types/util';
import { SignedIn } from '@/www/components/auth/control';
import { SignInButton } from '@/www/components/auth/sign-in-button';
import { QueryBoundary } from '@/www/components/query-boundary';
import { Button } from '@/www/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/www/components/ui/card';
import { DrawerClose } from '@/www/components/ui/drawer';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/www/components/ui/tooltip';
import { H5, P } from '@/www/components/ui/typography';
import { useBibleReaderStore } from '@/www/contexts/bible-reader';
import { authMiddleware } from '@/www/server/middleware/auth';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { AddNoteCard } from './add-note-card';
import { NoteItemCard } from './note-item-card';

const getNotes = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      bibleAbbreviation: z.string(),
      chapterCode: z.string(),
      verseNumbers: z.array(z.number()).optional(),
      offset: z.number(),
      limit: z.number(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { user } = context;
    if (!user) {
      return { notes: [], nextCursor: null };
    }

    let notes = [];
    if (data.verseNumbers?.length) {
      notes = await db.query.verseNotes.findMany({
        where: (verseNotes, { and, eq, inArray }) =>
          and(
            eq(verseNotes.userId, user.id),
            eq(verseNotes.bibleAbbreviation, data.bibleAbbreviation),
            inArray(
              verseNotes.verseCode,
              data.verseNumbers!.map((vn) => `${data.chapterCode}.${vn}`),
            ),
          ),
        orderBy: (verseNotes, { desc }) => desc(verseNotes.updatedAt),
        offset: data.offset,
        limit: data.limit,
        with: {
          verse: {
            columns: { content: false },
            with: { book: true, chapter: { columns: { content: false } }, bible: true },
          },
        },
      });
    } else {
      notes = await db.query.chapterNotes.findMany({
        where: (chapterNotes, { and, eq }) =>
          and(
            eq(chapterNotes.userId, user.id),
            eq(chapterNotes.bibleAbbreviation, data.bibleAbbreviation),
            eq(chapterNotes.chapterCode, data.chapterCode),
          ),
        orderBy: (chapterNotes, { desc }) => desc(chapterNotes.updatedAt),
        offset: data.offset,
        limit: data.limit,
        with: { chapter: { columns: { content: false }, with: { book: true, bible: true } } },
      });
    }

    return {
      notes,
      nextCursor: notes.length === data.limit ? data.offset + notes.length : null,
    };
  });

type NoteType = Prettify<Awaited<ReturnType<typeof getNotes>>['notes']>[number];

export const NotesCard = () => {
  const brStore = useBibleReaderStore();

  const query = useInfiniteQuery({
    queryKey: [
      'notes',
      {
        bibleAbbreviation: brStore.bible.abbreviation,
        chapterCode: brStore.chapter.code,
        verseNumbers: brStore.verse
          ? [brStore.verse.number]
          : brStore.selectedVerseInfos.map((v) => v.number),
      },
    ],
    queryFn: ({ pageParam }) =>
      getNotes({
        data: {
          bibleAbbreviation: brStore.bible.abbreviation,
          chapterCode: brStore.chapter.code,
          verseNumbers: brStore.verse
            ? [brStore.verse.number]
            : brStore.selectedVerseInfos.map((v) => v.number),
          offset: pageParam,
          limit: 9,
        },
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  const [autoAnimateRef] = useAutoAnimate();
  const [isAddingNote, setIsAddingNote] = useState(false);

  return (
    <Card className='flex w-full flex-1 flex-col overflow-y-auto'>
      <SignedIn
        fallback={
          <>
            <CardHeader />
            <CardContent className='flex w-full flex-1 flex-col place-items-center justify-center pt-6'>
              <div className='flex h-full w-full flex-col place-items-center justify-center'>
                <P className='text-lg'>
                  Please <SignInButton>Sign In</SignInButton> to take notes
                </P>
              </div>
            </CardContent>
            <CardFooter className='flex justify-end'>
              <DrawerClose asChild>
                <Button variant='outline'>Close</Button>
              </DrawerClose>
            </CardFooter>
          </>
        }
      >
        <CardHeader className='flex flex-row items-center justify-between border-b shadow-xs'>
          <CardTitle>Notes</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setIsAddingNote(true)} size='icon'>
                <Plus className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Note</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className='overflow-y-auto py-4'>
          <div ref={autoAnimateRef} className='grid grid-cols-1 gap-2'>
            <QueryBoundary
              query={query}
              render={(data) => {
                const notes = data.pages.flatMap((page) => page.notes as unknown) as NoteType[];
                return (
                  <>
                    {isAddingNote && (
                      <AddNoteCard
                        onAdd={() => setIsAddingNote(false)}
                        onCancel={() => setIsAddingNote(false)}
                      />
                    )}
                    {notes.length === 0 ? (
                      <div className='flex h-full w-full flex-col items-center justify-center p-5 transition-all'>
                        <H5>No notes</H5>
                      </div>
                    ) : (
                      notes.map((note, idx) => (
                        <NoteItemCard
                          key={note.id}
                          data-index={idx}
                          note={note}
                          bible={'verse' in note ? note.verse.bible : note.chapter.bible}
                          book={'verse' in note ? note.verse.book : note.chapter.book}
                          chapter={'verse' in note ? note.verse.chapter : note.chapter}
                          verse={'verse' in note ? note.verse : undefined}
                        />
                      ))
                    )}
                  </>
                );
              }}
            />
          </div>
        </CardContent>
        <CardFooter className='flex justify-end gap-2 border-t pt-4'>
          <DrawerClose asChild>
            <Button variant='outline'>Close</Button>
          </DrawerClose>
        </CardFooter>
      </SignedIn>
    </Card>
  );
};
