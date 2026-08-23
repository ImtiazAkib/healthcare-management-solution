'use server';

import { USER_ROLES } from '@/constants/roles.const';

import { gateRoles } from '@/lib/auth';
import { EmptyResult, emptyFailureWithErrors } from '@/lib/result';
import { objectIdField } from '@/lib/schemas';
import { NotificationService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const notificationService = new NotificationService();

// Every signed-in role has a bell, so every role gates through — scoped to their own notifications in the service.
const EVERY_ROLE = Object.values(USER_ROLES);

/**
 * Mark one of the signed-in person's notifications read.
 *
 * @param id - The notification id.
 *
 * @returns An empty success, or a failure.
 */
export async function markNotificationReadAction(id: unknown): Promise<EmptyResult> {
  const gate = await gateRoles(EVERY_ROLE);

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  const validation = objectIdField.safeParse(id);

  if (!validation.success) {
    return emptyFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  // Scoped to the requester in the service, so nobody marks another person's notification read.
  return notificationService.markRead(validation.data, gate.requester.userId);
}

/**
 * Mark every unread notification of the signed-in person read.
 *
 * @returns An empty success, or a failure.
 */
export async function markAllNotificationsReadAction(): Promise<EmptyResult> {
  const gate = await gateRoles(EVERY_ROLE);

  if (!gate.allowed) {
    return emptyFailureWithErrors(gate.refusal.errors);
  }

  return notificationService.markAllRead(gate.requester.userId);
}
