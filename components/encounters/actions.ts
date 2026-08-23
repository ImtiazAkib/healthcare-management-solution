'use server';

import { USER_ROLES } from '@/constants';
import { EncounterDto } from '@/types';

import { gateRoles } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { EncounterAddendumSchema, EncounterCompleteSchema, EncounterCreateSchema, EncounterUpdateSchema } from '@/lib/schemas';
import { EncounterService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const encounterService = new EncounterService();

/**
 * Open an encounter from a checked-in appointment.
 *
 * A Server Action is a public endpoint, so the caller is gated to the doctor role and the raw
 * values are validated here rather than trusted. The service takes the whole requester so it can
 * resolve the acting doctor and refuse an appointment that is not theirs.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The opened encounter, or a failure carrying the reason.
 */
export async function openEncounterAction(values: unknown): Promise<SingleResult<EncounterDto>> {
  const gate = await gateRoles<EncounterDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = EncounterCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return encounterService.open(validation.data, gate.requester);
}

/**
 * Edit an open encounter's notes and diagnoses.
 *
 * Refused by the service once the encounter is completed — a completed record takes an addendum,
 * not an overwrite — and only the doctor who opened it may edit.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The updated encounter, or a failure carrying the reason.
 */
export async function updateEncounterAction(values: unknown): Promise<SingleResult<EncounterDto>> {
  const gate = await gateRoles<EncounterDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = EncounterUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return encounterService.update(validation.data, gate.requester);
}

/**
 * Add a dated addendum to an encounter — the only write a completed encounter allows.
 *
 * @param values - Raw form values, validated here.
 *
 * @returns The encounter with the addendum, or a failure carrying the reason.
 */
export async function addAddendumAction(values: unknown): Promise<SingleResult<EncounterDto>> {
  const gate = await gateRoles<EncounterDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = EncounterAddendumSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return encounterService.addAddendum(validation.data, gate.requester);
}

/**
 * Complete an encounter, closing it to further edits and completing the appointment behind it.
 *
 * @param values - Raw values carrying the encounter id.
 *
 * @returns The completed encounter, or a failure carrying the reason.
 */
export async function completeEncounterAction(values: unknown): Promise<SingleResult<EncounterDto>> {
  const gate = await gateRoles<EncounterDto>([USER_ROLES.DOCTOR]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = EncounterCompleteSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return encounterService.complete(validation.data.encounterId, gate.requester);
}
