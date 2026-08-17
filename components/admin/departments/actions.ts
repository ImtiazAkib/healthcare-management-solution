'use server';

import { DepartmentDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { EmptyResult, SingleResult, emptyFailureWithErrors, singleFailureWithErrors } from '@/lib/result';
import { DepartmentActivateSchema, DepartmentCreateSchema, DepartmentDeleteSchema, DepartmentUpdateSchema } from '@/lib/schemas';
import { DepartmentService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const departmentService = new DepartmentService();

/**
 * Create a department.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The created department, or a failure carrying field-level reasons.
 */
export async function createDepartmentAction(values: unknown): Promise<SingleResult<DepartmentDto>> {
  const gate = await gateAdminArea<DepartmentDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = DepartmentCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  // A department has no per-viewer rules — any admin-area user may manage it — so the service
  // takes no requester, unlike `UserService`.
  return departmentService.create(validation.data);
}

/**
 * Edit a department.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The updated department, or a failure.
 */
export async function updateDepartmentAction(values: unknown): Promise<SingleResult<DepartmentDto>> {
  const gate = await gateAdminArea<DepartmentDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = DepartmentUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return departmentService.update(validation.data);
}

/**
 * Switch a department off, or back on — the boolean decides which.
 *
 * A department is never deleted for this, so the doctors and past appointments that reference
 * it keep a valid target.
 *
 * @param values - Raw values carrying the department id and the new active flag.
 *
 * @returns The updated department, or a failure.
 */
export async function deactivateDepartmentAction(values: unknown): Promise<SingleResult<DepartmentDto>> {
  const gate = await gateAdminArea<DepartmentDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = DepartmentActivateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return departmentService.setActive(validation.data);
}

/**
 * Delete a department.
 *
 * Irreversible. This only admits the caller to the area and validates the id — whether the
 * department may be removed is the service's decision.
 *
 * @param values - Raw values carrying the department id.
 *
 * @returns Empty success, or a failure carrying the reason's code.
 */
export async function deleteDepartmentAction(values: unknown): Promise<EmptyResult> {
  const gate = await gateAdminArea<DepartmentDto>();

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  const validation = DepartmentDeleteSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return departmentService.delete(validation.data.departmentId);
}
