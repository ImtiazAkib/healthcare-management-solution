import { Notification } from '@/models/notification.model';
import { User } from '@/models/user.model';
import { NotificationChannel, NotificationDto, NotificationKind, notificationFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES } from '@/constants/notification.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { channelDriver } from '@/lib/notify';
import {
  EmptyResult,
  ListResult,
  SingleResult,
  createError,
  emptyFailureWithError,
  emptySuccess,
  listFailure,
  listSuccess,
  singleFailure,
  singleSuccess,
} from '@/lib/result';

import type { NotificationAttributes, NotificationEntity } from '@/models/notification.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('notification.service');

const DATABASE = CODES.DATABASE.NOTIFICATIONS;
const VALIDATION = CODES.VALIDATION.NOTIFICATIONS;
const UNREACHABLE = VALIDATION.RECIPIENT_UNREACHABLE;

/** How many notifications a recipient's list carries. */
const LIST_LIMIT = 50;

/** One notification to write and dispatch. */
export type NotifyInput = {
  recipientId: string;
  channel: NotificationChannel;
  kind: NotificationKind;
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
  scheduledFor?: Date;
};

/** The content of an in-app notification fanned out to many recipients at once. */
export type FanOutContent = {
  kind: NotificationKind;
  subject: string;
  body: string;
  relatedType?: string;
  relatedId?: string;
};

/*
  Notifications: writing them, dispatching them, and reading them back for the bell.

  The rule that carries the weight is **record first, dispatch second**. Every notification is written
  before it is sent, so a refused send leaves a `failed` row carrying its reason rather than vanishing
  — and that same row is what the in-app bell reads, which is why the in-app channel needs no wire.
  Nothing here dispatches inside a transaction with the thing that triggered it: a booking is booked
  whether or not its confirmation goes out, so callers treat `notify` as best-effort.
*/
export class NotificationService {
  /**
   * Write a notification and dispatch it on its channel.
   *
   * The row is written `pending`, then the outcome is applied: an in-app notification is `sent` at
   * once; an email or SMS is delivered through its channel and marked `sent`, or `failed` with a
   * reason when the recipient has no address or the transport refuses it. Either way a row remains.
   *
   * @param input - The recipient, channel, kind and content.
   *
   * @returns The written notification, or a failure.
   */
  public async notify(input: NotifyInput): Promise<SingleResult<NotificationDto>> {
    try {
      await connectToDatabase();

      const created = await Notification.create({
        recipient: input.recipientId,
        channel: input.channel,
        kind: input.kind,
        subject: input.subject,
        body: input.body,
        status: NOTIFICATION_STATUSES.PENDING,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        scheduledFor: input.scheduledFor,
      });

      const outcome = await this.dispatch(input);

      const updated = await Notification.findByIdAndUpdate(created._id, outcome, { returnDocument: 'after' }).lean<NotificationEntity | null>();

      if (!updated) {
        return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
      }

      return singleSuccess(notificationFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Recording a notification failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Write one in-app notification to each of many recipients, in a single insert.
   *
   * For an emergency alert fanned out to a role: in-app only, so every row is `sent` at once with no
   * dispatch. Best-effort and deduplicated by the caller; an empty recipient list is a no-op.
   *
   * @param recipientIds - The accounts to notify.
   * @param content - The shared kind and content.
   *
   * @returns How many rows were written.
   */
  public async fanOutInApp(recipientIds: string[], content: FanOutContent): Promise<number> {
    if (recipientIds.length === 0) {
      return 0;
    }

    await connectToDatabase();

    const now = new Date();
    const rows = recipientIds.map(recipientId => ({
      recipient: recipientId,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      kind: content.kind,
      subject: content.subject,
      body: content.body,
      status: NOTIFICATION_STATUSES.SENT,
      sentAt: now,
      relatedType: content.relatedType,
      relatedId: content.relatedId,
    }));

    const inserted = await Notification.insertMany(rows);

    return inserted.length;
  }

  /**
   * The notifications for a recipient, newest first — what the bell and the notifications page read.
   *
   * @param userId - The recipient.
   * @param limit - How many to return.
   *
   * @returns The recipient's notifications.
   */
  public async listForRecipient(userId: string, limit: number = LIST_LIMIT): Promise<ListResult<NotificationDto>> {
    try {
      await connectToDatabase();

      const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(limit).lean<NotificationEntity[]>();

      return listSuccess(notifications.map(notificationFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing notifications failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * How many of a recipient's notifications are unread — the bell's badge.
   *
   * @param userId - The recipient.
   *
   * @returns The unread count, or 0 on any error (a badge is not worth an exception).
   */
  public async unreadCount(userId: string): Promise<number> {
    try {
      await connectToDatabase();

      return await Notification.countDocuments({ recipient: userId, readAt: { $exists: false } });
    } catch (error) {
      log.warn({ err: error }, 'Counting unread notifications failed');

      return 0;
    }
  }

  /**
   * Mark one of a recipient's notifications read. Scoped to the recipient, so nobody marks another
   * person's notification.
   *
   * @param id - The notification.
   * @param userId - The recipient it must belong to.
   *
   * @returns An empty success, or a not-found failure.
   */
  public async markRead(id: string, userId: string): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const updated = await Notification.findOneAndUpdate(
        { _id: id, recipient: userId, readAt: { $exists: false } },
        { readAt: new Date() },
        { returnDocument: 'after' }
      ).lean<NotificationEntity | null>();

      if (!updated) {
        // Either it is not this recipient's, or it was already read — both are a no-op we report as not-found.
        const exists = await Notification.exists({ _id: id, recipient: userId });

        return exists
          ? emptySuccess()
          : emptyFailureWithError(createError(VALIDATION.NOTIFICATION_NOT_FOUND.CODE, VALIDATION.NOTIFICATION_NOT_FOUND.MESSAGE));
      }

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Marking a notification read failed');

      return emptyFailureWithError(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Mark every unread notification of a recipient read.
   *
   * @param userId - The recipient.
   *
   * @returns An empty success, or a failure.
   */
  public async markAllRead(userId: string): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      await Notification.updateMany({ recipient: userId, readAt: { $exists: false } }, { readAt: new Date() });

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Marking all notifications read failed');

      return emptyFailureWithError(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Work out how a notification's dispatch went, without touching the row — the caller applies it.
   *
   * In-app is delivered by existing. Email and SMS resolve the recipient's address for the channel;
   * a recipient with no address for it, or a transport that refuses, becomes a `failed` outcome with
   * the reason, never a thrown error that would roll the row back.
   *
   * @param input - The notification being dispatched.
   *
   * @returns The status fields to write onto the row.
   */
  private async dispatch(input: NotifyInput): Promise<Partial<NotificationAttributes>> {
    if (input.channel === NOTIFICATION_CHANNELS.IN_APP) {
      return { status: NOTIFICATION_STATUSES.SENT, sentAt: new Date() };
    }

    const driver = channelDriver(input.channel);

    if (!driver) {
      return { status: NOTIFICATION_STATUSES.SENT, sentAt: new Date() };
    }

    /*
      This never throws — a thrown lookup or a driver that breaks its resolve-not-throw contract still
      becomes a `failed` outcome, so the caller always has a status to write and the row is never left
      stuck `pending`. That is what makes "a refused send leaves a failed row" true in every case, not
      only when a well-behaved driver resolves `{ delivered: false }`.
    */
    try {
      const recipient = await User.findById(input.recipientId).select('email phone').lean<Pick<UserEntity, 'email' | 'phone'> | null>();
      const to = input.channel === NOTIFICATION_CHANNELS.EMAIL ? recipient?.email : recipient?.phone;

      if (!to) {
        return { status: NOTIFICATION_STATUSES.FAILED, failureReason: UNREACHABLE.MESSAGE };
      }

      const result = await driver.deliver({ to, subject: input.subject, body: input.body });

      if (result.delivered) {
        return { status: NOTIFICATION_STATUSES.SENT, sentAt: new Date() };
      }

      return { status: NOTIFICATION_STATUSES.FAILED, failureReason: result.reason ?? UNREACHABLE.MESSAGE };
    } catch (error) {
      log.warn({ err: error }, 'Dispatching a notification threw; recording it as failed');

      return { status: NOTIFICATION_STATUSES.FAILED, failureReason: 'The notification could not be dispatched.' };
    }
  }
}
