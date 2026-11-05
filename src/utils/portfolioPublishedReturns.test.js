import {
  formattedPublishedReturn,
  monthlyPublishedReturnEntries,
  parsePublishedReturn,
  publishedReturnTone,
  summarizePublishedReturns,
} from './portfolioPublishedReturns';

test('distinguishes absent published fund returns from an explicitly reported zero', () => {
  expect(parsePublishedReturn(undefined)).toBeNull();
  expect(parsePublishedReturn(null)).toBeNull();
  expect(parsePublishedReturn('')).toBeNull();
  expect(parsePublishedReturn('  ')).toBeNull();
  expect(parsePublishedReturn('unavailable')).toBeNull();
  expect(parsePublishedReturn(false)).toBeNull();
  expect(parsePublishedReturn('0')).toBe(0);
  expect(parsePublishedReturn(0)).toBe(0);
  expect(parsePublishedReturn('-1.25')).toBe(-1.25);
});

test('only explicitly recorded valid months enter the published-return calculation', () => {
  expect(monthlyPublishedReturnEntries({
    jan: '', feb: null, mar: ' ', apr: 0, may: '-1.25', jun: '1.5', jul: 'n/a',
  })).toEqual([
    { month: 'apr', value: 0 },
    { month: 'may', value: -1.25 },
    { month: 'jun', value: 1.5 },
  ]);
});

test('positive, negative, zero and unreported returns have distinct accessible tones and signs', () => {
  expect(publishedReturnTone(-3.5)).toContain('text-rose-700');
  expect(publishedReturnTone(3.5)).toContain('text-emerald-700');
  expect(publishedReturnTone(0)).toContain('text-slate-900');
  expect(formattedPublishedReturn(-3.5)).toBe('-3.50%');
  expect(formattedPublishedReturn(3.5)).toBe('+3.50%');
  expect(formattedPublishedReturn(0)).toBe('0.00%');
  expect(formattedPublishedReturn(null)).toBe('—');
});

test('summary distinguishes incomplete published months from reported zeros', () => {
  expect(summarizePublishedReturns({jan: '', feb: null})).toEqual({entries: [], simple: null, compound: null});
  expect(summarizePublishedReturns({jan: '0'})).toEqual({
    entries: [{month: 'jan', value: 0}], simple: 0, compound: 0,
  });
  const summary = summarizePublishedReturns({jan: -2, feb: 1});
  expect(summary.entries).toHaveLength(2);
  expect(summary.simple).toBe(-1);
  expect(summary.compound).toBeCloseTo(-1.02, 5);
});
