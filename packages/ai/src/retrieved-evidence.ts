import type { Document } from './types/document';

const CLOSING_DELIMITER = '</retrieved-evidence>';

export function protectRetrievedEvidence<T extends Document>(document: T) {
  const content = document.content.replaceAll(CLOSING_DELIMITER, '&lt;/retrieved-evidence&gt;');
  return {
    ...document,
    content: `<retrieved-evidence source-id="${document.id}">\n${content}\n${CLOSING_DELIMITER}`,
  };
}
