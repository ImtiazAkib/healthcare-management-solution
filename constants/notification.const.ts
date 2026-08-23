import { NotificationChannel, NotificationKind, NotificationStatus } from '@/types';

/**
 * How a notification is delivered.
 *
 * - `in-app` — the row itself is the delivery; the bell reads it, so this channel is free and never
 *   fails.
 * - `email` — reuses the mail transport from self-registration.
 * - `sms` — behind the same interface, shipping with a logging implementation until a provider is
 *   supplied.
 */
export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in-app',
  EMAIL: 'email',
  SMS: 'sms',
} as const satisfies Record<string, NotificationChannel>;

/**
 * What a notification is about. No clinical detail rides in any of these — "your result is ready,
 * sign in to view it", never the result.
 */
export const NOTIFICATION_KINDS = {
  APPOINTMENT_CONFIRMED: 'appointment-confirmed',
  APPOINTMENT_REMINDER: 'appointment-reminder',
  APPOINTMENT_CANCELLED: 'appointment-cancelled',
  RESULT_RELEASED: 'result-released',
  FOLLOW_UP_DUE: 'follow-up-due',
  EMERGENCY_NOTICE: 'emergency-notice',
} as const satisfies Record<string, NotificationKind>;

/**
 * Where a notification is in its life.
 *
 * Every notification is a **record first**: written `pending`, then dispatched. A delivered one
 * becomes `sent`; a refused one becomes `failed` and keeps the reason rather than vanishing. An
 * in-app notification is `sent` the moment it is written.
 */
export const NOTIFICATION_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
} as const satisfies Record<string, NotificationStatus>;

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  'in-app': 'In-app',
  email: 'Email',
  sms: 'SMS',
};

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  'appointment-confirmed': 'Appointment confirmed',
  'appointment-reminder': 'Appointment reminder',
  'appointment-cancelled': 'Appointment cancelled',
  'result-released': 'Result ready',
  'follow-up-due': 'Follow-up due',
  'emergency-notice': 'Emergency notice',
};

/**
 * Reminder policy.
 *
 * The sweep reminds about appointments falling within the next `WINDOW_HOURS`, and writes at most one
 * reminder per appointment — so running the sweep twice sends one message, and missing a run sends it
 * late rather than never.
 */
export const REMINDER = {
  WINDOW_HOURS: 24,
} as const;
