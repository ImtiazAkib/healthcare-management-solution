import { APPOINTMENT_STATUSES, TRIAGE_PRIORITY_ORDER } from '@/constants/appointment.const';

import { toCalendarDate, toClockTime } from './datetime.utils';

import type { AppointmentStatus, TriagePriority } from '@/types';

/*
  The appointment lifecycle, in one place, because the schema deliberately does not encode it: a
  set of values cannot say "cancelled is reachable before check-in but not after". Every mutating
  method consults this, and cannot answer it differently.

  A counter booking begins **confirmed** — reception is the confirmation. `requested` is where a
  patient's own booking starts in step 13, and `confirmed` is where staff move it; the move is
  listed here so the two paths share one state machine rather than growing a second.
*/
export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  requested: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.CANCELLED],
  // No-show is legal here, but only once the slot has passed — that extra gate lives in the service.
  confirmed: [APPOINTMENT_STATUSES.CHECKED_IN, APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW],
  // A patient who has checked in has arrived, so the appointment can no longer be cancelled.
  'checked-in': [APPOINTMENT_STATUSES.IN_CONSULTATION],
  'in-consultation': [APPOINTMENT_STATUSES.COMPLETED],
  completed: [],
  cancelled: [],
  'no-show': [],
};

/**
 * Whether an appointment may move from one status to another.
 *
 * The shape rule only — the time-based gate on a no-show (the slot must have passed) is the
 * service's, because it needs a clock.
 *
 * @param from - The current status.
 * @param to - The proposed next status.
 *
 * @returns True when the move is one the lifecycle allows.
 */
export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Whether a slot's end time has passed, in the facility's timezone.
 *
 * The gate on marking a no-show: a patient is not absent until the time they were due is over.
 * Everything compares as a plain string because the stored date and time already are strings in
 * the facility's zone, and `toCalendarDate`/`toClockTime` put "now" into the same shape.
 *
 * @param date - The slot's date, `YYYY-MM-DD`.
 * @param endTime - The slot's end, `HH:mm`.
 * @param now - The instant to judge against. Defaults to now.
 *
 * @returns True when the slot is over.
 */
export function isSlotPast(date: string, endTime: string, now: Date = new Date()): boolean {
  const today = toCalendarDate(now);

  if (date !== today) {
    return date < today;
  }

  return endTime <= toClockTime(now);
}

/**
 * Queue order: most urgent first, then by token number, which is arrival order.
 *
 * An emergency jumps the line; everyone at the same priority keeps the order they checked in. A
 * missing token sorts last, though every queued appointment has one — the token is what put it in
 * the queue.
 *
 * @param first - One entry.
 * @param second - The other.
 *
 * @returns A comparator result for `sort`.
 */
export function compareQueueOrder(
  first: { triagePriority: TriagePriority; tokenNo?: number | null },
  second: { triagePriority: TriagePriority; tokenNo?: number | null }
): number {
  const priorityDelta = TRIAGE_PRIORITY_ORDER[first.triagePriority] - TRIAGE_PRIORITY_ORDER[second.triagePriority];

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return (first.tokenNo ?? Number.POSITIVE_INFINITY) - (second.tokenNo ?? Number.POSITIVE_INFINITY);
}
