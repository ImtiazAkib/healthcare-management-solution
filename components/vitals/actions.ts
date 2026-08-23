'use server';

import { USER_ROLES } from '@/constants';
import { AppointmentDto } from '@/types';

import { gateRoles } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { AppointmentTriageSchema, VitalsRecordSchema } from '@/lib/schemas';
import { TriageService, VitalsService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const vitalsService = new VitalsService();
const triageService = new TriageService();

/*
  The nurse's two writes. Both are gated to the nurse (an administrator may stand in) and take the
  acting account from the session — a nurse records vitals and sets triage, and nothing more. The
  clinical writers (diagnosis, prescription, lab order) gate to the doctor and refuse a nurse there,
  so the boundary is the service's, not a hidden button.
*/

/**
 * Record the vitals a nurse takes at check-in.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The updated appointment, or a failure carrying the reason.
 */
export async function recordVitalsAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateRoles<AppointmentDto>([USER_ROLES.NURSE, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = VitalsRecordSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return vitalsService.recordVitals(validation.data, gate.requester.userId);
}

/**
 * Set a patient's triage priority — it reorders the live queue.
 *
 * @param values - Raw values carrying the appointment id and the priority.
 *
 * @returns The updated appointment, or a failure carrying the reason.
 */
export async function setTriageAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateRoles<AppointmentDto>([USER_ROLES.NURSE, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentTriageSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return triageService.setPriority(validation.data, gate.requester.userId);
}
