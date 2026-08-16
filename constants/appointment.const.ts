import { AppointmentStatus, TriagePriority } from '@/types';

export const APPOINTMENT_STATUSES = {
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked-in',
  IN_CONSULTATION: 'in-consultation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show',
} as const satisfies Record<string, AppointmentStatus>;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  'checked-in': 'Checked in',
  'in-consultation': 'In consultation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No show',
};

/**
 * The statuses that still occupy their slot.
 *
 * A cancelled or no-show appointment releases the time it held, so somebody else can book
 * it — which is why the double-booking index is partial over exactly this set rather than a
 * plain unique index that would keep a cancelled slot reserved forever.
 */
export const SLOT_HOLDING_STATUSES = [
  APPOINTMENT_STATUSES.REQUESTED,
  APPOINTMENT_STATUSES.CONFIRMED,
  APPOINTMENT_STATUSES.CHECKED_IN,
  APPOINTMENT_STATUSES.IN_CONSULTATION,
  APPOINTMENT_STATUSES.COMPLETED,
] as const satisfies readonly AppointmentStatus[];

export const TRIAGE_PRIORITIES = {
  ROUTINE: 'routine',
  URGENT: 'urgent',
  EMERGENCY: 'emergency',
} as const satisfies Record<string, TriagePriority>;

export const TRIAGE_PRIORITY_LABELS: Record<TriagePriority, string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  emergency: 'Emergency',
};

/**
 * Queue order, most urgent first. The queue sorts on this and then on token number, so an
 * emergency jumps the line and everyone else keeps the order they arrived in.
 */
export const TRIAGE_PRIORITY_ORDER: Record<TriagePriority, number> = {
  emergency: 0,
  urgent: 1,
  routine: 2,
};

export const APPOINTMENT_FIELD_LIMITS = {
  REASON: 500,
  CANCELLED_REASON: 300,
} as const;
