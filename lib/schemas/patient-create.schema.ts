import { z } from 'zod';

import { BLOOD_GROUPS, PATIENT_FIELD_LIMITS } from '@/constants/patient.const';
import { BANGLADESH_PHONE_STORED_PATTERN } from '@/constants/users.const';

import { normalizeBangladeshPhone } from '@/lib/utils';

import { objectIdField } from './object-id.schema';

/*
  A clinical entry — one allergy, one condition — as somebody writes it. Free text, bounded,
  and trimmed. No coded vocabulary: see the plan's backlog on ICD-10. A labelled free-text
  field is honest; a half-built coding standard is not.
*/
const clinicalEntry = z
  .string()
  .trim()
  .min(1, 'Leave the box empty rather than blank.')
  .max(PATIENT_FIELD_LIMITS.CLINICAL_ENTRY, 'That entry is too long.');

export const patientFields = {
  bloodGroup: z.enum(BLOOD_GROUPS, 'Choose a valid blood group.'),

  /*
    Blank rows are dropped rather than refused: these come from a repeatable field where an
    untouched row is the normal state, not a mistake worth an error message.
  */
  clinicalEntries: z
    .array(z.string())
    .transform(values => values.map(value => value.trim()).filter(value => value !== ''))
    .pipe(z.array(clinicalEntry).max(PATIENT_FIELD_LIMITS.CLINICAL_ENTRIES, 'That is more entries than a record should hold.')),

  address: z.string().trim().max(PATIENT_FIELD_LIMITS.ADDRESS, 'Address is too long.'),

  emergencyContact: z.object({
    name: z.string().trim().min(1, 'Give the contact a name.').max(PATIENT_FIELD_LIMITS.CONTACT_NAME, 'That name is too long.'),
    relation: z.string().trim().min(1, 'How are they related?').max(PATIENT_FIELD_LIMITS.CONTACT_RELATION, 'That is too long.'),
    phone: z
      .string()
      .trim()
      .transform(value => normalizeBangladeshPhone(value))
      .refine(value => BANGLADESH_PHONE_STORED_PATTERN.test(value), 'Enter a valid Bangladesh mobile number.'),
  }),
};

/*
  The account comes first and the clinical record hangs off it, so this takes a `userId`
  rather than the name and email — those belong to the account and are validated by
  `UserCreateSchema`. Step 7 calls both in one flow.

  There is no `medicalRecordNo` field. It is issued by the application, never supplied by a
  caller; accepting one here would let a request pick its own.
*/
export const PatientCreateSchema = z.object({
  userId: objectIdField,
  bloodGroup: patientFields.bloodGroup.optional(),
  allergies: patientFields.clinicalEntries.optional(),
  chronicConditions: patientFields.clinicalEntries.optional(),
  emergencyContact: patientFields.emergencyContact.optional(),
  address: patientFields.address.optional().or(z.literal('')),
});

export type PatientCreateInput = z.input<typeof PatientCreateSchema>;
export type PatientCreateOutput = z.output<typeof PatientCreateSchema>;
