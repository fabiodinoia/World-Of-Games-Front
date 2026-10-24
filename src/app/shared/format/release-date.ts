/**
 * "2013-09-17" -> "17 September 2013". Listings are user-entered, so anything
 * that isn't a parseable date is shown as typed instead of throwing.
 */
export const formatReleaseDate = (value: string | null | undefined): string => {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  const date = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};
