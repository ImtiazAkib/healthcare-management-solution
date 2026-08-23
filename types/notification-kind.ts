/**
 * What a notification is about. None of these carries clinical detail — a released result says a
 * result is ready and to sign in, never what the result was.
 */
export type NotificationKind =
  'appointment-confirmed' | 'appointment-reminder' | 'appointment-cancelled' | 'result-released' | 'follow-up-due' | 'emergency-notice';
