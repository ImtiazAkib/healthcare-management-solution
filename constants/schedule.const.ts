import { DayOfWeek } from '@/types';

import { FILTER_ALL } from '@/constants/users.const';

export const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const satisfies readonly DayOfWeek[];

/**
 * An availability block is either live or retired — the same two flags a department or a service
 * carries. The filter reuses the shared "all" sentinel, alongside the doctor and day filters,
 * which narrow to a single id or weekday.
 */
export const AVAILABILITY_STATUS_FILTERS = {
  ALL: FILTER_ALL,
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
};

/**
 * The one mapping between a stored day name and JavaScript's `Date.getDay()` index.
 *
 * `DAYS_OF_WEEK` is already in this order, so the index is the array position — but the
 * dependency is written down rather than left as a coincidence somebody could break by
 * sorting the list alphabetically one day.
 */
export const DAY_ORDER: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * A clock time, zero-padded, 24-hour: `09:30`, never `9:30`.
 *
 * The padding is the whole point. Zero-padded times compare correctly as plain strings, so
 * `startTime < endTime` is a string comparison and so is the overlap test step 8 runs
 * between two blocks — no date arithmetic, no timezone anywhere near it.
 */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A calendar date, zero-padded: `2026-08-17`.
 *
 * Stored as this string rather than a `Date`, for the same reason times are strings. A
 * `Date` would carry an instant, and "the 17th" in a hospital is a day rather than an
 * instant — which midnight it means depends on a timezone every caller would have to apply
 * identically. **The unique index that prevents double-booking is an equality match on this
 * field**, so two code paths computing the same day slightly differently would not collide
 * where they must. A string computed once, by one helper, cannot drift.
 */
export const CALENDAR_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * How long one bookable slot runs. The bounds are sanity rails: a five-minute floor because
 * a consultation shorter than that is a data-entry error, and a four-hour ceiling because a
 * block longer than that is a session rather than a slot.
 */
export const SLOT_MINUTES = {
  MIN: 5,
  MAX: 240,
  DEFAULT: 20,
} as const;
