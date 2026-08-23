'use server';

import { USER_ROLES } from '@/constants';
import { AppointmentDto } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';

import { gateRoles } from '@/lib/auth';
import { SingleResult, singleFailureWithErrors } from '@/lib/result';
import { AppointmentStatusSchema } from '@/lib/schemas';
import { AppointmentService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const appointmentService = new AppointmentService();

/*
  The queue owns its own actions rather than borrowing the appointments feature's. The queue is
  derived — `QueueService` only reads it — so every move on it is a status change on the
  appointment underneath, gated to the role that owns the move.

  Each action **pins its own target status** rather than trusting the one in the request. The role
  gate alone is not enough: a request carries a status, and if the action passed it straight
  through, a nurse admitted to `checkInAction` could send `cancelled` and perform an
  administrator-only cancellation, or a doctor's `in-consultation`. Binding the status to the
  action is what makes the role gate mean what it says — the client chooses the appointment, never
  the move.
*/

/**
 * Check a booked patient in, giving them a token and putting them in the queue.
 *
 * A nurse's move (an administrator may stand in). The status is `checked-in`, set here rather than
 * taken from the request.
 *
 * @param values - Raw values carrying the appointment id.
 *
 * @returns The updated appointment, or a failure carrying the reason.
 */
export async function checkInAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateRoles<AppointmentDto>([USER_ROLES.NURSE, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentStatusSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return appointmentService.changeStatus({ ...validation.data, status: APPOINTMENT_STATUSES.CHECKED_IN }, gate.requester.userId);
}

/**
 * Mark a booked patient a no-show — they never arrived, so the slot they held is released.
 *
 * A nurse's move (an administrator may stand in).
 *
 * @param values - Raw values carrying the appointment id and the new status.
 *
 * @returns The updated appointment, or a failure carrying the reason.
 */
export async function noShowAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateRoles<AppointmentDto>([USER_ROLES.NURSE, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentStatusSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return appointmentService.changeStatus({ ...validation.data, status: APPOINTMENT_STATUSES.NO_SHOW }, gate.requester.userId);
}
