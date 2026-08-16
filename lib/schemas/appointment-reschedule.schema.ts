import { z } from 'zod';

import { appointmentFields } from './appointment-create.schema';
import { scheduleFields } from './availability-create.schema';
import { objectIdField } from './object-id.schema';

/*
  A reschedule moves the time and may move the doctor — a patient reassigned to a colleague
  keeps the same appointment rather than losing it and getting a new one, so the history
  stays on one record.

  The patient never changes. That would not be a reschedule; that would be giving somebody
  else's slot away under their name.
*/
export const AppointmentRescheduleSchema = z
  .object({
    appointmentId: objectIdField,
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

export type AppointmentRescheduleInput = z.input<typeof AppointmentRescheduleSchema>;
export type AppointmentRescheduleOutput = z.output<typeof AppointmentRescheduleSchema>;

/** Moving an appointment along its lifecycle. Which moves are legal is a service rule. */
export const AppointmentStatusSchema = z.object({
  appointmentId: objectIdField,
  status: appointmentFields.status,
  cancelledReason: appointmentFields.cancelledReason.optional().or(z.literal('')),
});

export type AppointmentStatusInput = z.input<typeof AppointmentStatusSchema>;
export type AppointmentStatusOutput = z.output<typeof AppointmentStatusSchema>;

/** Triage, set by a nurse at check-in. Its own schema because it is its own permission. */
export const AppointmentTriageSchema = z.object({
  appointmentId: objectIdField,
  triagePriority: appointmentFields.triagePriority,
});

export type AppointmentTriageInput = z.input<typeof AppointmentTriageSchema>;
export type AppointmentTriageOutput = z.output<typeof AppointmentTriageSchema>;
