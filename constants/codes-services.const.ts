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
 * Database layer errors for Services (16000-16999).
 */
export const SERVICES_DATABASE = {
  LIST_FAILED: createErrorDefinition(16000, 'Failed to list services.'),
  FIND_BY_ID_FAILED: createErrorDefinition(16001, 'Failed to read the service.'),
  CREATE_FAILED: createErrorDefinition(16002, 'Failed to create the service.'),
  UPDATE_FAILED: createErrorDefinition(16003, 'Failed to update the service.'),
  DELETE_FAILED: createErrorDefinition(16004, 'Failed to delete the service.'),
} as const;

/**
 * Validation layer errors for Services (26000-26999).
 *
 * As with departments, the field-shape messages (a name too long, a code that breaks the
 * pattern, a price that is not a number) live in the schema as plain strings. The service
 * raises only the two clashes and the missing row.
 */
export const SERVICES_VALIDATION = {
  SERVICE_NOT_FOUND: createErrorDefinition(26000, 'Service not found.'),
  NAME_ALREADY_USED: createErrorDefinition(26001, 'A service with that name already exists.'),
  CODE_ALREADY_USED: createErrorDefinition(26002, 'A service with that code already exists.'),
} as const;

/**
 * Business layer errors for Services (36000-36999).
 */
export const SERVICES_BUSINESS = {
  /*
    A priced service that has appeared on an invoice is history. Deactivate it so the catalogue
    stops offering it, while past invoices keep rendering the line they billed.
  */
  CANNOT_DELETE_REFERENCED: createErrorDefinition(36000, 'This service is in use and cannot be deleted. Deactivate it instead.'),
} as const;
