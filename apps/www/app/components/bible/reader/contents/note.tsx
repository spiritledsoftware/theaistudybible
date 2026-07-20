import type { NoteContent as NoteContentType } from '@/schemas/bibles/contents';
import { Button } from '@/www/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/www/components/ui/popover';
import { MessageCircleMore } from 'lucide-react';
import { Contents } from './index';

export type NoteContentProps = {
  content: NoteContentType;
  props: Record<string, string>;
};

export function NoteContent({ content, props }: NoteContentProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          id={content.id}
          data-type={content.type}
          data-verse-number={content.verseNumber}
          {...props}
          className='mx-0.25 size-6 p-1.5 align-sub'
        >
          <MessageCircleMore />
        </Button>
      </PopoverTrigger>
      <PopoverContent side='top' className='eb-container w-52 p-2'>
        <Contents contents={content.contents} className='text-sm' />
      </PopoverContent>
    </Popover>
  );
}
