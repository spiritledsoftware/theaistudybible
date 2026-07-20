import type { highlightVerseTool } from '@/ai/chat/tools';
import { formNumberSequenceString } from '@/core/utils/number';
import { Button } from '@/www/components/ui/button';
import { H5, H6 } from '@/www/components/ui/typography';
import { Link } from '@tanstack/react-router';
import type { InferToolInput, InferToolOutput } from 'ai';
import { Highlighter } from 'lucide-react';
import type { ToolInvocation } from '.';

export type HighlightVerseToolProps = {
  toolInvocation: ToolInvocation;
};

export const HighlightVerseTool = (props: HighlightVerseToolProps) => {
  const toolArgs = props.toolInvocation.args as InferToolInput<
    ReturnType<typeof highlightVerseTool>
  >;

  const result =
    'result' in props.toolInvocation
      ? (props.toolInvocation.result as Exclude<
          InferToolOutput<ReturnType<typeof highlightVerseTool>>,
          AsyncIterable<unknown>
        >)
      : null;

  return (
    <div className='flex w-full flex-col'>
      <H5 className='flex items-center'>
        <Highlighter className='mr-2' size={18} />
        Highlight Verse
      </H5>
      {toolArgs && (
        <div className='flex items-center space-x-2 text-sm'>
          <span>
            {toolArgs.bibleAbbreviation}.{toolArgs.bookCode}.{toolArgs.chapterNumber}.
            {formNumberSequenceString(toolArgs.verseNumbers)}
          </span>
          <div
            className='h-4 w-4 shrink-0 rounded-full'
            style={{
              backgroundColor: toolArgs.color || '#FFD700',
            }}
          />
        </div>
      )}
      {result && (
        <div className='mt-2 flex w-full flex-col'>
          <H6>Result</H6>
          {result.status === 'error' ? (
            <div className='flex flex-col text-sm'>
              <span>Failed</span>
              <span>{result.message}</span>
            </div>
          ) : (
            <div className='flex flex-col text-sm'>
              {result.status === 'success' && (
                <div className='flex items-center space-x-2'>
                  <span>
                    {result.book.shortName} {result.chapter.number}:
                    {formNumberSequenceString(result.verses.map((v) => v.number))}
                  </span>
                  <Button asChild variant='link' className='h-fit p-0 text-accent-foreground'>
                    <Link
                      to='/bible/$bibleAbbreviation/$bookCode/$chapterNumber'
                      params={{
                        bibleAbbreviation: result.bible.abbreviation,
                        bookCode: result.book.code,
                        chapterNumber: result.chapter.number,
                      }}
                    >
                      View
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
