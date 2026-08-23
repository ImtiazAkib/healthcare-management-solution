import { z } from 'zod';

import { userFields } from './user-fields.schema';

/*
  Editing your own account, from a screen you reached with a live session.

  What this schema leaves out is the security. There is **no `userId`** — the account is taken from
  the session, never the payload, so there is nothing to point at somebody else's record. There is
  **no `role`, `isApproved`, `isActive`, `medicalRecordNo` or `registrationNo`** — those are the
  hospital's record of you, not your description of yourself, and a request that names them is parsed
  and they are simply gone. The password has its own screen, which asks for the current one first.

  `email` **is** here, and that is the whole reason self-service editing needs its own schema apart
  from the staff-account form: an address change is not written straight through. The service holds
  the new address aside and mails it a link, and the session keeps the old one until the link is
  followed. Name is required; the demographics are optional.
*/
export const ProfileUpdateSchema = z.object({
  name: userFields.name,
  email: userFields.email,
  phone: userFields.phone.optional().or(z.literal('')),
  // A Select's "not recorded" option is an empty string; the transform maps it to undefined so the
  // optional enum accepts it, while keeping the input a real string union the form binds to.
  gender: userFields.gender
    .optional()
    .or(z.literal(''))
    .transform(value => (value === '' ? undefined : value)),
  dateOfBirth: userFields.dateOfBirth.optional(),
});

export type ProfileUpdateInput = z.input<typeof ProfileUpdateSchema>;
export type ProfileUpdateOutput = z.output<typeof ProfileUpdateSchema>;
