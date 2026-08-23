'use server';

import { USER_ROLES } from '@/constants';
import { LabOrderDto, LabReportDto } from '@/types';

import { gateRoles } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { LabOrderCreateSchema, LabOrderStatusSchema, LabReportReleaseSchema } from '@/lib/schemas';
import { LabService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const labService = new LabService();

/*
  The lab writes that go through Server Actions. Filing a report is the exception — its bytes go
  through a route handler — so it is not here. Each action is gated to the role that owns the move:
  a doctor orders, the lab works and releases; the request never carries the acting identity, which
  is taken from the session.
*/

/**
 * Raise a lab order from the doctor's own open encounter.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The placed order, or a failure carrying the reason.
 */
export async function createLabOrderAction(values: unknown): Promise<SingleResult<LabOrderDto>> {
  const gate = await gateRoles<LabOrderDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = LabOrderCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return labService.createOrder(validation.data, gate.requester.userId);
}

/**
 * Move a lab order along its lifecycle — the lab's work, an administrator standing in.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The updated order, or a failure carrying the reason.
 */
export async function changeLabOrderStatusAction(values: unknown): Promise<SingleResult<LabOrderDto>> {
  const gate = await gateRoles<LabOrderDto>([USER_ROLES.LAB, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = LabOrderStatusSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return labService.changeOrderStatus(validation.data);
}

/**
 * Release a report to the ordering doctor and the patient — the verifier is the signed-in account.
 *
 * @param values - Raw values carrying the report id.
 *
 * @returns The released report, or a failure carrying the reason.
 */
export async function releaseLabReportAction(values: unknown): Promise<SingleResult<LabReportDto>> {
  const gate = await gateRoles<LabReportDto>([USER_ROLES.LAB, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = LabReportReleaseSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return labService.releaseReport(validation.data, gate.requester);
}
