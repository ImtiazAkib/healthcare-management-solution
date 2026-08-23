import { z } from 'zod';

import { userFields } from './user-fields.schema';

/*
  Self-registration is the first unauthenticated write in the application, so what this schema leaves
  out matters as much as what it holds.

  There is **no `role`** — it is fixed to `patient` in the service, never read from the request, so a
  hand-built form cannot register an administrator. There is **no `medicalRecordNo`** — it is minted
  by the issuer, or inherited from a record reception already created. And **no `isApproved`,
  `isActive` or `isEmailVerified`** — the account's state is the application's to decide, and an
  applicant who could set them would be approving themselves.

  Unlike the counter form, this one takes a `password`: the person is setting up their own sign-in.
  Name, email and password are required; the demographics are optional, since more of the record is
  filled in over the visits that follow.
*/
export const PatientRegistrationSchema = z.object({
  name: userFields.name,
  email: userFields.email,
  password: userFields.password,
  phone: userFields.phone.optional().or(z.literal('')),
  // A Select's "not recorded" option is an empty string; the transform maps it to undefined so the
  // optional enum accepts it, while keeping the input a real string union the form binds to.
  gender: userFields.gender
    .optional()
    .or(z.literal(''))
    .transform(value => (value === '' ? undefined : value)),
  dateOfBirth: userFields.dateOfBirth.optional(),
});

export type PatientRegistrationInput = z.input<typeof PatientRegistrationSchema>;
export type PatientRegistrationOutput = z.output<typeof PatientRegistrationSchema>;
