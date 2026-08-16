import { z } from 'zod';

import { objectIdField } from './object-id.schema';
import { userFields } from './user-fields.schema';

/*
  No `role` and no `password`. A role is set once and never moved — the service refuses a
  change and the code that says so is `ROLE_IS_IMMUTABLE` — and a password is changed
  through its own screen, which asks for the current one first.
*/
export const UserUpdateSchema = z.object({
  userId: objectIdField,
  name: userFields.name,
  email: userFields.email,
  phone: userFields.phone.optional().or(z.literal('')),
  gender: userFields.gender.optional(),
  dateOfBirth: userFields.dateOfBirth.optional(),
});

export type UserUpdateInput = z.input<typeof UserUpdateSchema>;
export type UserUpdateOutput = z.output<typeof UserUpdateSchema>;
