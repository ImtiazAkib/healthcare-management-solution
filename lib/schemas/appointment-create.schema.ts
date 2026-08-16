import { z } from 'zod';

import { APPOINTMENT_FIELD_LIMITS, APPOINTMENT_STATUSES, TRIAGE_PRIORITIES } from '@/constants/appointment.const';

import { scheduleFields } from './availability-create.schema';
import { objectIdField } from './object-id.schema';

export const appointmentFields = {
  reason: z.string().trim().max(APPOINTMENT_FIELD_LIMITS.REASON, 'Keep the reason under 500 characters.'),
  status: z.enum(Object.values(APPOINTMENT_STATUSES), 'Choose a valid status.'),
  triagePriority: z.enum(Object.values(TRIAGE_PRIORITIES), 'Choose a valid priority.'),
  cancelledReason: z.string().trim().max(APPOINTMENT_FIELD_LIMITS.CANCELLED_REASON, 'Keep the reason under 300 characters.'),
};

/*
  There is no `tokenNo` and no `status`. A token is assigned at check-in by the service, and
  a booking always starts in the status the model defaults to — letting a caller choose
  either would let a request book itself straight into a consultation.

  The service still re-checks that the slot exists in the doctor's published availability and
  that nothing already holds it. This schema only says the request is well formed.
*/
export const AppointmentCreateSchema = z
  .object({
    patientId: objectIdField,
    doctorId: objectIdField,
    departmentId: objectIdField,
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

export type AppointmentCreateInput = z.input<typeof AppointmentCreateSchema>;
export type AppointmentCreateOutput = z.output<typeof AppointmentCreateSchema>;
