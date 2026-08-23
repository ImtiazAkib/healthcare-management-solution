/**
 * The lab order as every list in this feature reads it — the order with the patient's identity and
 * the report behind it attached, so a row needs no second query. Re-exported under the feature so
 * its components share one name for the shape rather than each reaching into the service layer.
 */
export type { LabOrderRow } from '@/lib/services';

/**
 * The underlying records, as the forms and rows read them.
 */
export type { LabOrderDto, LabReportDto, LabStatus, LabPriority } from '@/types';

/**
 * One ordered test as the repeatable field edits it: both parts are plain strings so an empty row is
 * a valid in-progress state and a controlled input always has a value. The schema validates the rows
 * on submit — an empty code is allowed, an empty name is not.
 */
export type LabTestRow = {
  name: string;
  code: string;
};
