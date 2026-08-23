'use server';

import { USER_ROLES } from '@/constants';
import { PrescriptionDto } from '@/types';

import { gateRoles } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { PrescriptionCreateSchema, PrescriptionSupersedeSchema } from '@/lib/schemas';
import { PrescriptionService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const prescriptionService = new PrescriptionService();

/**
 * Issue a prescription against the doctor's own open encounter.
 *
 * A Server Action is a public endpoint, so the caller is gated to the doctor role and the raw
 * values are validated here rather than trusted. The service takes the session user id and resolves
 * the acting doctor from it — the patient and doctor are derived from the encounter, never sent — so
 * a doctor writing into a stranger's encounter, or a completed one, is refused there.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The issued prescription, or a failure carrying the reason.
 */
export async function issuePrescriptionAction(values: unknown): Promise<SingleResult<PrescriptionDto>> {
  const gate = await gateRoles<PrescriptionDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = PrescriptionCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return prescriptionService.issue(validation.data, gate.requester.userId);
}

/**
 * Replace an issued prescription — the only way to "edit" one.
 *
 * The replacement belongs to the same encounter as the original, resolved server-side, so the
 * request cannot redirect it onto another record. A prescription already replaced is refused there.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The new prescription, or a failure carrying the reason.
 */
export async function supersedePrescriptionAction(values: unknown): Promise<SingleResult<PrescriptionDto>> {
  const gate = await gateRoles<PrescriptionDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = PrescriptionSupersedeSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return prescriptionService.supersede(validation.data, gate.requester.userId);
}
