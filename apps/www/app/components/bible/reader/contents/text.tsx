import type { TextContent as TextContentType } from '@/schemas/bibles/contents';
import { useBibleReaderStore } from '@/www/contexts/bible-reader';
import { cn } from '@/www/lib/utils';
import type { HighlightInfo } from '@/www/types/bible';
import { gatherElementIdsByVerseNumber, hexToRgb } from '@/www/utils';
import { useCallback, useMemo } from 'react';

export type TextContentProps = {
  content: TextContentType;
  style: string;
  // biome-ignore lint/suspicious/noExplicitAny: We need to pass all props to the span
  props: any;
  highlights?: HighlightInfo[];
  className?: string;
};

export function TextContent({ content, style, props, highlights, className }: TextContentProps) {
  const brStore = useBibleReaderStore();
  const highlightColor = useMemo(
    () => highlights?.find(({ verseNumber }) => verseNumber === content.verseNumber)?.color,
    [highlights, content.verseNumber],
  );
  const selected = useMemo(
    () => brStore.selectedVerseInfos.some((i) => i.contentIds.includes(content.id)),
    [brStore.selectedVerseInfos, content.id],
  );

  const handleClick = useCallback(() => {
    if (content.verseNumber === undefined) {
      return;
    }

    brStore.setSelectedVerseInfos((prev) => {
      if (prev.find(({ number }) => number === content.verseNumber)) {
        return prev.filter(({ number }) => number !== content.verseNumber);
      }
      const contentIds = gatherElementIdsByVerseNumber(content.verseNumber!);
      const text = contentIds
        .map((id) => {
          const el = document.getElementById(id)!;
          if (el.getAttribute('data-type') === 'verse') {
            return `${el.textContent} `;
          }
          return el.textContent;
        })
        .join('')
        .trim();
      return [
        ...prev,
        {
          number: content.verseNumber!,
          contentIds,
          text,
        },
      ];
    });
  }, [brStore, content.verseNumber]);

  const bgColor = useMemo(() => {
    if (highlightColor) {
      const rgb = hexToRgb(highlightColor);
      if (rgb) {
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.50)`;
      }
    }
    return 'transparent';
  }, [highlightColor]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Conditional button semantics are applied only to selectable verse text
    <span
      id={content.id}
      data-type={content.type}
      data-verse-number={content.verseNumber}
      {...props}
      className={cn(
        style,
        'inline decoration-transparent underline-offset-4 transition duration-500',
        content.verseNumber !== undefined && 'hover:cursor-pointer',
        selected && 'underline decoration-foreground decoration-dotted',
        className,
      )}
      style={{
        backgroundColor: bgColor,
      }}
      role={content.verseNumber === undefined ? undefined : 'button'}
      tabIndex={content.verseNumber === undefined ? undefined : 0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      onClick={content.verseNumber === undefined ? undefined : handleClick}
    >
      {content.text}
    </span>
  );
}
