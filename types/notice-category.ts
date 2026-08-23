/**
 * What kind of notice this is.
 *
 * `emergency` is the only one that pins to the top of a dashboard and carries the destructive
 * treatment; `general` and `service` sit in publish order. The category is also what step 18's
 * emergency alerts key off when they fan a notice out as notifications.
 */
export type NoticeCategory = 'general' | 'emergency' | 'service';
