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
  The patient portal is feature digit 9 — its own band because it is a self-service surface, not a
  staff feature. It stays deliberately small: the portal's reads borrow the owning features' codes
  (an appointment read raises an appointment code, a report read a diagnostics one), so the only
  genuinely portal-specific failures are that the signed-in account has no patient record, and that
  a read the portal aggregates could not complete.
*/

/**
 * Database layer errors for the Patient portal (19000-19099).
 */
export const PORTAL_DATABASE = {
  OVERVIEW_FAILED: createErrorDefinition(19000, 'Failed to load your dashboard.'),
  LIST_FAILED: createErrorDefinition(19001, 'Failed to load your records.'),
} as const;

/**
 * Validation layer errors for the Patient portal (29000-29099).
 */
export const PORTAL_VALIDATION = {
  // The signed-in account is a patient by role but has no clinical record yet — nothing to show.
  PATIENT_PROFILE_NOT_FOUND: createErrorDefinition(29000, 'Your patient record is not set up yet.'),
} as const;
