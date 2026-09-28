import { createId } from '@/core/utils/id';
import type {
  CharContent,
  Content,
  NoteContent,
  OwningContent,
  ParaContent,
} from '@/schemas/bibles/contents';
import {
  DOMParser,
  type Element,
  MIME_TYPE,
  type Node,
  type NodeList,
  onErrorStopParsing,
} from '@xmldom/xmldom';

export const ignoredElements = [
  'book', // Book marker meaningless since books served separately
  'table', // TODO Tables are probably non-biblical content (but confirm)
  'row', // Part of a table
  'cell', // Part of a table
  'sidebar', // Non-biblical info not tied to specific verse
  'periph', // Non-biblical extra info
  'figure', // Illustrations etc
  'optbreak', // Line breaks that are optional (and opting not to use)
  'ms', // TODO Multi-purpose markers (could be useful in future)
];

export type ParserState = {
  chapterNumber?: number;
  verseNumber?: number;
  owningObjId?: string;
  contents: {
    [key: number]: {
      contents: Content[];
      verseContents: {
        [key: number]: {
          contents: Content[];
        };
      };
    };
  };
};

export function parseUsx(xmlString: string) {
  const doc = new DOMParser({ onError: onErrorStopParsing }).parseFromString(
    xmlString,
    MIME_TYPE.XML_APPLICATION,
  );
  const usx = doc.documentElement;
  if (!usx) {
    throw new Error('Invalid USX document');
  }

  if (usx.nodeName !== 'usx' || usx.nodeType !== usx.ELEMENT_NODE) {
    throw new Error('Invalid USX document');
  }

  const state: ParserState = {
    contents: {},
  };

  for (const child of Array.from(usx.childNodes)) {
    if (child.nodeType !== child.ELEMENT_NODE) {
      continue;
    }

    const element = child as Element;
    // Ignore extra-biblical elements
    if (ignoredElements.includes(child.nodeName)) {
      console.log('Ignoring node:', child.nodeName);
      continue;
    }

    if (child.nodeName === 'chapter') {
      if (element.hasAttribute('eid')) {
        state.chapterNumber = undefined;
        continue;
      }

      const chapterNumber = Number.parseInt(element.getAttribute('number') ?? '0');
      if (chapterNumber < 1) {
        throw new Error(`Invalid chapter number ${chapterNumber}`);
      }
      state.chapterNumber = chapterNumber;
      continue;
    }

    if (child.nodeName === 'para') {
      if (state.chapterNumber === undefined) {
        console.log('Ignoring para outside chapter:', element.textContent);
        continue;
      }

      const para: ParaContent = {
        type: 'para',
        id: `para_${createId()}`,
        attrs: element.attributes
          ? Array.from(element.attributes).reduce(
              (acc, { name: key }) => {
                acc[key] = element.getAttribute(key)!;
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
        contents: [],
      } as const;

      addContent(state, para);
      const previousOwningObjId = state.owningObjId;
      state.owningObjId = para.id;
      parseContents(state, child.childNodes);
      state.owningObjId = previousOwningObjId;
      continue;
    }

    throw new Error(`Unhandled element: ${child.nodeName}`);
  }

  return state.contents;
}

export function parseContents(state: ParserState, nodes: NodeList<Node>) {
  for (const node of Array.from(nodes)) {
    if (node.nodeType === 3) {
      if (state.chapterNumber === undefined) {
        console.log('Ignoring text outside chapter:', node.textContent);
        continue;
      }

      const element = node as Element;
      const text = element.textContent;
      if (!text || text.trim() === '') continue;

      addContent(state, {
        type: 'text',
        id: `txt_${createId()}`,
        verseNumber: state.verseNumber,
        text: text.replaceAll('\n', ''),
        attrs: element.attributes
          ? Array.from(element.attributes).reduce(
              (acc, { name: key }) => {
                acc[key] = element.getAttribute(key)!;
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
      });

      continue;
    }

    // Ignore all other node types that aren't elements (e.g. comments), or on ignored list
    if (node.nodeType !== 1 || ignoredElements.includes(node.nodeName)) {
      console.log('Ignoring node:', node.nodeName, node.textContent);
      continue;
    }

    const element = node as Element;
    if (element.nodeName === 'verse') {
      if (element.hasAttribute('eid')) {
        state.verseNumber = undefined;
        continue;
      }
      if (state.chapterNumber === undefined) throw new Error('No chapter number found');

      const verseNumber = Number.parseInt(element.getAttribute('number') ?? '0');
      if (verseNumber < 1) {
        throw new Error(`Invalid verse number ${verseNumber}`);
      }
      state.verseNumber = verseNumber;

      addContent(state, {
        type: 'verse',
        id: `ver_${createId()}`,
        number: verseNumber,
        attrs: element.attributes
          ? Array.from(element.attributes).reduce(
              (acc, { name: key }) => {
                acc[key] = element.getAttribute(key)!;
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
      });
      continue;
    }

    if (element.nodeName === 'char') {
      if (state.chapterNumber === undefined) {
        console.log('Ignoring char outside chapter:', element.textContent);
        continue;
      }

      const char: CharContent = {
        type: element.nodeName as 'char',
        id: `char_${createId()}`,
        verseNumber: state.verseNumber,
        attrs: element.attributes
          ? Array.from(element.attributes).reduce(
              (acc, { name: key }) => {
                acc[key] = element.getAttribute(key)!;
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
        contents: [],
      };

      addContent(state, char);
      const prevOwningObjId = state.owningObjId;
      state.owningObjId = char.id;
      parseContents(state, element.childNodes);
      state.owningObjId = prevOwningObjId;
      continue;
    }

    if (element.nodeName === 'note') {
      if (state.chapterNumber === undefined) {
        console.log('Ignoring note outside chapter:', element.textContent);
        continue;
      }

      const note: NoteContent = {
        type: element.nodeName as 'note',
        id: `note_${createId()}`,
        verseNumber: state.verseNumber,
        attrs: element.attributes
          ? Array.from(element.attributes).reduce(
              (acc, { name: key }) => {
                acc[key] = element.getAttribute(key)!;
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
        contents: [],
      };

      addContent(state, note);
      const prevOwningObjId = state.owningObjId;
      state.owningObjId = note.id;
      parseContents(state, element.childNodes);
      state.owningObjId = prevOwningObjId;
      continue;
    }

    if (element.nodeName === 'ref') {
      if (state.chapterNumber === undefined) {
        console.log('Ignoring ref outside chapter:', element.textContent);
        continue;
      }

      addContent(state, {
        type: 'ref',
        id: `ref_${createId()}`,
        verseNumber: state.verseNumber,
        text: element.textContent ?? '',
        attrs: element.attributes
          ? Array.from(element.attributes).reduce(
              (acc, { name: key }) => {
                acc[key] = element.getAttribute(key)!;
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
      });
      continue;
    }

    throw new Error(
      `Unhandled element: ${element.nodeName} ${element.nodeType} in Chapter ${state.chapterNumber} Verse ${state.verseNumber}`,
    );
  }
}

export function addContent(state: ParserState, content: Content) {
  if (state.chapterNumber === undefined) return;
  let chapter = state.contents[state.chapterNumber];
  if (!chapter) {
    chapter = { contents: [], verseContents: {} };
    state.contents[state.chapterNumber] = chapter;
  }

  let clonedContent = JSON.parse(JSON.stringify(content)) as Content;
  if (state.owningObjId) {
    const owning = findOwning(state.owningObjId, state.contents[state.chapterNumber].contents);
    if (owning) {
      owning.contents.push(clonedContent);
    } else {
      console.warn('Pushing chapter content without owning content', content.type, content.id);
      chapter.contents.push(clonedContent);
    }
  } else {
    chapter.contents.push(clonedContent);
  }

  if (state.verseNumber === undefined) return;

  clonedContent = JSON.parse(JSON.stringify(content)) as Content;
  let verse = state.contents[state.chapterNumber].verseContents[state.verseNumber];
  if (!verse) {
    verse = { contents: [] };
    state.contents[state.chapterNumber].verseContents[state.verseNumber] = verse;
  }

  if (state.owningObjId) {
    let owning = findOwning(state.owningObjId, verse.contents);
    if (owning) {
      owning.contents.push(clonedContent);
    } else {
      owning = findOwning(state.owningObjId, chapter.contents);
      if (owning) {
        const { contents: _contents, ...rest } = owning;
        const clonedOwning = JSON.parse(JSON.stringify({ ...rest, contents: [] })) as OwningContent;
        clonedOwning.contents.push(clonedContent);
        verse.contents.push(clonedOwning);
      } else {
        console.warn('Pushing verse content without owning content', content.type, content.id);
        verse.contents.push(clonedContent);
      }
    }
  } else {
    verse.contents.push(clonedContent);
  }
}

export function findOwning(
  owningContentId: string,
  contents: Content[],
): OwningContent | undefined {
  for (const content of contents) {
    if (content.type === 'char' || content.type === 'note' || content.type === 'para') {
      if (content.id === owningContentId) return content;

      const found = findOwning(owningContentId, content.contents);
      if (found) return found;
    }
  }
  return undefined;
}
