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
  Availability is scheduling (feature digit 3), which it shares with departments. Departments
  hold the low block (x30xx); availability takes x31xx, and step 9's appointments continue from
  x32xx — one digit, three non-overlapping sequences.
*/

/**
 * Database layer errors for Availability (13100-13199).
 */
export const AVAILABILITY_DATABASE = {
  LIST_FAILED: createErrorDefinition(13100, 'Failed to list availability.'),
  FIND_BY_ID_FAILED: createErrorDefinition(13101, 'Failed to read the availability block.'),
  CREATE_FAILED: createErrorDefinition(13102, 'Failed to publish the availability block.'),
  UPDATE_FAILED: createErrorDefinition(13103, 'Failed to update the availability block.'),
  DELETE_FAILED: createErrorDefinition(13104, 'Failed to delete the availability block.'),
} as const;

/**
 * Validation layer errors for Availability (23100-23199).
 *
 * The field-shape messages (a bad time, an end before a start) ride in the schema; the service
 * raises the missing row and the doctor that does not resolve.
 */
export const AVAILABILITY_VALIDATION = {
  AVAILABILITY_NOT_FOUND: createErrorDefinition(23100, 'Availability block not found.'),
  DOCTOR_NOT_FOUND: createErrorDefinition(23101, 'That doctor was not found.'),
} as const;

/**
 * Business layer errors for Availability (33100-33199).
 *
 * Both clashes carry a default sentence, but the service overrides the message with the block it
 * collided with — the day and hours, and for a room the doctor already in it — so the refusal
 * names what it hit rather than stating a rule.
 */
export const AVAILABILITY_BUSINESS = {
  DOCTOR_BUSY: createErrorDefinition(33100, 'This doctor already sits at an overlapping time.'),
  ROOM_BUSY: createErrorDefinition(33101, 'That room is already taken at an overlapping time.'),
} as const;
