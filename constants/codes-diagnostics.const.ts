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
  Diagnostics is feature digit 5. Lab orders take the x50xx block, lab reports x51xx — the order is
  raised first and the report hangs off it, so they read in that order.
*/

/**
 * Database layer errors for Diagnostics (15000-15199).
 */
export const DIAGNOSTICS_DATABASE = {
  // Lab orders — 150xx.
  LAB_ORDER_LIST_FAILED: createErrorDefinition(15000, 'Failed to read the lab orders.'),
  LAB_ORDER_FIND_FAILED: createErrorDefinition(15001, 'Failed to read the lab order.'),
  LAB_ORDER_CREATE_FAILED: createErrorDefinition(15002, 'Failed to place the lab order.'),
  LAB_ORDER_UPDATE_FAILED: createErrorDefinition(15003, 'Failed to update the lab order.'),
  // Lab reports — 151xx.
  LAB_REPORT_LIST_FAILED: createErrorDefinition(15100, 'Failed to read the lab reports.'),
  LAB_REPORT_FIND_FAILED: createErrorDefinition(15101, 'Failed to read the lab report.'),
  LAB_REPORT_CREATE_FAILED: createErrorDefinition(15102, 'Failed to save the lab report.'),
  LAB_REPORT_UPDATE_FAILED: createErrorDefinition(15103, 'Failed to update the lab report.'),
  LAB_REPORT_READ_FAILED: createErrorDefinition(15104, 'Failed to open the report file.'),
} as const;

/**
 * Validation layer errors for Diagnostics (25000-25199).
 */
export const DIAGNOSTICS_VALIDATION = {
  // Lab orders — 250xx.
  LAB_ORDER_NOT_FOUND: createErrorDefinition(25000, 'Lab order not found.'),
  ENCOUNTER_NOT_FOUND: createErrorDefinition(25001, 'That encounter was not found.'),
  // The signed-in account is a doctor by role but has no professional record to order under.
  NO_DOCTOR_PROFILE: createErrorDefinition(25002, 'Your doctor profile is not set up yet.'),
  // Lab reports — 251xx.
  LAB_REPORT_NOT_FOUND: createErrorDefinition(25100, 'Lab report not found.'),
  FILE_REQUIRED: createErrorDefinition(25101, 'Attach the report file.'),
  FILE_TYPE_NOT_ALLOWED: createErrorDefinition(25102, 'That file type is not allowed. Upload a PDF or an image.'),
  FILE_TOO_LARGE: createErrorDefinition(25103, 'That file is too large.'),
} as const;

/**
 * Business layer errors for Diagnostics (35000-35199).
 */
export const DIAGNOSTICS_BUSINESS = {
  // Lab orders — 350xx.
  // A lab order is raised into a doctor's own open encounter — never against another doctor's record.
  NOT_YOUR_ENCOUNTER: createErrorDefinition(35000, 'This encounter belongs to another doctor.'),
  // An order is raised during the visit, so it hangs off an open encounter.
  ENCOUNTER_NOT_OPEN: createErrorDefinition(35001, 'The encounter must be open to order lab work.'),
  // Which move follows which is the lab lifecycle's to say — a jump it does not allow is refused here.
  INVALID_STATUS_TRANSITION: createErrorDefinition(35002, 'That is not a move this order can make from where it is.'),
  // Lab reports — 351xx.
  // One report per order — a second upload against an order already reported is refused.
  ALREADY_REPORTED: createErrorDefinition(35100, 'A report has already been filed for this order.'),
  /*
    Released is not the same as uploaded. A report reaches the doctor and patient only when it has a
    file and has been released after verification — releasing one that is not ready, or is already
    released, is refused.
  */
  REPORT_NOT_READY_TO_RELEASE: createErrorDefinition(35101, 'This report is not ready to be released.'),
  ALREADY_RELEASED: createErrorDefinition(35102, 'This report has already been released.'),
} as const;
