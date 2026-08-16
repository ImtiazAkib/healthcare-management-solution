import { z } from 'zod';

import { objectIdField } from './object-id.schema';
import { patientFields } from './patient-create.schema';

/*
  No `userId` and no `medicalRecordNo`. Both are settled when the record is created: moving
  a clinical record to another account, or re-issuing the number every other document
  references, are not edits — they are data corruption with a form in front of them.
*/
export const PatientUpdateSchema = z.object({
  patientId: objectIdField,
  bloodGroup: patientFields.bloodGroup.optional(),
  allergies: patientFields.clinicalEntries.optional(),
  chronicConditions: patientFields.clinicalEntries.optional(),
  emergencyContact: patientFields.emergencyContact.optional(),
  address: patientFields.address.optional().or(z.literal('')),
});

export type PatientUpdateInput = z.input<typeof PatientUpdateSchema>;
export type PatientUpdateOutput = z.output<typeof PatientUpdateSchema>;
