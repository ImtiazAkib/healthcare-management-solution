import mongoose, { Model, Schema, Types } from 'mongoose';

import { AuditAction, AuditEntity, AuditOutcome, UserRole } from '@/types';

import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_OUTCOMES } from '@/constants/audit.const';
import { USER_ROLES } from '@/constants/roles.const';

/**
 * One entry in the access trail.
 *
 * **Append-only.** Nothing updates or deletes a row — the service that writes it offers only a
 * create and a read, and no screen deletes from it. A record that can be edited is not an audit
 * trail. It carries who (`actor`, `actorRole`), what (`action`, `entity`, `entityId`), the outcome,
 * and where from (`ip`), and it holds **no clinical content** — a pointer at the record accessed,
 * never the record. The event time is `createdAt`.
 */
export type AuditLogAttributes = {
  actor: Types.ObjectId;
  actorRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  /** The specific record accessed, when the access named one; a list-style read may not. */
  entityId?: Types.ObjectId;
  outcome: AuditOutcome;
  /** The caller's address, when the proxy is trusted to report it; otherwise absent. */
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLogEntity = AuditLogAttributes & { _id: Types.ObjectId };

type AuditLogModel = Model<AuditLogAttributes>;

const auditLogSchema = new Schema<AuditLogAttributes, AuditLogModel>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true, enum: Object.values(USER_ROLES) },
    action: { type: String, required: true, enum: Object.values(AUDIT_ACTIONS) },
    entity: { type: String, required: true, enum: Object.values(AUDIT_ENTITIES) },
    entityId: { type: Schema.Types.ObjectId },
    outcome: { type: String, required: true, enum: Object.values(AUDIT_OUTCOMES) },
    ip: { type: String, trim: true, maxlength: 64 },
  },
  { timestamps: true }
);

// The trail, newest first, and the two ways an administrator narrows it: by actor, and by outcome.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });

export const AuditLog = (mongoose.models.AuditLog as AuditLogModel) ?? mongoose.model<AuditLogAttributes, AuditLogModel>('AuditLog', auditLogSchema);
