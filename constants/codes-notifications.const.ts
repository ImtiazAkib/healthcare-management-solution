/**
 * Helper function to create error definition.
 *
 * @param code - Error code.
 * @param message - Error message.
 *
 * @returns Error definition object.
 */
const createErrorDefinition = (code: number, message: string) => ({ CODE: code, MESSAGE: message }) as const;

/*
  Notifications share the Communication feature digit (7) with notices, taking the x1x sub-band —
  171xx / 271xx — the way diagnostics splits reports from orders within its own digit.
*/

/**
 * Database layer errors for Notifications (17100-17199).
 */
export const NOTIFICATIONS_DATABASE = {
  CREATE_FAILED: createErrorDefinition(17100, 'Failed to record the notification.'),
  LIST_FAILED: createErrorDefinition(17101, 'Failed to list notifications.'),
  UPDATE_FAILED: createErrorDefinition(17102, 'Failed to update the notification.'),
} as const;

/**
 * Validation layer errors for Notifications (27100-27199).
 */
export const NOTIFICATIONS_VALIDATION = {
  NOTIFICATION_NOT_FOUND: createErrorDefinition(27100, 'Notification not found.'),
  // Kept as the recorded reason on a failed row when the recipient has no address for the channel.
  RECIPIENT_UNREACHABLE: createErrorDefinition(27101, 'The recipient has no address for this channel.'),
} as const;
