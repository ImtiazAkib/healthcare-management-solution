import { z } from 'zod';

import { CONSULTATION_FEE_MAX_MINOR_UNITS, DOCTOR_FIELD_LIMITS } from '@/constants/directory.const';

import { objectIdField } from './object-id.schema';

export const doctorFields = {
  specialization: z.string().trim().min(1, 'Specialization is required.').max(DOCTOR_FIELD_LIMITS.SPECIALIZATION, 'Specialization is too long.'),

  designation: z.string().trim().max(DOCTOR_FIELD_LIMITS.DESIGNATION, 'Designation is too long.'),

  registrationNo: z
    .string()
    .trim()
    .min(1, 'Registration number is required.')
    .max(DOCTOR_FIELD_LIMITS.REGISTRATION_NO, 'Registration number is too long.'),

  /*
    Arrives as the string a number input submits and leaves as an integer count of minor
    units. Accepts a number too, so re-validating the schema's own output in a Server Action
    does not fail on the second pass — the same idempotence `phone` and `dateOfBirth` need.

    The whole-number rule is the substance: a fee entered as `500.5` in minor units is
    somebody typing a major-unit amount into a minor-unit field, and rounding it silently
    would bill the wrong number.
  */
  consultationFee: z
    .union([z.number(), z.string().trim()])
    .transform(value => (value === '' ? 0 : Number(value)))
    .refine(value => Number.isInteger(value), 'Enter the fee in whole units.')
    .refine(value => value >= 0, 'A fee cannot be negative.')
    .refine(value => value <= CONSULTATION_FEE_MAX_MINOR_UNITS, 'Check the fee — that is unusually large.'),

  roomNo: z.string().trim().max(DOCTOR_FIELD_LIMITS.ROOM_NO, 'Room number is too long.'),

  biography: z.string().trim().max(DOCTOR_FIELD_LIMITS.BIOGRAPHY, 'Biography is too long.'),
};

export const DoctorCreateSchema = z.object({
  userId: objectIdField,
  departmentId: objectIdField,
  specialization: doctorFields.specialization,
  designation: doctorFields.designation.optional().or(z.literal('')),
  registrationNo: doctorFields.registrationNo,
  consultationFee: doctorFields.consultationFee,
  roomNo: doctorFields.roomNo.optional().or(z.literal('')),
  biography: doctorFields.biography.optional().or(z.literal('')),
});

export type DoctorCreateInput = z.input<typeof DoctorCreateSchema>;
export type DoctorCreateOutput = z.output<typeof DoctorCreateSchema>;
