import { z } from 'zod';

import { SERVICE_CATEGORY_FILTERS, SERVICE_STATUS_FILTERS } from '@/constants/service.const';
import { FILTER_ALL } from '@/constants/users.const';

/*
  Category, status and search text, each catching rather than throwing so a hand-edited query
  string degrades to the unfiltered catalogue. Mirrors the users and departments filters.
*/
export const ServiceItemFiltersSchema = z.object({
  category: z.enum(Object.values(SERVICE_CATEGORY_FILTERS)).catch(FILTER_ALL).default(FILTER_ALL),
  status: z.enum(Object.values(SERVICE_STATUS_FILTERS)).catch(FILTER_ALL).default(FILTER_ALL),
  query: z.string().trim().max(120).catch('').default(''),
});

export type ServiceItemFiltersInput = z.input<typeof ServiceItemFiltersSchema>;
export type ServiceItemFiltersOutput = z.output<typeof ServiceItemFiltersSchema>;
