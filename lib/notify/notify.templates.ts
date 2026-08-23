/*
  The wording of each notification — subject and body, and nothing clinical in either.

  This is the line that keeps a released result from naming the result: an email is not a private
  channel and an SMS certainly is not, so every message here says what happened and to sign in, never
  what was found. The record it points at is opened behind a session, not copied into a message.
*/

export type NotificationContent = { subject: string; body: string };

/**
 * An appointment was booked.
 *
 * @param whenLabel - A human-readable date and time.
 *
 * @returns The subject and body.
 */
export function appointmentConfirmedContent(whenLabel: string): NotificationContent {
  return { subject: 'Appointment confirmed', body: `Your appointment is booked for ${whenLabel}. Sign in to see the details.` };
}

/**
 * An appointment is coming up.
 *
 * @param whenLabel - A human-readable date and time.
 *
 * @returns The subject and body.
 */
export function appointmentReminderContent(whenLabel: string): NotificationContent {
  return { subject: 'Appointment reminder', body: `A reminder of your appointment on ${whenLabel}. Sign in to see the details.` };
}

/**
 * An appointment was cancelled.
 *
 * @param whenLabel - A human-readable date and time.
 *
 * @returns The subject and body.
 */
export function appointmentCancelledContent(whenLabel: string): NotificationContent {
  return { subject: 'Appointment cancelled', body: `Your appointment on ${whenLabel} has been cancelled. Sign in for details.` };
}

/**
 * A result was released — deliberately without naming it.
 *
 * @returns The subject and body.
 */
export function resultReleasedContent(): NotificationContent {
  return { subject: 'A result is ready', body: 'A new result is ready. Sign in to view it.' };
}

/**
 * A follow-up is due.
 *
 * @returns The subject and body.
 */
export function followUpDueContent(): NotificationContent {
  return { subject: 'Follow-up due', body: 'A follow-up is due. Sign in to book it.' };
}

/**
 * An emergency notice was published — its title only, which is not clinical.
 *
 * @param title - The notice title.
 *
 * @returns The subject and body.
 */
export function emergencyNoticeContent(title: string): NotificationContent {
  return { subject: `Emergency: ${title}`, body: `${title}. Sign in for details.` };
}
