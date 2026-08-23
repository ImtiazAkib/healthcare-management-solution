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
  Editing your own account is a Users concern, so it takes the x2x sub-band under feature digit 1 the
  way registration took x1x: profile errors are 112xx / 212xx, leaving the base 21xxx band to the user
  codes. It reuses the existing user codes wherever one already fits — a taken email address
  (`EMAIL_ALREADY_USED`), a wrong current password (`CURRENT_PASSWORD_INCORRECT`), an account that is
  not there (`USER_NOT_FOUND`) — and adds only what confirming an email change needs.
*/

/**
 * Database layer errors for Profiles (11200-11299).
 */
export const PROFILE_DATABASE = {
  LOAD_FAILED: createErrorDefinition(11200, 'Failed to load your profile.'),
  UPDATE_FAILED: createErrorDefinition(11201, 'Failed to save your changes.'),
} as const;

/**
 * Validation layer errors for Profiles (21200-21299).
 */
export const PROFILE_VALIDATION = {
  // The one message a bad, used, or already-followed email-change link gets — to the person holding it, that is what it is.
  EMAIL_CHANGE_LINK_INVALID: createErrorDefinition(21200, 'This link is invalid. Request the change again.'),
  EMAIL_CHANGE_LINK_EXPIRED: createErrorDefinition(21201, 'This link has expired. Request the change again.'),
  // Emergency contact and address live on the patient record; a staff account has none to edit.
  PATIENT_RECORD_NOT_FOUND: createErrorDefinition(21202, 'No patient record is attached to this account.'),
} as const;
