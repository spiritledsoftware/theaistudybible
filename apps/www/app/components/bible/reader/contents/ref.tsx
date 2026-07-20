import type { TextContent } from '@/schemas/bibles/contents';
import { useBibleReaderStore } from '@/www/contexts/bible-reader';
import { cn } from '@/www/lib/utils';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

export type RefContentProps = {
  content: TextContent;
  style: string;
  attrs: Record<string, string>;
  props: Record<string, string>;
  className?: string;
};

export function RefContent({ content, style, attrs, props, className }: RefContentProps) {
  const bible = useBibleReaderStore((state) => state.bible);

  const link = useMemo(() => {
    const [bookCode, chapterAndVerse] = attrs.loc.split(' ');

    const [chapter, verse] = chapterAndVerse.split(':');
    let link = `/bible/${bible.abbreviation}/${bookCode}/${chapter}`;
    if (verse) {
      link += `/${verse}`;
    }
    return link;
  }, [attrs.loc, bible.abbreviation]);

  return (
    <Link
      id={content.id}
      data-type={content.type}
      data-verse-number={content.verseNumber}
      {...props}
      className={cn(style, 'hover:underline', className)}
      to={link}
    >
      {content.text}
    </Link>
  );
}
