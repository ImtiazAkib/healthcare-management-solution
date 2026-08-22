import { z } from 'zod';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { FILTER_ALL } from '@/constants/users.const';

import { scheduleFields } from './availability-create.schema';
import { objectIdField } from './object-id.schema';

/*
  Doctor, date and status, each catching rather than throwing so a hand-edited query string
  degrades to the unfiltered day. The doctor filter is an id or "all"; the date is a single day or
  empty for every day; the status is one of the lifecycle values or "all".
*/
export const AppointmentFiltersSchema = z.object({
  doctorId: z
    .union([z.literal(FILTER_ALL), objectIdField])
    .catch(FILTER_ALL)
    .default(FILTER_ALL),
  date: z
    .union([z.literal(''), scheduleFields.calendarDate])
    .catch('')
    .default(''),
  status: z
    .enum([FILTER_ALL, ...Object.values(APPOINTMENT_STATUSES)])
    .catch(FILTER_ALL)
    .default(FILTER_ALL),
});

export type AppointmentFiltersInput = z.input<typeof AppointmentFiltersSchema>;
export type AppointmentFiltersOutput = z.output<typeof AppointmentFiltersSchema>;
