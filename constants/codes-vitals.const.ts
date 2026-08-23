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
  Vitals and triage are the clinical band (feature digit 4) alongside encounters and prescriptions.
  Encounters hold x40xx, prescriptions x41xx; vitals and triage take x42xx.
*/

/**
 * Database layer errors for Vitals and triage (14200-14299).
 */
export const VITALS_DATABASE = {
  RECORD_FAILED: createErrorDefinition(14200, 'Failed to record the vitals.'),
  TRIAGE_FAILED: createErrorDefinition(14201, 'Failed to set the triage priority.'),
} as const;

/**
 * Validation layer errors for Vitals and triage (24200-24299).
 */
export const VITALS_VALIDATION = {
  APPOINTMENT_NOT_FOUND: createErrorDefinition(24200, 'That appointment was not found.'),
} as const;

/**
 * Business layer errors for Vitals and triage (34200-34299).
 */
export const VITALS_BUSINESS = {
  // Vitals and triage are a check-in reading — a booking not yet arrived has no visit to record them against.
  NOT_CHECKED_IN: createErrorDefinition(34200, 'The patient must be checked in before vitals or triage can be recorded.'),
} as const;
