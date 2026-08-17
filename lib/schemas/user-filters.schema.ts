import { z } from 'zod';

import { FILTER_ALL, USER_ROLE_FILTERS, USER_STATUS_FILTERS } from '@/constants/users.const';

/*
  What the staff list may be narrowed by, after the URL is parsed.

  Every field falls back rather than fails: these arrive from a query string somebody can
  hand-edit, so a nonsense `?role=wizard` degrades to the unfiltered list instead of an error
  page. `catch` is what does that — an invalid value becomes the default.

  `query` is not bounded to a pattern — it is a name or an email fragment. It is escaped
  before it reaches a Mongo `$regex`; see `escapeRegExp`.
*/
export const UserFiltersSchema = z.object({
  role: z.enum(Object.values(USER_ROLE_FILTERS)).catch(FILTER_ALL).default(FILTER_ALL),
  status: z.enum(Object.values(USER_STATUS_FILTERS)).catch(FILTER_ALL).default(FILTER_ALL),
  query: z.string().trim().max(120).catch('').default(''),
});

export type UserFiltersInput = z.input<typeof UserFiltersSchema>;
export type UserFiltersOutput = z.output<typeof UserFiltersSchema>;
