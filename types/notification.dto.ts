import { toId } from '@/lib/utils';

import { NotificationChannel } from './notification-channel';
import { NotificationKind } from './notification-kind';
import { NotificationStatus } from './notification-status';

import type { NotificationEntity } from '@/models/notification.model';

/**
 * A notification as the bell and the notifications page see one.
 *
 * Carries what to show and whether it has been read; the recipient id and the thing it relates to are
 * ids, never joined-in content, because a notification is a pointer — "a result is ready, sign in" —
 * not the record it points at.
 */
export type NotificationDto = {
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  subject: string;
  body: string;
  status: NotificationStatus;
  failureReason: string | null;
  isRead: boolean;
  relatedType: string | null;
  relatedId: string | null;
  /** ISO dates. */
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored notification to its DTO.
 *
 * @param entity - Stored notification.
 *
 * @returns Instance of NotificationDto.
 */
export function notificationFromEntity(entity: NotificationEntity): NotificationDto {
  return {
    notificationId: toId(entity._id),
    recipientId: toId(entity.recipient),
    channel: entity.channel,
    kind: entity.kind,
    subject: entity.subject,
    body: entity.body,
    status: entity.status,
    failureReason: entity.failureReason ?? null,
    isRead: Boolean(entity.readAt),
    relatedType: entity.relatedType ?? null,
    relatedId: entity.relatedId ? toId(entity.relatedId) : null,
    sentAt: entity.sentAt ? entity.sentAt.toISOString() : null,
    readAt: entity.readAt ? entity.readAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
