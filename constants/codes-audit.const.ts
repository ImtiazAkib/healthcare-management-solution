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
  Audit is feature digit 8, which was reserved for it and unused until now. It takes the base band —
  18xxx database, 28xxx validation — because there is only one thing here: an access trail.
*/

/**
 * Database layer errors for Audit (18000-18099).
 */
export const AUDIT_DATABASE = {
  LIST_FAILED: createErrorDefinition(18000, 'Failed to load the access trail.'),
} as const;

/**
 * Validation layer errors for Audit (28000-28099).
 */
export const AUDIT_VALIDATION = {
  // A placeholder kept so the feature owns a validation band; the trail is read-only and refuses little.
  INVALID_FILTER: createErrorDefinition(28000, 'That filter is not valid.'),
} as const;
