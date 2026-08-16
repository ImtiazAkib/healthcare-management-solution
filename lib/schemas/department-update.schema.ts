import { z } from 'zod';

import { departmentFields } from './department-create.schema';
import { objectIdField } from './object-id.schema';

/*
  The code is editable, unlike an account's role: it is a label the hospital chose for
  itself, not an identity anything references. What references a department is its id.
*/
export const DepartmentUpdateSchema = z.object({
  departmentId: objectIdField,
  name: departmentFields.name,
  code: departmentFields.code,
  description: departmentFields.description.optional().or(z.literal('')),
  headDoctorId: departmentFields.headDoctorId.optional().or(z.literal('')),
});

export type DepartmentUpdateInput = z.input<typeof DepartmentUpdateSchema>;
export type DepartmentUpdateOutput = z.output<typeof DepartmentUpdateSchema>;
