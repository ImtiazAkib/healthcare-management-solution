'use server';

import { ServiceItemDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { EmptyResult, SingleResult, emptyFailureWithErrors, singleFailureWithErrors } from '@/lib/result';
import { ServiceItemActivateSchema, ServiceItemCreateSchema, ServiceItemDeleteSchema, ServiceItemUpdateSchema } from '@/lib/schemas';
import { ServiceItemService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const serviceItemService = new ServiceItemService();

/**
 * Add a service to the catalogue.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The created service, or a failure carrying field-level reasons.
 */
export async function createServiceAction(values: unknown): Promise<SingleResult<ServiceItemDto>> {
  const gate = await gateAdminArea<ServiceItemDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = ServiceItemCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return serviceItemService.create(validation.data);
}

/**
 * Edit a service — its name, code, category, description or price.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The updated service, or a failure.
 */
export async function updateServiceAction(values: unknown): Promise<SingleResult<ServiceItemDto>> {
  const gate = await gateAdminArea<ServiceItemDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = ServiceItemUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return serviceItemService.update(validation.data);
}

/**
 * Retire a service, or offer it again — the boolean decides which.
 *
 * Services are never deleted for this, so an invoice line already raised keeps resolving the
 * service it billed.
 *
 * @param values - Raw values carrying the service id and the new active flag.
 *
 * @returns The updated service, or a failure.
 */
export async function deactivateServiceAction(values: unknown): Promise<SingleResult<ServiceItemDto>> {
  const gate = await gateAdminArea<ServiceItemDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = ServiceItemActivateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return serviceItemService.setActive(validation.data);
}

/**
 * Delete a service.
 *
 * Irreversible. This only admits the caller to the area and validates the id — the service's
 * own rules decide whether the row may go.
 *
 * @param values - Raw values carrying the service id.
 *
 * @returns Empty success, or a failure carrying the reason's code.
 */
export async function deleteServiceAction(values: unknown): Promise<EmptyResult> {
  const gate = await gateAdminArea<ServiceItemDto>();

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  const validation = ServiceItemDeleteSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return serviceItemService.delete(validation.data.serviceItemId);
}
