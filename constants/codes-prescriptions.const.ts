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
  Prescriptions are the clinical band (feature digit 4) alongside encounters. Encounters hold the
  x40xx block; prescriptions take x41xx.
*/

/**
 * Database layer errors for Prescriptions (14100-14199).
 */
export const PRESCRIPTIONS_DATABASE = {
  LIST_FAILED: createErrorDefinition(14100, 'Failed to read the prescriptions.'),
  FIND_BY_ID_FAILED: createErrorDefinition(14101, 'Failed to read the prescription.'),
  CREATE_FAILED: createErrorDefinition(14102, 'Failed to issue the prescription.'),
  UPDATE_FAILED: createErrorDefinition(14103, 'Failed to update the prescription.'),
} as const;

/**
 * Validation layer errors for Prescriptions (24100-24199).
 */
export const PRESCRIPTIONS_VALIDATION = {
  PRESCRIPTION_NOT_FOUND: createErrorDefinition(24100, 'Prescription not found.'),
  ENCOUNTER_NOT_FOUND: createErrorDefinition(24101, 'That encounter was not found.'),
  // The signed-in account is a doctor by role but has no professional record to prescribe under.
  NO_DOCTOR_PROFILE: createErrorDefinition(24102, 'Your doctor profile is not set up yet.'),
} as const;

/**
 * Business layer errors for Prescriptions (34100-34199).
 */
export const PRESCRIPTIONS_BUSINESS = {
  // A prescription is written into a doctor's own encounter — never against another doctor's record.
  NOT_YOUR_ENCOUNTER: createErrorDefinition(34100, 'This encounter belongs to another doctor.'),
  /*
    A prescription is issued during the visit, so it hangs off an open encounter. Once the encounter
    is completed the consultation is closed, and a correction is a new encounter, not a late script.
  */
  ENCOUNTER_NOT_OPEN: createErrorDefinition(34101, 'The encounter must be open to issue or replace a prescription.'),
  /*
    Immutable once issued: the pharmacy may already have dispensed against it, so a change is a new
    prescription that supersedes this one — never an edit of what was already handed over.
  */
  PRESCRIPTION_IMMUTABLE: createErrorDefinition(34102, 'A prescription cannot be edited once issued. Replace it with a new one instead.'),
  // Replacing a prescription that a later one already replaced would fork the chain — replace the current one.
  PRESCRIPTION_ALREADY_SUPERSEDED: createErrorDefinition(34103, 'This prescription has already been replaced.'),
} as const;
