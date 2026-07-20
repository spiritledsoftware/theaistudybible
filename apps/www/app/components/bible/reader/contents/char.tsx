import type { CharContent as CharContentType } from '@/schemas/bibles/contents';
import type { VerseNote } from '@/schemas/bibles/verses/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/www/components/ui/tooltip';
import { cn } from '@/www/lib/utils';
import type { HighlightInfo } from '@/www/types/bible';
import { useCallback } from 'react';
import { Contents } from './index';

export type CharContentProps = {
  content: CharContentType;
  style: string;
  className?: string;
  highlights?: HighlightInfo[];
  notes?: VerseNote[];
  props: Record<string, string>;
};

export function CharContent({
  content,
  style,
  className,
  highlights,
  notes,
  props,
}: CharContentProps) {
  const CharContent = useCallback(
    () => (
      <span
        id={content.id}
        data-type={content.type}
        data-verse-number={content.verseNumber}
        {...props}
        className={cn(style, 'inline', className)}
      >
        <Contents contents={content.contents} highlights={highlights} notes={notes} />
      </span>
    ),
    [content, style, className, props, highlights, notes],
  );

  const strongsNumber = content.attrs?.strong;
  if (strongsNumber) {
    const language = strongsNumber.startsWith('H') ? 'hebrew' : 'greek';
    const number = strongsNumber.slice(1);
    const strongsLink = `https://biblehub.com/strongs/${language}/${number}.htm`;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <CharContent />
        </TooltipTrigger>
        <TooltipContent side='bottom' className='flex w-fit justify-center indent-0'>
          <div className='w-full text-center'>
            <h6 className='font-bold'>Strong's</h6>
            <a
              href={strongsLink}
              className='hover:underline'
              target='_blank'
              rel='noopener noreferrer'
            >
              {strongsNumber}
            </a>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <CharContent />;
}
