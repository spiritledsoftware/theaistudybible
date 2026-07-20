import { z } from 'zod';

const EvidenceSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
});

const DevotionDraftSchema = z.object({
  topic: z.string().trim().min(1).max(100),
  bibleReading: z.string().trim().min(20).max(4_000),
  summary: z.string().trim().min(20).max(5_000),
  reflection: z.string().trim().min(20).max(8_000),
  prayer: z.string().trim().min(10).max(3_000),
  diveDeeperQueries: z.array(z.string().trim().min(5).max(500)).min(1).max(4),
  evidenceSources: z.array(EvidenceSourceSchema),
});

export type DevotionDraft = z.infer<typeof DevotionDraftSchema>;

export type DevotionEvidenceSource = z.infer<typeof EvidenceSourceSchema>;

const URL_PATTERN = /https?:\/\/[^\s)\]>]+/g;
const UNSAFE_AUTHORITY_PATTERNS = [
  /\bas your pastor\b/i,
  /\bi am praying for you\b/i,
  /\bstop taking (?:your )?medication\b/i,
  /\bdo not seek (?:medical|professional|emergency) help\b/i,
];

function normalize(value: string) {
  return value.normalize('NFKC').replaceAll(/\s+/g, ' ').trim().toLowerCase();
}

type ScriptureLocation = {
  bibleAbbreviation: string;
  bookCode: string;
  chapterNumber: number;
  verseNumbers: number[];
};

function parseScriptureLocation(
  value: string,
  allowedOrigin: string,
): ScriptureLocation | undefined {
  try {
    const url = new URL(value, allowedOrigin);
    if (url.origin !== new URL(allowedOrigin).origin) return undefined;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts.length > 5 || parts[0] !== 'bible') return undefined;
    const chapterNumber = Number(parts[3]);
    const pathVerse = parts[4] === undefined ? [] : [Number(parts[4])];
    const queryVerses = url.searchParams.getAll('verseNumber').map(Number);
    const verseNumbers = [...pathVerse, ...queryVerses];
    if (
      !Number.isInteger(chapterNumber) ||
      chapterNumber < 1 ||
      verseNumbers.some((number) => !Number.isInteger(number) || number < 1)
    ) {
      return undefined;
    }
    return {
      bibleAbbreviation: decodeURIComponent(parts[1]),
      bookCode: decodeURIComponent(parts[2]),
      chapterNumber,
      verseNumbers,
    };
  } catch {
    return undefined;
  }
}

function isSameScriptureLocation(citation: ScriptureLocation, evidence: ScriptureLocation) {
  return (
    citation.bibleAbbreviation === evidence.bibleAbbreviation &&
    citation.bookCode === evidence.bookCode &&
    citation.chapterNumber === evidence.chapterNumber &&
    (citation.verseNumbers.length === 0 ||
      citation.verseNumbers.every((number) => evidence.verseNumbers.includes(number)))
  );
}

function normalizeUrl(value: string, allowedOrigin: string) {
  try {
    return new URL(value, allowedOrigin).href;
  } catch {
    return undefined;
  }
}

function isEvidenceLink(
  value: string,
  evidenceSources: DevotionEvidenceSource[],
  allowedOrigin: string,
) {
  const normalized = normalizeUrl(value, allowedOrigin);
  if (!normalized) return false;
  const scriptureCitation = parseScriptureLocation(value, allowedOrigin);
  return evidenceSources.some((source) => {
    if (normalizeUrl(source.url, allowedOrigin) === normalized) return true;
    const scriptureEvidence = parseScriptureLocation(source.url, allowedOrigin);
    return (
      scriptureCitation !== undefined &&
      scriptureEvidence !== undefined &&
      isSameScriptureLocation(scriptureCitation, scriptureEvidence)
    );
  });
}

export function getCitedEvidenceSourceIds(
  content: string,
  evidenceSources: DevotionEvidenceSource[],
  allowedOrigin: string,
) {
  const links = content.match(URL_PATTERN) ?? [];
  return evidenceSources
    .filter((source) =>
      links.some((link) => {
        const citation = parseScriptureLocation(link, allowedOrigin);
        const evidence = parseScriptureLocation(source.url, allowedOrigin);
        return (
          normalizeUrl(link, allowedOrigin) === normalizeUrl(source.url, allowedOrigin) ||
          (citation !== undefined &&
            evidence !== undefined &&
            isSameScriptureLocation(citation, evidence))
        );
      }),
    )
    .map((source) => source.id);
}

function hasApprovedBibleCitation(
  bibleReading: string,
  evidenceSources: DevotionEvidenceSource[],
  allowedOrigin: string,
) {
  return (bibleReading.match(URL_PATTERN) ?? []).some(
    (value) =>
      parseScriptureLocation(value, allowedOrigin) !== undefined &&
      isEvidenceLink(value, evidenceSources, allowedOrigin),
  );
}

function hasUnapprovedLink(
  draft: DevotionDraft,
  evidenceSources: DevotionEvidenceSource[],
  allowedOrigin: string,
) {
  const content = [draft.bibleReading, draft.summary, draft.reflection, draft.prayer].join('\n');
  return (content.match(URL_PATTERN) ?? []).some(
    (value) => !isEvidenceLink(value, evidenceSources, allowedOrigin),
  );
}

function hasUncitedSubstantiveParagraph(
  content: string,
  evidenceSources: DevotionEvidenceSource[],
  allowedOrigin: string,
) {
  return content.split(/\n\s*\n/).some((paragraph) => {
    const prose = paragraph
      .split('\n')
      .filter((line) => !/^\s*#{1,6}\s/.test(line))
      .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, ''))
      .join(' ')
      .trim();
    const hasSubstantiveStatement = prose
      .split(/(?<=[.!?])\s+/)
      .some((sentence) => sentence.trim().length > 0 && !sentence.trim().endsWith('?'));
    if (!hasSubstantiveStatement) return false;
    return !(prose.match(URL_PATTERN) ?? []).some((link) =>
      isEvidenceLink(link, evidenceSources, allowedOrigin),
    );
  });
}

export function validateDevotionDraft(
  input: unknown,
  options: { allowedOrigin: string; previousBibleReadings: string[] },
) {
  const result = DevotionDraftSchema.safeParse(input);
  if (!result.success) return ['Devotional schema is invalid'];

  const draft = result.data;
  const errors: string[] = [];
  if (!hasApprovedBibleCitation(draft.bibleReading, draft.evidenceSources, options.allowedOrigin)) {
    errors.push('Bible reading must cite retrieved in-app Scripture');
  }
  if (draft.evidenceSources.length === 0) {
    errors.push('Devotional must be supported by retrieved evidence');
  }
  if (
    hasUncitedSubstantiveParagraph(draft.summary, draft.evidenceSources, options.allowedOrigin) ||
    hasUncitedSubstantiveParagraph(draft.reflection, draft.evidenceSources, options.allowedOrigin)
  ) {
    errors.push('Devotional substantive claims must cite retrieved evidence');
  }
  const normalizedReading = normalize(draft.bibleReading);
  if (options.previousBibleReadings.some((reading) => normalize(reading) === normalizedReading)) {
    errors.push('Bible reading duplicates a recent devotional');
  }
  if (hasUnapprovedLink(draft, draft.evidenceSources, options.allowedOrigin)) {
    errors.push('Devotional contains a link that is not retrieved evidence');
  }
  const prose = `${draft.summary}\n${draft.reflection}`;
  if (UNSAFE_AUTHORITY_PATTERNS.some((pattern) => pattern.test(prose))) {
    errors.push('Devotional fails pastoral-safety checks');
  }
  return errors;
}
