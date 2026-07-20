import { describe, expect, it } from 'vitest';
import { validateDevotionDraft } from './validation';

const validDraft = {
  topic: 'hope',
  bibleReading:
    '> “Hope does not disappoint.” — [Romans 5:5](https://theaistudybible.com/bible/WEB/ROM/5/5)',
  summary:
    'Paul connects hope with God’s love in [Romans 5:5](https://theaistudybible.com/bible/WEB/ROM/5/5).',
  reflection:
    '## Main Theme\nHope rests in God’s love [Romans 5:5](https://theaistudybible.com/bible/WEB/ROM/5/5).\n\n## Reflection Questions\n1. Where do I need hope?',
  prayer: 'God, help me rest in the hope described in Scripture. Amen.',
  diveDeeperQueries: ['What does Romans teach about hope?'],
  evidenceSources: [
    {
      id: 'source-1',
      url: '/bible/WEB/ROM/5?verseNumber=5&verseNumber=6',
    },
  ],
};

describe('validateDevotionDraft', () => {
  it('accepts a cited, source-supported, non-duplicate draft', () => {
    expect(
      validateDevotionDraft(validDraft, {
        allowedOrigin: 'https://theaistudybible.com',
        previousBibleReadings: [],
      }),
    ).toEqual([]);
  });

  it('rejects unsupported, uncited, and duplicate drafts', () => {
    expect(
      validateDevotionDraft(
        {
          ...validDraft,
          bibleReading: 'Hope does not disappoint.',
          evidenceSources: [],
        },
        {
          allowedOrigin: 'https://theaistudybible.com',
          previousBibleReadings: ['Hope does not disappoint.'],
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        'Bible reading must cite retrieved in-app Scripture',
        'Devotional must be supported by retrieved evidence',
        'Bible reading duplicates a recent devotional',
      ]),
    );
  });

  it('rejects links that were not returned with retrieved evidence', () => {
    expect(
      validateDevotionDraft(
        { ...validDraft, summary: '[Unsupported](https://example.com/claim)' },
        {
          allowedOrigin: 'https://theaistudybible.com',
          previousBibleReadings: [],
        },
      ),
    ).toContain('Devotional contains a link that is not retrieved evidence');
  });

  it('rejects an invented same-origin Scripture citation', () => {
    expect(
      validateDevotionDraft(
        {
          ...validDraft,
          bibleReading:
            '> Invented text — [Romans 99:99](https://theaistudybible.com/bible/WEB/ROM/99/99)',
        },
        {
          allowedOrigin: 'https://theaistudybible.com',
          previousBibleReadings: [],
        },
      ),
    ).toContain('Bible reading must cite retrieved in-app Scripture');
  });

  it('rejects substantive paragraphs without retrieved citations', () => {
    expect(
      validateDevotionDraft(
        {
          ...validDraft,
          summary: 'Paul connects hope with God’s love.',
        },
        {
          allowedOrigin: 'https://theaistudybible.com',
          previousBibleReadings: [],
        },
      ),
    ).toContain('Devotional substantive claims must cite retrieved evidence');
  });

  it('does not let a trailing question hide an uncited claim', () => {
    expect(
      validateDevotionDraft(
        {
          ...validDraft,
          reflection:
            '## Main Theme\nPaul wrote Romans in AD 57. What does that historical context imply?',
        },
        {
          allowedOrigin: 'https://theaistudybible.com',
          previousBibleReadings: [],
        },
      ),
    ).toContain('Devotional substantive claims must cite retrieved evidence');
  });
});
