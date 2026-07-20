export const CHRISTIAN_TRADITIONS = [
  'CATHOLIC',
  'EASTERN_ORTHODOX',
  'ANGLICAN',
  'REFORMED',
  'LUTHERAN',
  'WESLEYAN_METHODIST',
  'BAPTIST',
  'PENTECOSTAL_CHARISMATIC',
] as const;

export const SOURCE_CHRISTIAN_TRADITIONS = ['BROAD_CHRISTIAN', ...CHRISTIAN_TRADITIONS] as const;

export type ChristianTradition = (typeof CHRISTIAN_TRADITIONS)[number];
export type SourceChristianTradition = (typeof SOURCE_CHRISTIAN_TRADITIONS)[number];

export const CHRISTIAN_TRADITION_LABELS: Record<ChristianTradition, string> = {
  CATHOLIC: 'Catholic',
  EASTERN_ORTHODOX: 'Eastern Orthodox',
  ANGLICAN: 'Anglican',
  REFORMED: 'Reformed',
  LUTHERAN: 'Lutheran',
  WESLEYAN_METHODIST: 'Wesleyan/Methodist',
  BAPTIST: 'Baptist',
  PENTECOSTAL_CHARISMATIC: 'Pentecostal/Charismatic',
};

export function isChristianTradition(value: unknown): value is ChristianTradition {
  return CHRISTIAN_TRADITIONS.includes(value as ChristianTradition);
}
