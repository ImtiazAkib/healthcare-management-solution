import { z } from 'zod';

import { userFields } from './user-fields.schema';

/*
  A staff account is created by an administrator — there is no public sign-up for one — so
  the role is chosen here rather than defaulting. Optional text fields accept an empty
  string because that is what an untouched form input actually submits.
*/
export const UserCreateSchema = z.object({
  name: userFields.name,
  email: userFields.email,
  password: userFields.password,
  role: userFields.role,
  phone: userFields.phone.optional().or(z.literal('')),
  gender: userFields.gender.optional(),
  dateOfBirth: userFields.dateOfBirth.optional(),
});

export type UserCreateInput = z.input<typeof UserCreateSchema>;
export type UserCreateOutput = z.output<typeof UserCreateSchema>;
