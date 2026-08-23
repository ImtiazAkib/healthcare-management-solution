import { z } from 'zod';

import { appointmentFields } from './appointment-create.schema';
import { scheduleFields } from './availability-create.schema';
import { objectIdField } from './object-id.schema';

/*
  A patient booking their own appointment. It is the counter booking minus one field: **there is no
  `patientId`**. A patient must never name the patient — the portal pins it from the session, so a
  request cannot book a visit into somebody else's record. Everything else is the same, and the
  service still derives the department and end time from the doctor's availability and re-checks the
  slot, so a well-formed request here is still refused if the slot is not really free.
*/
export const AppointmentSelfBookSchema = z
  .object({
    doctorId: objectIdField,
    date: scheduleFields.calendarDate,
    startTime: scheduleFields.time,
    endTime: scheduleFields.time,
    reason: appointmentFields.reason.optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.startTime >= values.endTime) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'The end time must be after the start time.' });
    }
  });

export type AppointmentSelfBookInput = z.input<typeof AppointmentSelfBookSchema>;
export type AppointmentSelfBookOutput = z.output<typeof AppointmentSelfBookSchema>;
