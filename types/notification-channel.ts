/**
 * How a notification is delivered.
 *
 * `in-app` is the row the bell reads and never fails; `email` and `sms` sit behind a common channel
 * interface, so a real SMS provider is one file away from the logging one that ships.
 */
export type NotificationChannel = 'in-app' | 'email' | 'sms';
