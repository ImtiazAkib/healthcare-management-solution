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
  An emergency contact left entirely blank is "no contact", not an error: the form renders three
  boxes whether or not anyone fills them, so an all-blank contact becomes `undefined`. A partly
  filled one is refused sub-field by sub-field — half a contact is worse than none.

  Written as a superRefine-then-transform over an object of optional strings rather than a
  `z.preprocess`, so the **input** type stays a real object — `{ name?, relation?, phone? }` —
  and react-hook-form can register `emergencyContact.name` and read `errors.emergencyContact.phone`.
  A `preprocess` would type the input as `unknown` and break both.
*/
export const optionalEmergencyContact = z
  .object({
    name: z.string().trim().max(PATIENT_FIELD_LIMITS.CONTACT_NAME, 'That name is too long.').optional(),
    relation: z.string().trim().max(PATIENT_FIELD_LIMITS.CONTACT_RELATION, 'That is too long.').optional(),
    phone: z.string().trim().optional(),
  })
  .optional()
  .superRefine((contact, ctx) => {
    if (!contact) {
      return;
    }

    const name = contact.name?.trim() ?? '';
    const relation = contact.relation?.trim() ?? '';
    const phone = contact.phone?.trim() ?? '';

    if (!name && !relation && !phone) {
      return;
    }

    if (!name) {
      ctx.addIssue({ code: 'custom', path: ['name'], message: 'Give the contact a name.' });
    }
    if (!relation) {
      ctx.addIssue({ code: 'custom', path: ['relation'], message: 'How are they related?' });
    }
    if (!phone || !BANGLADESH_PHONE_STORED_PATTERN.test(normalizeBangladeshPhone(phone))) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a valid Bangladesh mobile number.' });
    }
  })
  .transform(contact => {
    if (!contact) {
      return undefined;
    }

    const name = contact.name?.trim() ?? '';
    const relation = contact.relation?.trim() ?? '';
    const phone = contact.phone?.trim() ?? '';

    if (!name && !relation && !phone) {
      return undefined;
    }

    return { name, relation, phone: normalizeBangladeshPhone(phone) };
  });

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
  emergencyContact: optionalEmergencyContact,
  address: patientFields.address.optional().or(z.literal('')),
});

export type PatientCreateInput = z.input<typeof PatientCreateSchema>;
export type PatientCreateOutput = z.output<typeof PatientCreateSchema>;
