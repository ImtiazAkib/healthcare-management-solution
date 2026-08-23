import mongoose, { Model, Schema, Types } from 'mongoose';

import { NoticeAudience, NoticeCategory } from '@/types';

import { NOTICE_AUDIENCES, NOTICE_CATEGORIES, NOTICE_FIELD_LIMITS } from '@/constants/notice.const';

/**
 * One stored image on a notice.
 *
 * Embedded rather than referenced, and one object rather than four loose columns: the bytes live in
 * the file bucket under `storageKey`, and this is the description the app reads. The key is opaque
 * and never leaves the server — the DTO exposes only that an image exists and its type.
 */
type NoticeImage = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
};

/**
 * A hospital announcement: a message, optionally a banner image, aimed at an audience.
 *
 * Deliberately carries no patient identity — it is not a clinical document. The service refuses a
 * title or body that contains a medical record number, and nothing here references a patient.
 */
export type NoticeAttributes = {
  title: string;
  /** Optional — a short title can be the whole notice. */
  body?: string;
  image?: NoticeImage;
  audience: NoticeAudience;
  /** Set only when `audience` is `department`; the invariant below keeps the two in step. */
  department?: Types.ObjectId;
  category: NoticeCategory;
  publishedBy: Types.ObjectId;
  /** When it was published — kept apart from `createdAt` so a notice can be dated deliberately. */
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type NoticeEntity = NoticeAttributes & { _id: Types.ObjectId };

type NoticeModel = Model<NoticeAttributes>;

const noticeImageSchema = new Schema<NoticeImage>(
  {
    storageKey: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const noticeSchema = new Schema<NoticeAttributes, NoticeModel>(
  {
    title: { type: String, required: true, trim: true, maxlength: NOTICE_FIELD_LIMITS.TITLE },
    body: { type: String, trim: true, maxlength: NOTICE_FIELD_LIMITS.BODY },
    image: { type: noticeImageSchema },
    audience: { type: String, required: true, enum: Object.values(NOTICE_AUDIENCES), default: NOTICE_AUDIENCES.EVERYONE },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    category: { type: String, required: true, enum: Object.values(NOTICE_CATEGORIES), default: NOTICE_CATEGORIES.GENERAL },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

/*
  Audience and department move together: a department notice must name its department, and a notice
  for any other audience must not carry one — otherwise a later change of audience would leave a
  stale department the query still matches on. Enforced in the model, not just the schema, because
  the seed and migration scripts write straight here.
*/
noticeSchema.pre('validate', function () {
  if (this.audience === NOTICE_AUDIENCES.DEPARTMENT) {
    if (!this.department) {
      this.invalidate('department', 'A department notice must name its department.');
    }

    return;
  }

  this.department = undefined;
});

// The two feeds this serves: a role's audience-filtered list, and a department's own notices — both newest first.
noticeSchema.index({ audience: 1, category: 1, publishedAt: -1 });
noticeSchema.index({ department: 1, publishedAt: -1 });

export const Notice = (mongoose.models.Notice as NoticeModel) ?? mongoose.model<NoticeAttributes, NoticeModel>('Notice', noticeSchema);
