import { db } from '@/core/database';
import { chapterNotes, verseNotes } from '@/core/database/schema';
import type { Bible, Book, Chapter, ChapterNote, Verse, VerseNote } from '@/schemas/bibles/types';
import { Button } from '@/www/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/www/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/www/components/ui/dialog';
import { Label } from '@/www/components/ui/label';
import { Markdown } from '@/www/components/ui/markdown';
import { Textarea } from '@/www/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/www/components/ui/tooltip';
import { requireAuthMiddleware } from '@/www/server/middleware/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

const editNote = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      type: z.enum(['chapter', 'verse']),
      bibleAbbreviation: z.string(),
      code: z.string(),
      content: z.string().min(1, 'Cannot be empty'),
    }),
  )
  .handler(async ({ data, context }) => {
    const { user } = context;
    let note: VerseNote | ChapterNote;
    if (data.type === 'chapter') {
      [note] = await db
        .update(chapterNotes)
        .set({ content: data.content })
        .where(
          and(
            eq(chapterNotes.userId, user.id),
            eq(chapterNotes.bibleAbbreviation, data.bibleAbbreviation),
            eq(chapterNotes.chapterCode, data.code),
          ),
        )
        .returning();
    } else if (data.type === 'verse') {
      [note] = await db
        .update(verseNotes)
        .set({ content: data.content })
        .where(
          and(
            eq(verseNotes.userId, user.id),
            eq(verseNotes.bibleAbbreviation, data.bibleAbbreviation),
            eq(verseNotes.verseCode, data.code),
          ),
        )
        .returning();
    } else {
      throw new Error('Invalid note type');
    }
    return { note };
  });

const deleteNote = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      type: z.enum(['chapter', 'verse']),
      bibleAbbreviation: z.string(),
      code: z.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { user } = context;
    if (data.type === 'chapter') {
      await db
        .delete(chapterNotes)
        .where(
          and(
            eq(chapterNotes.userId, user.id),
            eq(chapterNotes.bibleAbbreviation, data.bibleAbbreviation),
            eq(chapterNotes.chapterCode, data.code),
          ),
        );
    } else if (data.type === 'verse') {
      await db
        .delete(verseNotes)
        .where(
          and(
            eq(verseNotes.userId, user.id),
            eq(verseNotes.bibleAbbreviation, data.bibleAbbreviation),
            eq(verseNotes.verseCode, data.code),
          ),
        );
    } else {
      throw new Error('Invalid note type');
    }
    return { success: true };
  });

export type NoteItemCardProps = {
  note: ChapterNote | VerseNote;
  bible: Bible;
  book: Book;
  chapter: Omit<Chapter, 'content'>;
  verse?: Omit<Verse, 'content'>;
  showViewButton?: boolean;
};

export const NoteItemCard = (props: NoteItemCardProps) => {
  const qc = useQueryClient();

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteContent, setEditNoteContent] = useState(props.note.content);
  const [showPreview, setShowPreview] = useState(false);

  const editNoteMutation = useMutation({
    mutationFn: (mProps: {
      type: 'verse' | 'chapter';
      bibleAbbreviation: string;
      code: string;
      content: string;
    }) => editNote({ data: mProps }),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['notes'],
      }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (mProps: { type: 'verse' | 'chapter'; bibleAbbreviation: string; code: string }) =>
      deleteNote({ data: mProps }),
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: ['notes'],
      }),
  });

  const title = () => {
    if (props.verse) {
      return `${props.book.shortName} ${props.chapter.number}:${props.verse.number} (${props.bible.abbreviation})`;
    }
    return `${props.book.shortName} ${props.chapter.number} (${props.bible.abbreviation})`;
  };

  return (
    <Card className='flex h-full max-h-[400px] w-full flex-col transition-all'>
      <CardHeader>
        <CardTitle>{title()}</CardTitle>
      </CardHeader>
      <CardContent className='flex grow flex-col overflow-y-auto'>
        {isEditingNote ? (
          <div className='space-y-2'>
            <div className='flex w-full items-center justify-between'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label className='flex items-center'>
                    Content <HelpCircle size={16} className='ml-1' />
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  Accepts{' '}
                  <Button asChild variant='link' size='sm' className='p-0'>
                    <a href='https://www.markdownguide.org/'>markdown</a>
                  </Button>
                </TooltipContent>
              </Tooltip>
              <Button
                asChild
                variant='link'
                size='sm'
                className='p-0 text-xs hover:no-underline'
                onClick={() => setShowPreview(!showPreview)}
              >
                <Label>{showPreview ? 'Hide Preview' : 'Show Preview'}</Label>
              </Button>
            </div>
            {showPreview ? (
              <Textarea
                value={editNoteContent}
                onChange={(e) => setEditNoteContent(e.target.value)}
              />
            ) : (
              <div className='whitespace-pre-wrap rounded-lg border bg-background p-5'>
                <Markdown>{editNoteContent}</Markdown>
              </div>
            )}
          </div>
        ) : (
          <div className='overflow-y-auto whitespace-pre-wrap rounded-lg border bg-background p-2'>
            <Markdown>{props.note.content}</Markdown>
          </div>
        )}
      </CardContent>
      <CardFooter className='flex justify-end space-x-2'>
        {isEditingNote ? (
          <>
            <Button variant='outline' onClick={() => setIsEditingNote(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editNoteContent.trim()}
              onClick={() => {
                setIsEditingNote(false);
                editNoteMutation.mutate({
                  type: 'verseCode' in props.note ? 'verse' : 'chapter',
                  bibleAbbreviation: props.bible.abbreviation,
                  code: 'verseCode' in props.note ? props.note.verseCode : props.note.chapterCode,
                  content: editNoteContent,
                });
              }}
            >
              Save
            </Button>
          </>
        ) : (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  onClick={() => {
                    setIsEditingNote(false);
                  }}
                >
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent className='space-y-2 sm:max-w-[425px]'>
                <DialogHeader>
                  <DialogTitle>Are you sure you want to delete this note?</DialogTitle>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type='submit'
                    variant='destructive'
                    onClick={() => {
                      deleteNoteMutation.mutate({
                        type: 'verseCode' in props.note ? 'verse' : 'chapter',
                        bibleAbbreviation: props.bible.abbreviation,
                        code:
                          'verseCode' in props.note ? props.note.verseCode : props.note.chapterCode,
                      });
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={() => setIsEditingNote(!isEditingNote)}>Edit</Button>
            {props.showViewButton && (
              <Button asChild>
                <Link
                  to='/bible/$bibleAbbreviation/$bookCode/$chapterNumber'
                  params={{
                    bibleAbbreviation: props.bible.abbreviation,
                    bookCode: props.book.code,
                    chapterNumber: props.chapter.number,
                  }}
                >
                  View
                </Link>
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
};
