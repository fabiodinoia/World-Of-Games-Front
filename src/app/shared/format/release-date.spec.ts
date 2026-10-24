import { formatReleaseDate } from './release-date';

describe('formatReleaseDate', () => {
  it('formats ISO dates in long form', () => {
    expect(formatReleaseDate('2013-09-17')).toBe('17 September 2013');
  });

  it('leaves free-text values untouched', () => {
    expect(formatReleaseDate('Spring 2026')).toBe('Spring 2026');
    expect(formatReleaseDate('2024-13-45')).toBe('2024-13-45');
  });

  it('handles empty values', () => {
    expect(formatReleaseDate(undefined)).toBe('');
  });
});
