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
  Notices are a Communication feature (feature digit 7), which was allocated up front and unused
  until now. Notices take the x0x sub-band — 170xx / 270xx — leaving x1x to notifications, the way
  diagnostics splits orders from reports within its own digit.
*/

/**
 * Database layer errors for Notices (17000-17099).
 */
export const NOTICES_DATABASE = {
  LIST_FAILED: createErrorDefinition(17000, 'Failed to list notices.'),
  READ_FAILED: createErrorDefinition(17001, 'Failed to read the notice.'),
  CREATE_FAILED: createErrorDefinition(17002, 'Failed to publish the notice.'),
  UPDATE_FAILED: createErrorDefinition(17003, 'Failed to update the notice.'),
  DELETE_FAILED: createErrorDefinition(17004, 'Failed to delete the notice.'),
} as const;

/**
 * Validation layer errors for Notices (27000-27099).
 */
export const NOTICES_VALIDATION = {
  NOTICE_NOT_FOUND: createErrorDefinition(27000, 'Notice not found.'),
  TITLE_REQUIRED: createErrorDefinition(27001, 'A title is required.'),
  TITLE_TOO_LONG: createErrorDefinition(27002, 'The title is too long.'),
  BODY_TOO_LONG: createErrorDefinition(27003, 'The message is too long.'),
  AUDIENCE_INVALID: createErrorDefinition(27004, 'Choose who the notice is for.'),
  CATEGORY_INVALID: createErrorDefinition(27005, 'Choose a valid category.'),
  // A department-targeted notice must name the department it targets.
  DEPARTMENT_REQUIRED: createErrorDefinition(27006, 'Choose the department this notice is for.'),
  DEPARTMENT_NOT_FOUND: createErrorDefinition(27007, 'That department was not found.'),
  IMAGE_TYPE_NOT_ALLOWED: createErrorDefinition(27008, 'Attach a PNG, JPEG or WebP image.'),
  IMAGE_TOO_LARGE: createErrorDefinition(27009, 'The image is too large.'),
  // A notice is not clinical: a title or message carrying a medical record number is refused.
  BODY_CONTAINS_MRN: createErrorDefinition(27010, 'Remove the medical record number — a notice must not carry patient identity.'),
} as const;
