import mongoose, { Model, Schema, Types } from 'mongoose';

import { NotificationChannel, NotificationKind, NotificationStatus } from '@/types';

import { NOTIFICATION_CHANNELS, NOTIFICATION_KINDS, NOTIFICATION_STATUSES } from '@/constants/notification.const';

/**
 * One message the system sent, or tried to send.
 *
 * A notification is a **record first and a message second**: it is written before it is dispatched,
 * so a refused send leaves a `failed` row carrying its reason rather than vanishing. That same row is
 * what the in-app bell reads, which is why the in-app channel needs no wire of its own.
 *
 * It carries **no clinical content** — a subject and a body that say a result is ready and to sign
 * in, never what the result was. `relatedType`/`relatedId` point at the record it is about so a click
 * can open it, but the record is never copied in here.
 */
export type NotificationAttributes = {
  recipient: Types.ObjectId;
  channel: NotificationChannel;
  kind: NotificationKind;
  subject: string;
  body: string;
  status: NotificationStatus;
  /** Why a dispatch failed, kept on the row so a `failed` notification explains itself. */
  failureReason?: string;
  /** When it is due, for a reminder the sweep writes ahead of time. */
  scheduledFor?: Date;
  sentAt?: Date;
  /** When the recipient read it in-app; absent means unread. */
  readAt?: Date;
  /** A loose pointer at the record this is about — an appointment, a report — never its content. */
  relatedType?: string;
  relatedId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationEntity = NotificationAttributes & { _id: Types.ObjectId };

type NotificationModel = Model<NotificationAttributes>;

const notificationSchema = new Schema<NotificationAttributes, NotificationModel>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, required: true, enum: Object.values(NOTIFICATION_CHANNELS) },
    kind: { type: String, required: true, enum: Object.values(NOTIFICATION_KINDS) },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: Object.values(NOTIFICATION_STATUSES), default: NOTIFICATION_STATUSES.PENDING },
    failureReason: { type: String, trim: true },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    readAt: { type: Date },
    relatedType: { type: String, trim: true },
    relatedId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

// The bell's only query: this recipient's notifications, newest first.
notificationSchema.index({ recipient: 1, createdAt: -1 });

/*
  One reminder per appointment, enforced by the database rather than by the sweep alone. The partial
  unique index means two sweeps racing on the same appointment cannot both write a reminder — the
  second is refused — so a double run still sends exactly one. It applies only to reminder rows that
  name the appointment they are for (every real one does), so every other kind may repeat freely.
*/
notificationSchema.index(
  { relatedId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { kind: NOTIFICATION_KINDS.APPOINTMENT_REMINDER, relatedId: { $exists: true } } }
);

export const Notification =
  (mongoose.models.Notification as NotificationModel) ??
  mongoose.model<NotificationAttributes, NotificationModel>('Notification', notificationSchema);
