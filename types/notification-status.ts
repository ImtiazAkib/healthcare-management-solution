/**
 * Where a notification is in its life: written `pending`, then `sent` on delivery or `failed` with a
 * reason on refusal. It is a record first and a message second, so a failed dispatch leaves a row
 * rather than nothing.
 */
export type NotificationStatus = 'pending' | 'sent' | 'failed';
