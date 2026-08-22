/**
 * Helper function to create error definition.
 *
 * @param code - Error code.
 * @param message - Error message.
 *
 * @returns Error definition object.
 */
const createErrorDefinition = (code: number, message: string) => ({ CODE: code, MESSAGE: message }) as const;

/**
 * Database layer errors for Patients (12000-12999).
 */
export const PATIENTS_DATABASE = {
  LIST_FAILED: createErrorDefinition(12000, 'Failed to list patients.'),
  FIND_BY_ID_FAILED: createErrorDefinition(12001, 'Failed to read the patient.'),
  CREATE_FAILED: createErrorDefinition(12002, 'Failed to register the patient.'),
  UPDATE_FAILED: createErrorDefinition(12003, 'Failed to update the patient.'),
} as const;

/**
 * Validation layer errors for Patients (22000-22999).
 *
 * The demographic and clinical field-shape messages ride in the schema (they carry the shared
 * user codes, or plain patient messages); the service raises only the missing row and the one
 * clash a registration can hit.
 */
export const PATIENTS_VALIDATION = {
  PATIENT_NOT_FOUND: createErrorDefinition(22000, 'Patient not found.'),
  EMAIL_ALREADY_USED: createErrorDefinition(22001, 'An account already exists for that email address.'),
} as const;
