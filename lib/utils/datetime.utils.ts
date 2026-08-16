// Imported from the modules rather than the `@/constants` barrel: these helpers are reached
// from models and scripts, and the barrel drags `lucide-react` with it.
import { DEFAULT_TIMEZONE } from '@/constants/datetime.const';
import { DAY_ORDER, TIME_PATTERN } from '@/constants/schedule.const';

import type { DayOfWeek } from '@/types';

/*
  Every formatter is a module-level `Intl` instance rather than one built per call. They are
  expensive to construct and this app formats a lot of dates, and pinning the timezone in one
  place per format is what stops "09:30" meaning something different on a server in another
  country.
*/

const calendarDateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: DEFAULT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const shortDate = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' });
const longDate = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDateTime = new Intl.DateTimeFormat('en-US', {
  timeZone: DEFAULT_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TIMEZONE, weekday: 'long' });

/**
 * The calendar date an instant falls on **in the facility's timezone**, as `YYYY-MM-DD`.
 *
 * `en-CA` is not a locale choice — it is the one built-in locale whose numeric date format
 * is already ISO order, which makes this a formatter rather than a hand-rolled string build
 * with three `padStart` calls.
 *
 * This is the only place a calendar date is produced. Two code paths computing "today"
 * differently would put two appointments on what the double-booking index considers
 * different days.
 *
 * @param value - The instant to read. Defaults to now.
 *
 * @returns The date as `YYYY-MM-DD`.
 */
export function toCalendarDate(value: Date = new Date()): string {
  return calendarDateParts.format(value);
}

/**
 * Which day of the week a calendar date falls on.
 *
 * Parsed as UTC midnight on purpose: the input is a bare date with no instant in it, and
 * `new Date('2026-08-17')` is already UTC midnight, so reading `getUTCDay()` asks the
 * question the string actually answers rather than reinterpreting it in the server's zone.
 *
 * @param calendarDate - A `YYYY-MM-DD` date.
 *
 * @returns The day name, or null if the string is not a date.
 */
export function dayOfWeekFor(calendarDate: string): DayOfWeek | null {
  const parsed = new Date(`${calendarDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const index = parsed.getUTCDay();

  return (Object.keys(DAY_ORDER) as DayOfWeek[]).find(day => DAY_ORDER[day] === index) ?? null;
}

/**
 * Whether a clock time is the zero-padded 24-hour form everything else assumes.
 *
 * @param value - The time to check.
 *
 * @returns True for `09:30`, false for `9:30` and `24:00`.
 */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Minutes since midnight, for arithmetic that string comparison cannot do — slot expansion,
 * and the length of a block.
 *
 * @param value - A zero-padded `HH:mm` time.
 *
 * @returns Minutes since midnight.
 */
export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);

  return hours * 60 + minutes;
}

/**
 * The inverse of {@link minutesFromTime}, zero-padded so the result compares as a string.
 *
 * @param minutes - Minutes since midnight.
 *
 * @returns A zero-padded `HH:mm` time.
 */
export function timeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Whole years between a date of birth and today, in the facility's timezone.
 *
 * @param dateOfBirth - The date of birth.
 *
 * @returns Age in whole years, or null when there is no date of birth.
 */
export function ageInYears(dateOfBirth: Date | string | null | undefined): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const born = new Date(dateOfBirth);

  if (Number.isNaN(born.getTime())) {
    return null;
  }

  /*
    Compared as calendar dates rather than by subtracting milliseconds and dividing. A
    division gets leap years subtly wrong, and "subtly wrong" in an age is the difference
    between an adult and a pediatric reference range.
  */
  const [bornYear, bornMonth, bornDay] = toCalendarDate(born).split('-').map(Number);
  const [nowYear, nowMonth, nowDay] = toCalendarDate().split('-').map(Number);

  const hasHadBirthday = nowMonth > bornMonth || (nowMonth === bornMonth && nowDay >= bornDay);

  return nowYear - bornYear - (hasHadBirthday ? 0 : 1);
}

/**
 * Format an instant for display, in the facility's timezone.
 *
 * Every one of these is used on the server and the string is passed to the client already
 * formatted. A client re-formatting an ISO string would quietly fall back to the visitor's
 * own timezone, and the hospital runs on one clock.
 *
 * @param value - The instant to format.
 *
 * @returns The formatted date.
 */
export function formatShortDate(value: Date | string): string {
  return shortDate.format(new Date(value));
}

/**
 * @param value - The instant to format.
 *
 * @returns The date with its weekday spelled out.
 */
export function formatLongDate(value: Date | string): string {
  return longDate.format(new Date(value));
}

/**
 * @param value - The instant to format.
 *
 * @returns The date and 24-hour time.
 */
export function formatShortDateTime(value: Date | string): string {
  return shortDateTime.format(new Date(value));
}

/**
 * @param value - The instant to format.
 *
 * @returns The weekday name.
 */
export function formatWeekday(value: Date | string): string {
  return weekday.format(new Date(value));
}
