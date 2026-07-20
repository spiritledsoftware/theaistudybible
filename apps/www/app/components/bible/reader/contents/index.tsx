import type { Content } from '@/schemas/bibles/contents';
import type { VerseNote } from '@/schemas/bibles/verses/types';
import { cn } from '@/www/lib/utils';
import type { HighlightInfo } from '@/www/types/bible';
import { CharContent } from './char';
import { NoteContent } from './note';
import { RefContent } from './ref';
import { TextContent } from './text';
import { VerseContent } from './verse';
export type ContentsProps = {
  contents: Content[];
  highlights?: HighlightInfo[];
  notes?: VerseNote[];
  className?: string;
};

export function Contents({ contents, highlights, notes, className }: ContentsProps) {
  return contents.map((content) => {
    const { style, ...attrs } = content.attrs || {};
    const addProps = Object.entries(attrs).reduce(
      (acc, [key, value]) => {
        if (key.startsWith('data-')) {
          acc[key] = value;
        } else {
          acc[`data-${key}`] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    switch (content.type) {
      case 'text': {
        return (
          <TextContent
            key={content.id}
            content={content}
            style={style}
            props={addProps}
            highlights={highlights}
            className={className}
          />
        );
      }
      case 'ref': {
        return (
          <RefContent
            key={content.id}
            content={content}
            style={style}
            attrs={attrs}
            props={addProps}
            className={className}
          />
        );
      }
      case 'verse': {
        return (
          <VerseContent
            key={content.id}
            content={content}
            style={style}
            className={className}
            notes={notes}
            props={addProps}
          />
        );
      }
      case 'char': {
        return (
          <CharContent
            key={content.id}
            content={content}
            style={style}
            className={className}
            highlights={highlights}
            notes={notes}
            props={addProps}
          />
        );
      }
      case 'para': {
        return (
          <p
            key={content.id}
            id={content.id}
            data-type={content.type}
            {...addProps}
            className={cn(style, className)}
          >
            <Contents contents={content.contents} highlights={highlights} notes={notes} />
          </p>
        );
      }
      case 'note': {
        return <NoteContent key={content.id} content={content} props={addProps} />;
      }
      default: {
        return null;
      }
    }
  });
}
