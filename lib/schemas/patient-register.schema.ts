import { z } from 'zod';

import { optionalEmergencyContact, patientFields } from './patient-create.schema';
import { userFields } from './user-fields.schema';

/*
  Registration at the counter, in one form: the demographics that make the account and the
  clinical details that make the record. It composes the demographic half of `userFields` — but
  **not** `password`, and **not** `role`. A patient registered here has no password until they
  claim the account in step 15, and the role is fixed to `patient` in the service, never read
  from the request, so a hand-built form cannot register an administrator.

  There is no `medicalRecordNo` either: it is minted by the issuer, never supplied.

  Name and email are required (email is what the person later claims the account by proving);
  everything else is optional, because a counter registration takes whoever is at the desk with
  as much as they can give.
*/
export const PatientRegisterSchema = z.object({
  name: userFields.name,
  email: userFields.email,
  phone: userFields.phone.optional().or(z.literal('')),
  // The "not recorded" / "unknown" option a Select carries is an empty string; a transform maps
  // it to undefined so the optional enum accepts it. A transform (not preprocess) keeps the input
  // type a real string union rather than `unknown`, which the form's Select binds to.
  gender: userFields.gender
    .optional()
    .or(z.literal(''))
    .transform(value => (value === '' ? undefined : value)),
  dateOfBirth: userFields.dateOfBirth.optional(),
  bloodGroup: patientFields.bloodGroup
    .optional()
    .or(z.literal(''))
    .transform(value => (value === '' ? undefined : value)),
  allergies: patientFields.clinicalEntries.optional(),
  chronicConditions: patientFields.clinicalEntries.optional(),
  emergencyContact: optionalEmergencyContact,
  address: patientFields.address.optional().or(z.literal('')),
});

export type PatientRegisterInput = z.input<typeof PatientRegisterSchema>;
export type PatientRegisterOutput = z.output<typeof PatientRegisterSchema>;
