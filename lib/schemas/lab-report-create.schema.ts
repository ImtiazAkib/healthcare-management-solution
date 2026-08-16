import { z } from 'zod';

import { labFields } from './lab-order-create.schema';
import { objectIdField } from './object-id.schema';

/*
  The written half of a report. **The file is not here**: bytes go through a route handler
  with its own limits and its own magic-number check, never through a Server Action, so this
  schema validates what somebody typed and nothing about what they uploaded.
*/
export const LabReportCreateSchema = z.object({
  labOrderId: objectIdField,
  summary: labFields.summary.optional().or(z.literal('')),
  findings: labFields.findings.optional().or(z.literal('')),
});

export type LabReportCreateInput = z.input<typeof LabReportCreateSchema>;
export type LabReportCreateOutput = z.output<typeof LabReportCreateSchema>;

/**
 * Releasing a report to the doctor and the patient.
 *
 * Its own schema, and deliberately not a boolean on the update: releasing is the act the
 * whole diagnostics module is careful about, and it should be impossible to do by accident
 * while editing a summary. The verifier is taken from the session, never from the caller.
 */
export const LabReportReleaseSchema = z.object({
  labReportId: objectIdField,
});

export type LabReportReleaseInput = z.input<typeof LabReportReleaseSchema>;
export type LabReportReleaseOutput = z.output<typeof LabReportReleaseSchema>;
