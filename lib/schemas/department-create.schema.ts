import { z } from 'zod';

import { DEPARTMENT_CODE_PATTERN, DEPARTMENT_FIELD_LIMITS } from '@/constants/directory.const';

import { objectIdField } from './object-id.schema';

/*
  Plain messages rather than encoded codes: the department service lands in step 6b and gets
  its code file then. An uncoded message decodes to code 0 and still renders — which is the
  point of the encoding being optional.
*/
export const departmentFields = {
  name: z.string().trim().min(1, 'Department name is required.').max(DEPARTMENT_FIELD_LIMITS.NAME, 'Department name is too long.'),

  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Department code is required.')
    .regex(DEPARTMENT_CODE_PATTERN, 'Use 2–12 letters or digits, e.g. CARD.'),

  description: z.string().trim().max(DEPARTMENT_FIELD_LIMITS.DESCRIPTION, 'Description is too long.'),

  headDoctorId: objectIdField,
};

export const DepartmentCreateSchema = z.object({
  name: departmentFields.name,
  code: departmentFields.code,
  description: departmentFields.description.optional().or(z.literal('')),
  headDoctorId: departmentFields.headDoctorId.optional().or(z.literal('')),
});

export type DepartmentCreateInput = z.input<typeof DepartmentCreateSchema>;
export type DepartmentCreateOutput = z.output<typeof DepartmentCreateSchema>;
