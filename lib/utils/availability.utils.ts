import { DAY_ORDER, DAYS_OF_WEEK } from '@/constants/schedule.const';

import type { AvailabilityDto, DayOfWeek } from '@/types';

/*
  The scheduling arithmetic, in one client-safe place. Times and dates are the zero-padded
  strings the model stores (`09:30`, `2026-08-17`), so every comparison here is a plain string
  comparison that is also a chronological one — no `Date`, no timezone anywhere near a clash
  check. The booking screen in step 9 imports the same `expandSlots`, so the two cannot disagree
  about how many slots a block holds.

  Imported from the constant module directly rather than through `@/constants`, so this stays
  safe to pull into a client bundle.
*/

/** A date far enough out to stand in for "no end" when an effective window is open-ended. */
const OPEN_ENDED = '9999-12-31';

/** One bookable slot within a block. */
export type Slot = {
  startTime: string;
  endTime: string;
};

/** A day of the week with the blocks that fall on it, for a week view. */
export type AvailabilityDay = {
  day: DayOfWeek;
  blocks: AvailabilityDto[];
};

/** Minutes since midnight for a bare `HH:mm`, so two wall-clock times can be diffed as numbers. */
function toMinutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** A bare `HH:mm` for a count of minutes since midnight. */
function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Whether two time ranges on the same day overlap.
 *
 * Half-open on purpose: a block ending at 10:00 does not clash with one starting at 10:00, which
 * is the normal back-to-back sitting. Both values are zero-padded `HH:mm`, so a string comparison
 * is a chronological one.
 *
 * @param firstStart - Start of the first range.
 * @param firstEnd - End of the first range.
 * @param secondStart - Start of the second range.
 * @param secondEnd - End of the second range.
 *
 * @returns True when the two ranges share any minute.
 */
export function timeRangesOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string): boolean {
  return firstStart < secondEnd && secondStart < firstEnd;
}

/**
 * Whether two effective windows overlap.
 *
 * A window with no end is open — it runs to `OPEN_ENDED` — so a permanent block overlaps every
 * later one. Two blocks on the same weekday at the same hour but in windows that do not overlap
 * (last spring vs this autumn) are not a clash: they were never live at once.
 *
 * @param firstFrom - Start date of the first window.
 * @param firstTo - End date of the first window, or null/undefined for open-ended.
 * @param secondFrom - Start date of the second window.
 * @param secondTo - End date of the second window, or null/undefined for open-ended.
 *
 * @returns True when the two windows share any day.
 */
export function dateRangesOverlap(
  firstFrom: string,
  firstTo: string | null | undefined,
  secondFrom: string,
  secondTo: string | null | undefined
): boolean {
  return firstFrom <= (secondTo ?? OPEN_ENDED) && secondFrom <= (firstTo ?? OPEN_ENDED);
}

/**
 * Expand a block into its bookable slots.
 *
 * Only whole slots that fit are returned — a 09:00–13:00 block of twenty-minute slots yields
 * twelve, and the odd ten minutes at the end of a block that does not divide evenly are left
 * unbooked rather than sold as a short slot. Pure, so the availability screen and the step-9
 * booking screen count a block the same way.
 *
 * @param startTime - Block start, `HH:mm`.
 * @param endTime - Block end, `HH:mm`.
 * @param slotMinutes - Length of one slot.
 *
 * @returns The slots, in order.
 */
export function expandSlots(startTime: string, endTime: string, slotMinutes: number): Slot[] {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const slots: Slot[] = [];

  for (let cursor = start; cursor + slotMinutes <= end; cursor += slotMinutes) {
    slots.push({ startTime: toTime(cursor), endTime: toTime(cursor + slotMinutes) });
  }

  return slots;
}

/**
 * How many bookable slots a block holds.
 *
 * @param block - The block, needing `startTime`, `endTime` and `slotMinutes`.
 *
 * @returns The slot count.
 */
export function countSlots(block: Pick<AvailabilityDto, 'startTime' | 'endTime' | 'slotMinutes'>): number {
  return expandSlots(block.startTime, block.endTime, block.slotMinutes).length;
}

/**
 * Arrange blocks into an ordered week — every day present, each day's blocks sorted by start.
 *
 * Every weekday gets an entry even when empty, so the week view renders a "nothing on" row
 * rather than collapsing the day and shifting the rest.
 *
 * @param blocks - The blocks to arrange.
 *
 * @returns One entry per day, Sunday first, each sorted by start time.
 */
export function groupBlocksByDay(blocks: AvailabilityDto[]): AvailabilityDay[] {
  const byDay = new Map<DayOfWeek, AvailabilityDto[]>();

  for (const day of DAYS_OF_WEEK) {
    byDay.set(day, []);
  }

  for (const block of blocks) {
    byDay.get(block.dayOfWeek)?.push(block);
  }

  return DAYS_OF_WEEK.map(day => ({
    day,
    blocks: (byDay.get(day) ?? []).sort((first, second) => first.startTime.localeCompare(second.startTime)),
  })).sort((first, second) => DAY_ORDER[first.day] - DAY_ORDER[second.day]);
}
