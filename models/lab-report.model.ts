import mongoose, { Model, Schema, Types } from 'mongoose';

import { LAB_FIELD_LIMITS, LAB_REPORT_MIME_TYPES } from '@/constants/lab.const';

/**
 * The result of a diagnostic order: what the lab found, and the file it came on.
 *
 * **Released is not the same as uploaded.** A report exists once the lab writes it; it
 * reaches the doctor and the patient only when `releasedAt` is set, after somebody has
 * verified it. Until then the doctor sees "in progress" and the patient sees nothing. An
 * unverified result in front of a patient is the failure this whole module is shaped around.
 */
export type LabReportAttributes = {
  /** One report per order — enforced by a unique index. */
  labOrder: Types.ObjectId;
  patient: Types.ObjectId;
  /** The lab account that performed and uploaded it. */
  performedBy: Types.ObjectId;
  summary?: string;
  findings?: string;
  file?: {
    /**
     * Where the bytes sit in GridFS. **Never leaves the server** — it is absent from the
     * DTO, and the download route resolves it after checking who is asking.
     */
    storageKey: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
  verifiedBy?: Types.ObjectId;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LabReportEntity = LabReportAttributes & { _id: Types.ObjectId };

type LabReportModel = Model<LabReportAttributes>;

const reportFileSchema = new Schema(
  {
    storageKey: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true, maxlength: LAB_FIELD_LIMITS.FILE_NAME },
    /*
      The allow-list lives here too, not only at the upload route. Whatever is stored is
      eventually served, and a type the server refuses to accept should also be a type it
      cannot be made to hold by any other path.
    */
    mimeType: { type: String, required: true, enum: LAB_REPORT_MIME_TYPES },
    size: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const labReportSchema = new Schema<LabReportAttributes, LabReportModel>(
  {
    labOrder: { type: Schema.Types.ObjectId, ref: 'LabOrder', required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    summary: { type: String, trim: true, maxlength: LAB_FIELD_LIMITS.SUMMARY },
    findings: { type: String, trim: true, maxlength: LAB_FIELD_LIMITS.FINDINGS },
    file: { type: reportFileSchema },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    releasedAt: { type: Date },
  },
  { timestamps: true }
);

/*
  A release without a verifier is the one state this record must never reach. Checked at the
  model so no service, script or shell can produce it — the service will refuse it too, but
  this is the floor under that.
*/
labReportSchema.pre('validate', function () {
  if (this.releasedAt && !this.verifiedBy) {
    this.invalidate('verifiedBy', 'A report cannot be released before somebody has verified it.');
  }
});

// The patient's released results, newest first — the portal's only query over this.
labReportSchema.index({ patient: 1, releasedAt: -1 });

export const LabReport =
  (mongoose.models.LabReport as LabReportModel) ?? mongoose.model<LabReportAttributes, LabReportModel>('LabReport', labReportSchema);
