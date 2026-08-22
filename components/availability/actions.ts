'use server';

import { AvailabilityDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { EmptyResult, SingleResult, emptyFailureWithErrors, singleFailureWithErrors } from '@/lib/result';
import { AvailabilityActivateSchema, AvailabilityCreateSchema, AvailabilityDeleteSchema, AvailabilityUpdateSchema } from '@/lib/schemas';
import { AvailabilityService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const availabilityService = new AvailabilityService();

/**
 * Publish an availability block.
 *
 * The service may refuse with more than one reason at once — a doctor clash and a room clash
 * are reported together — so the failure it returns is passed on whole rather than reduced to
 * its first error.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The created block, or a failure carrying every clash.
 */
export async function createAvailabilityAction(values: unknown): Promise<SingleResult<AvailabilityDto>> {
  const gate = await gateAdminArea<AvailabilityDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AvailabilityCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return availabilityService.create(validation.data);
}

/**
 * Edit a block. The doctor does not move — a block belongs to the doctor it was published for —
 * so the update carries no `doctorId`.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The updated block, or a failure carrying every clash.
 */
export async function updateAvailabilityAction(values: unknown): Promise<SingleResult<AvailabilityDto>> {
  const gate = await gateAdminArea<AvailabilityDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AvailabilityUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return availabilityService.update(validation.data);
}

/**
 * Switch a block off, or back on — the boolean decides which.
 *
 * A block is never deleted for this: retiring it keeps the record so the same hours can be
 * reactivated later. Reactivating re-checks the clashes, which the service handles.
 *
 * @param values - Raw values carrying the block id and the new active flag.
 *
 * @returns The updated block, or a failure.
 */
export async function deactivateAvailabilityAction(values: unknown): Promise<SingleResult<AvailabilityDto>> {
  const gate = await gateAdminArea<AvailabilityDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AvailabilityActivateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return availabilityService.setActive(validation.data);
}

/**
 * Delete a block.
 *
 * Irreversible. This only admits the caller to the area and validates the id — whether the
 * block may be removed is the service's decision.
 *
 * @param values - Raw values carrying the block id.
 *
 * @returns Empty success, or a failure carrying the reason's code.
 */
export async function deleteAvailabilityAction(values: unknown): Promise<EmptyResult> {
  const gate = await gateAdminArea<AvailabilityDto>();

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  const validation = AvailabilityDeleteSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return availabilityService.delete(validation.data.availabilityId);
}
