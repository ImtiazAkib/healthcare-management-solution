import { z } from 'zod';

import { AVAILABILITY_STATUS_FILTERS, DAYS_OF_WEEK } from '@/constants/schedule.const';
import { FILTER_ALL } from '@/constants/users.const';

import { objectIdField } from './object-id.schema';

/*
  Doctor, day and status, each catching rather than throwing so a hand-edited query string
  degrades to the unfiltered week. The doctor filter is an id or "all" — validated as an id so a
  hand-typed `?doctorId=garbage` falls back to "all" rather than reaching Mongo as a bad cast.
*/
export const AvailabilityFiltersSchema = z.object({
  doctorId: z
    .union([z.literal(FILTER_ALL), objectIdField])
    .catch(FILTER_ALL)
    .default(FILTER_ALL),
  dayOfWeek: z
    .enum([FILTER_ALL, ...DAYS_OF_WEEK])
    .catch(FILTER_ALL)
    .default(FILTER_ALL),
  status: z.enum(Object.values(AVAILABILITY_STATUS_FILTERS)).catch(FILTER_ALL).default(FILTER_ALL),
});

export type AvailabilityFiltersInput = z.input<typeof AvailabilityFiltersSchema>;
export type AvailabilityFiltersOutput = z.output<typeof AvailabilityFiltersSchema>;
