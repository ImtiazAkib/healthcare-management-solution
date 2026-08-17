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
 * Database layer errors for Departments (13000-13999).
 */
export const DEPARTMENTS_DATABASE = {
  LIST_FAILED: createErrorDefinition(13000, 'Failed to list departments.'),
  FIND_BY_ID_FAILED: createErrorDefinition(13001, 'Failed to read the department.'),
  CREATE_FAILED: createErrorDefinition(13002, 'Failed to create the department.'),
  UPDATE_FAILED: createErrorDefinition(13003, 'Failed to update the department.'),
  DELETE_FAILED: createErrorDefinition(13004, 'Failed to delete the department.'),
} as const;

/**
 * Validation layer errors for Departments (23000-23999).
 *
 * The field-shape messages (a name that is required or too long, a code that breaks the
 * pattern) stay in the schema as plain strings: they decode to code 0 and still render. Only
 * the refusals the service itself raises — a clash, a missing row, an unfit head — carry codes.
 */
export const DEPARTMENTS_VALIDATION = {
  DEPARTMENT_NOT_FOUND: createErrorDefinition(23000, 'Department not found.'),
  NAME_ALREADY_USED: createErrorDefinition(23001, 'A department with that name already exists.'),
  CODE_ALREADY_USED: createErrorDefinition(23002, 'A department with that code already exists.'),
  /*
    headDoctor refs a Doctor, not a User: the head of cardiology is a doctor in that capacity.
    A named head must resolve to a real doctor whose account is active — a department led by a
    deactivated record is a dead name on every prescription that prints it.
  */
  HEAD_DOCTOR_NOT_FOUND: createErrorDefinition(23003, 'That doctor was not found.'),
  HEAD_DOCTOR_NOT_ACTIVE: createErrorDefinition(23004, 'The head of a department must be an active doctor.'),
} as const;

/**
 * Business layer errors for Departments (33000-33999).
 */
export const DEPARTMENTS_BUSINESS = {
  /*
    Deactivate rather than delete. Doctors sit in this department and past appointments name
    it; both must keep rendering, so a department anything still references cannot be removed.
  */
  CANNOT_DELETE_REFERENCED: createErrorDefinition(33000, 'This department is in use and cannot be deleted. Deactivate it instead.'),
} as const;
