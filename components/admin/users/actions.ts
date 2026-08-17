'use server';

import { UserDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { EmptyResult, SingleResult, emptyFailureWithErrors, singleFailureWithErrors } from '@/lib/result';
import { UserActivateSchema, UserApproveSchema, UserCreateSchema, UserDeleteSchema, UserUpdateSchema } from '@/lib/schemas';
import { UserService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const userService = new UserService();

/**
 * Create a staff account.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The created account, or a failure carrying field-level reasons.
 */
export async function createUserAction(values: unknown): Promise<SingleResult<UserDto>> {
  const gate = await gateAdminArea<UserDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = UserCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return userService.create(validation.data, gate.requester);
}

/**
 * Edit a staff account.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The updated account, or a failure.
 */
export async function updateUserAction(values: unknown): Promise<SingleResult<UserDto>> {
  const gate = await gateAdminArea<UserDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = UserUpdateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return userService.update(validation.data, gate.requester);
}

/**
 * Approve an account, or take approval back — the boolean decides which.
 *
 * @param values - Raw values carrying the account id and the new approval flag.
 *
 * @returns The updated account, or a failure.
 */
export async function approveUserAction(values: unknown): Promise<SingleResult<UserDto>> {
  const gate = await gateAdminArea<UserDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = UserApproveSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return userService.setApproval(validation.data, gate.requester);
}

/**
 * Switch an account off, or back on — the boolean decides which.
 *
 * Accounts are never deleted for this, so a doctor's encounters keep a valid author.
 *
 * @param values - Raw values carrying the account id and the new active flag.
 *
 * @returns The updated account, or a failure.
 */
export async function deactivateUserAction(values: unknown): Promise<SingleResult<UserDto>> {
  const gate = await gateAdminArea<UserDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = UserActivateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return userService.setActive(validation.data, gate.requester);
}

/**
 * Delete a staff account.
 *
 * Irreversible. Who may do this, and to whom, is the service's decision — this only admits
 * the caller to the area and validates the id.
 *
 * @param values - Raw values carrying the account id.
 *
 * @returns Empty success, or a failure carrying the reason's code.
 */
export async function deleteUserAction(values: unknown): Promise<EmptyResult> {
  const gate = await gateAdminArea<UserDto>();

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  const validation = UserDeleteSchema.safeParse(values);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return userService.delete(validation.data.userId, gate.requester);
}
