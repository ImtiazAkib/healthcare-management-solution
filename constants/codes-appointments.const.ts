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
  Appointments are scheduling (feature digit 3), shared with departments (x30xx) and
  availability (x31xx). Appointments take x32xx — one digit, non-overlapping sequences.
*/

/**
 * Database layer errors for Appointments (13200-13299).
 */
export const APPOINTMENTS_DATABASE = {
  LIST_FAILED: createErrorDefinition(13200, 'Failed to list appointments.'),
  FIND_BY_ID_FAILED: createErrorDefinition(13201, 'Failed to read the appointment.'),
  CREATE_FAILED: createErrorDefinition(13202, 'Failed to book the appointment.'),
  UPDATE_FAILED: createErrorDefinition(13203, 'Failed to update the appointment.'),
} as const;

/**
 * Validation layer errors for Appointments (23200-23299).
 */
export const APPOINTMENTS_VALIDATION = {
  APPOINTMENT_NOT_FOUND: createErrorDefinition(23200, 'Appointment not found.'),
  PATIENT_NOT_FOUND: createErrorDefinition(23201, 'That patient was not found.'),
  DOCTOR_NOT_FOUND: createErrorDefinition(23202, 'That doctor was not found.'),
} as const;

/**
 * Business layer errors for Appointments (33200-33299).
 */
export const APPOINTMENTS_BUSINESS = {
  /*
    The two ways a slot is not bookable, kept apart because they mean different things to the
    person at the counter. The first is "that time is not on offer or was already taken when you
    looked"; the second is the race — the slot was free a moment ago and the database, not a
    check, refused the second writer.
  */
  SLOT_NOT_AVAILABLE: createErrorDefinition(33200, "That slot is not in the doctor's published hours, or is already booked."),
  SLOT_JUST_TAKEN: createErrorDefinition(33201, 'That slot was just taken. Please pick another time.'),
  ILLEGAL_STATUS_TRANSITION: createErrorDefinition(33202, 'That is not a valid next step for this appointment.'),
  CANNOT_CANCEL_AFTER_CHECK_IN: createErrorDefinition(33203, 'A patient who has checked in cannot have the appointment cancelled.'),
  NO_SHOW_BEFORE_SLOT_PASSED: createErrorDefinition(33204, 'An appointment can be marked a no-show only after its time has passed.'),
} as const;
