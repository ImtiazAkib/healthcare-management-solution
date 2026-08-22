import { z } from 'zod';

import { objectIdField } from './object-id.schema';
import { optionalEmergencyContact, patientFields } from './patient-create.schema';

/*
  No `userId` and no `medicalRecordNo`. Both are settled when the record is created: moving
  a clinical record to another account, or re-issuing the number every other document
  references, are not edits — they are data corruption with a form in front of them.
*/
export const PatientUpdateSchema = z.object({
  patientId: objectIdField,
  // An empty-string "unknown" option maps to undefined, so the optional enum accepts "none". A
  // transform keeps the input a real string union (a preprocess would make it `unknown`).
  bloodGroup: patientFields.bloodGroup
    .optional()
    .or(z.literal(''))
    .transform(value => (value === '' ? undefined : value)),
  allergies: patientFields.clinicalEntries.optional(),
  chronicConditions: patientFields.clinicalEntries.optional(),
  emergencyContact: optionalEmergencyContact,
  address: patientFields.address.optional().or(z.literal('')),
});

export type PatientUpdateInput = z.input<typeof PatientUpdateSchema>;
export type PatientUpdateOutput = z.output<typeof PatientUpdateSchema>;
