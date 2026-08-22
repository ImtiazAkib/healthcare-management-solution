'use server';

import { PatientDetailDto, PatientSummaryDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { PatientRegisterSchema, PatientUpdateSchema } from '@/lib/schemas';
import { PatientService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const patientService = new PatientService();

/**
 * Register a patient at the counter — the account, the record number and the clinical record.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The new patient's summary, or a failure carrying field-level reasons.
 */
export async function registerPatientAction(values: unknown): Promise<SingleResult<PatientSummaryDto>> {
  const gate = await gateAdminArea<PatientSummaryDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = PatientRegisterSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return patientService.register(validation.data);
}

/**
 * Edit a patient's clinical record.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The updated detail, or a failure.
 */
export async function updatePatientAction(values: unknown): Promise<SingleResult<PatientDetailDto>> {
  const gate = await gateAdminArea<PatientDetailDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = PatientUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return patientService.update(validation.data);
}
