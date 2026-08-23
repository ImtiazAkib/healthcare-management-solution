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
  Self-registration is a sub-feature of Users (feature digit 1), so it takes the x1x sub-band the way
  scheduling and clinical split theirs: registration errors are 111xx / 211xx, leaving the base 210xx
  band to the user codes. It reuses the existing user codes where one already fits — an already-used
  email, a password mismatch — and adds only what verifying a link needs.
*/

/**
 * Database layer errors for Registration (11100-11199).
 */
export const REGISTRATION_DATABASE = {
  CREATE_FAILED: createErrorDefinition(11100, 'Failed to register the account.'),
  UPDATE_FAILED: createErrorDefinition(11101, 'Failed to update the account.'),
} as const;

/**
 * Validation layer errors for Registration (21100-21199).
 */
export const REGISTRATION_VALIDATION = {
  // The one message a bad, used, or already-followed link gets — to the person holding it, that is what it is.
  VERIFICATION_LINK_INVALID: createErrorDefinition(21100, 'This link is invalid. Request a new one.'),
  VERIFICATION_LINK_EXPIRED: createErrorDefinition(21101, 'This link has expired. Request a new one.'),
} as const;
