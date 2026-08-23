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
  Encounters are the clinical band (feature digit 4). Prescriptions share the digit and take the
  x41xx block; encounters hold x40xx.
*/

/**
 * Database layer errors for Encounters (14000-14099).
 */
export const ENCOUNTERS_DATABASE = {
  LIST_FAILED: createErrorDefinition(14000, 'Failed to read the clinical record.'),
  FIND_BY_ID_FAILED: createErrorDefinition(14001, 'Failed to read the encounter.'),
  CREATE_FAILED: createErrorDefinition(14002, 'Failed to open the encounter.'),
  UPDATE_FAILED: createErrorDefinition(14003, 'Failed to update the encounter.'),
} as const;

/**
 * Validation layer errors for Encounters (24000-24099).
 */
export const ENCOUNTERS_VALIDATION = {
  ENCOUNTER_NOT_FOUND: createErrorDefinition(24000, 'Encounter not found.'),
  APPOINTMENT_NOT_FOUND: createErrorDefinition(24001, 'That appointment was not found.'),
  PATIENT_NOT_FOUND: createErrorDefinition(24002, 'That patient was not found.'),
  // The signed-in account is a doctor by role but has no professional record to attribute work to.
  NO_DOCTOR_PROFILE: createErrorDefinition(24003, 'Your doctor profile is not set up yet.'),
} as const;

/**
 * Business layer errors for Encounters (34000-34099).
 */
export const ENCOUNTERS_BUSINESS = {
  /*
    Access is by relationship, not by role. A doctor reaches a patient's record only through an
    appointment or encounter that links them — a URL guessed for a stranger's record is refused
    here, in the service, because the screen that hid the link proves nothing about the caller.
  */
  NOT_YOUR_PATIENT: createErrorDefinition(34000, 'You do not have a record with this patient.'),
  NOT_YOUR_ENCOUNTER: createErrorDefinition(34001, 'This encounter belongs to another doctor.'),
  // An encounter opens from a patient who has arrived — a booking not yet checked in has no visit to record.
  APPOINTMENT_NOT_CHECKED_IN: createErrorDefinition(34002, 'The patient must be checked in before an encounter can be opened.'),
  ENCOUNTER_ALREADY_OPEN: createErrorDefinition(34003, 'An encounter is already open for this appointment.'),
  /*
    A completed encounter is a record, and a record that can be silently rewritten is not one. It is
    corrected by a dated addendum, never an overwrite — the edit is refused and the addendum offered.
  */
  ENCOUNTER_LOCKED: createErrorDefinition(34004, 'This encounter is completed. Add a dated addendum instead of editing it.'),
  ENCOUNTER_ALREADY_COMPLETED: createErrorDefinition(34005, 'This encounter is already completed.'),
} as const;
