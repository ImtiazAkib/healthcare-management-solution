import { z } from 'zod';

import { DEPARTMENT_STATUS_FILTERS } from '@/constants/directory.const';
import { FILTER_ALL } from '@/constants/users.const';

/*
  Every field catches rather than throws: the query string is user-editable, so a hand-edited
  filter degrades to the unfiltered list instead of an error page. Mirrors the users filter.
*/
export const DepartmentFiltersSchema = z.object({
  status: z.enum(Object.values(DEPARTMENT_STATUS_FILTERS)).catch(FILTER_ALL).default(FILTER_ALL),
  query: z.string().trim().max(120).catch('').default(''),
});

export type DepartmentFiltersInput = z.input<typeof DepartmentFiltersSchema>;
export type DepartmentFiltersOutput = z.output<typeof DepartmentFiltersSchema>;
