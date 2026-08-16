/**
 * Stored as the word rather than a number.
 *
 * A recurring availability block is a row somebody will read in a database shell one day,
 * and `dayOfWeek: 3` invites the reader to guess whether the week starts on Sunday. The
 * mapping to JavaScript's `getDay()` index lives in `DAY_ORDER`, in one place.
 */
export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
