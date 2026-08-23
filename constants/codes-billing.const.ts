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
  Billing is feature digit 6. The service catalogue already sits in that feature at the x60xx
  sub-band, so invoices take x61xx and payments x62xx — the same hundreds-sub-band split scheduling
  and clinical use within their own digit.
*/

/**
 * Database layer errors for Invoices (16100-16199).
 */
export const INVOICES_DATABASE = {
  CREATE_FAILED: createErrorDefinition(16100, 'Failed to raise the invoice.'),
  LIST_FAILED: createErrorDefinition(16101, 'Failed to list invoices.'),
  READ_FAILED: createErrorDefinition(16102, 'Failed to read the invoice.'),
  UPDATE_FAILED: createErrorDefinition(16103, 'Failed to update the invoice.'),
} as const;

/**
 * Validation layer errors for Invoices (26100-26199).
 */
export const INVOICES_VALIDATION = {
  INVOICE_NOT_FOUND: createErrorDefinition(26100, 'Invoice not found.'),
  PATIENT_NOT_FOUND: createErrorDefinition(26101, 'That patient was not found.'),
  ENCOUNTER_NOT_FOUND: createErrorDefinition(26102, 'That encounter was not found.'),
  ENCOUNTER_PATIENT_MISMATCH: createErrorDefinition(26103, 'That encounter belongs to a different patient.'),
  NO_LINES: createErrorDefinition(26104, 'Add at least one line to the invoice.'),
  SERVICE_ITEM_NOT_FOUND: createErrorDefinition(26105, 'A service on the invoice was not found.'),
  SERVICE_ITEM_INACTIVE: createErrorDefinition(26106, 'A service on the invoice is no longer offered.'),
  // The server prices every line; a discount cannot exceed what the lines add up to.
  DISCOUNT_TOO_LARGE: createErrorDefinition(26107, 'The discount cannot be more than the subtotal.'),
  VOID_REASON_REQUIRED: createErrorDefinition(26108, 'Give a reason for voiding the invoice.'),
} as const;

/**
 * Business layer errors for Invoices (36100-36199).
 */
export const INVOICES_BUSINESS = {
  ALREADY_VOID: createErrorDefinition(36100, 'This invoice has already been voided.'),
} as const;

/**
 * Database layer errors for Payments (16200-16299).
 */
export const PAYMENTS_DATABASE = {
  CREATE_FAILED: createErrorDefinition(16200, 'Failed to record the payment.'),
  LIST_FAILED: createErrorDefinition(16201, 'Failed to list payments.'),
} as const;

/**
 * Validation layer errors for Payments (26200-26299).
 */
export const PAYMENTS_VALIDATION = {
  INVALID_AMOUNT: createErrorDefinition(26200, 'Enter a payment amount greater than zero.'),
  // A refund is not a negative payment — overpayment is refused rather than silently accepted.
  EXCEEDS_BALANCE: createErrorDefinition(26201, 'The payment is more than the outstanding balance.'),
} as const;

/**
 * Business layer errors for Payments (36200-36299).
 */
export const PAYMENTS_BUSINESS = {
  INVOICE_VOID: createErrorDefinition(36200, 'A voided invoice cannot take a payment.'),
  INVOICE_ALREADY_PAID: createErrorDefinition(36201, 'This invoice is already paid in full.'),
  GATEWAY_REFUSED: createErrorDefinition(36202, 'The payment could not be recorded. Try again.'),
} as const;
