import { z } from 'zod';

import { objectIdField } from './object-id.schema';

/*
  The flag-flipping schemas, together because they are the same shape: an id and a boolean.

  A boolean rather than two verbs — approve/revoke, activate/deactivate — so the action that
  consumes it is one function with one code path rather than two that can drift.
*/

export const UserApproveSchema = z.object({ userId: objectIdField, isApproved: z.boolean() });

export type UserApproveInput = z.input<typeof UserApproveSchema>;
export type UserApproveOutput = z.output<typeof UserApproveSchema>;

export const UserActivateSchema = z.object({ userId: objectIdField, isActive: z.boolean() });

export type UserActivateInput = z.input<typeof UserActivateSchema>;
export type UserActivateOutput = z.output<typeof UserActivateSchema>;

export const UserDeleteSchema = z.object({ userId: objectIdField });

export type UserDeleteInput = z.input<typeof UserDeleteSchema>;
export type UserDeleteOutput = z.output<typeof UserDeleteSchema>;

export const DepartmentActivateSchema = z.object({ departmentId: objectIdField, isActive: z.boolean() });

export type DepartmentActivateInput = z.input<typeof DepartmentActivateSchema>;
export type DepartmentActivateOutput = z.output<typeof DepartmentActivateSchema>;

export const DepartmentDeleteSchema = z.object({ departmentId: objectIdField });

export type DepartmentDeleteInput = z.input<typeof DepartmentDeleteSchema>;
export type DepartmentDeleteOutput = z.output<typeof DepartmentDeleteSchema>;

export const ServiceItemActivateSchema = z.object({ serviceItemId: objectIdField, isActive: z.boolean() });

export type ServiceItemActivateInput = z.input<typeof ServiceItemActivateSchema>;
export type ServiceItemActivateOutput = z.output<typeof ServiceItemActivateSchema>;

export const ServiceItemDeleteSchema = z.object({ serviceItemId: objectIdField });

export type ServiceItemDeleteInput = z.input<typeof ServiceItemDeleteSchema>;
export type ServiceItemDeleteOutput = z.output<typeof ServiceItemDeleteSchema>;

export const DoctorAcceptingSchema = z.object({ doctorId: objectIdField, isAcceptingPatients: z.boolean() });

export type DoctorAcceptingInput = z.input<typeof DoctorAcceptingSchema>;
export type DoctorAcceptingOutput = z.output<typeof DoctorAcceptingSchema>;
