import { z } from 'zod';

import { USER_ROLES } from '@/constants/roles.const';

/*
  What the users list may be narrowed by. Every field is optional and every one tolerates
  the empty string, because these arrive from the URL through nuqs and an unset filter is a
  blank query parameter rather than a missing one.

  `search` is not bounded to a pattern — it is a name or an email fragment somebody typed.
  It is escaped before it reaches a Mongo `$regex`; see `escapeRegExp`.
*/
export const UserFiltersSchema = z.object({
  search: z.string().trim().max(120).optional().or(z.literal('')),
  role: z.enum(Object.values(USER_ROLES)).optional().or(z.literal('')),
  isApproved: z.enum(['true', 'false']).optional().or(z.literal('')),
  isActive: z.enum(['true', 'false']).optional().or(z.literal('')),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export type UserFiltersInput = z.input<typeof UserFiltersSchema>;
export type UserFiltersOutput = z.output<typeof UserFiltersSchema>;
