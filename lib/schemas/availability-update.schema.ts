import { z } from 'zod';

import { scheduleFields } from './availability-create.schema';
import { objectIdField } from './object-id.schema';

/*
  No `doctorId`. Moving a block to another doctor would silently reassign every slot it
  expands into; a block belongs to the doctor it was published for.
*/
export const AvailabilityUpdateSchema = z
  .object({
    availabilityId: objectIdField,
    dayOfWeek: scheduleFields.dayOfWeek,
    startTime: scheduleFields.time,
    endTime: scheduleFields.time,
    slotMinutes: scheduleFields.slotMinutes,
    room: scheduleFields.room.optional().or(z.literal('')),
    effectiveFrom: scheduleFields.calendarDate,
    effectiveTo: scheduleFields.calendarDate.optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.startTime >= values.endTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'The end time must be after the start time.' });
    }

    if (values.effectiveTo && values.effectiveTo < values.effectiveFrom) {
      ctx.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'The block cannot stop applying before it starts.' });
    }
  });

export type AvailabilityUpdateInput = z.input<typeof AvailabilityUpdateSchema>;
export type AvailabilityUpdateOutput = z.output<typeof AvailabilityUpdateSchema>;
