import { z } from 'zod';

import { DOCTOR_FIELD_LIMITS } from '@/constants/directory.const';
import { CALENDAR_DATE_PATTERN, DAYS_OF_WEEK, SLOT_MINUTES, TIME_PATTERN } from '@/constants/schedule.const';

import { objectIdField } from './object-id.schema';

export const scheduleFields = {
  time: z.string().trim().regex(TIME_PATTERN, 'Use a 24-hour time such as 09:30.'),
  calendarDate: z.string().trim().regex(CALENDAR_DATE_PATTERN, 'Use a date such as 2026-08-17.'),
  dayOfWeek: z.enum(DAYS_OF_WEEK, 'Choose a day of the week.'),
  slotMinutes: z
    .union([z.number(), z.string().trim()])
    .transform(value => (value === '' ? SLOT_MINUTES.DEFAULT : Number(value)))
    .refine(value => Number.isInteger(value), 'Slot length must be a whole number of minutes.')
    .refine(
      value => value >= SLOT_MINUTES.MIN && value <= SLOT_MINUTES.MAX,
      `Slot length must be between ${SLOT_MINUTES.MIN} and ${SLOT_MINUTES.MAX} minutes.`
    ),
  room: z.string().trim().max(DOCTOR_FIELD_LIMITS.ROOM_NO, 'Room number is too long.'),
};

/*
  The end-after-start rule is a `superRefine` rather than two independent field rules,
  because it is a relationship between them and it has to report on `endTime` — the field
  somebody would go and change.
*/
export const AvailabilityCreateSchema = z
  .object({
    doctorId: objectIdField,
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

      return;
    }

    if (values.effectiveTo && values.effectiveTo < values.effectiveFrom) {
      ctx.addIssue({ code: 'custom', path: ['effectiveTo'], message: 'The block cannot stop applying before it starts.' });
    }

    /*
      A block has to hold at least one whole slot. A slot longer than the block expands into
      nothing — the week shows "0 slots" and reception can never book it — yet it still reserves
      the doctor and the room, refusing another block that genuinely could be booked there.
    */
    const startMinutes = Number(values.startTime.slice(0, 2)) * 60 + Number(values.startTime.slice(3, 5));
    const endMinutes = Number(values.endTime.slice(0, 2)) * 60 + Number(values.endTime.slice(3, 5));

    if (endMinutes - startMinutes < values.slotMinutes) {
      ctx.addIssue({ code: 'custom', path: ['slotMinutes'], message: 'A slot cannot be longer than the block it fills.' });
    }
  });

export type AvailabilityCreateInput = z.input<typeof AvailabilityCreateSchema>;
export type AvailabilityCreateOutput = z.output<typeof AvailabilityCreateSchema>;
