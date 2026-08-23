import { toId } from '@/lib/utils';

import { UserRole } from './user-role';

import type { AuditLogEntity } from '@/models/audit-log.model';

/** What was done to the record. A read is a `view`; pulling a report's file is a `download`. */
export type AuditAction = 'view' | 'download';

/** The kind of record that was accessed. */
export type AuditEntity = 'patient' | 'timeline' | 'encounter' | 'prescription' | 'lab-report';

/** Whether the access was allowed or refused — a refused attempt is worth recording as much as a granted one. */
export type AuditOutcome = 'granted' | 'refused';

/**
 * One entry in the access trail — who touched which record, when, from where, and whether it was
 * allowed. It records **reads**, not just writes: "which doctor opened this file" is the question the
 * `User`/`Patient` split was drawn to make answerable, and this is the answer. It carries no clinical
 * content — a pointer at the record, never the record.
 */
export type AuditLogDto = {
  auditId: string;
  actorId: string;
  actorName: string | null;
  actorRole: UserRole;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string | null;
  outcome: AuditOutcome;
  ip: string | null;
  at: string;
};

/**
 * Map a stored audit entry to its DTO.
 *
 * @param entity - Stored audit entry.
 * @param actorName - The resolved actor name, or null.
 *
 * @returns Instance of AuditLogDto.
 */
export function auditLogFromEntity(entity: AuditLogEntity, actorName: string | null = null): AuditLogDto {
  return {
    auditId: toId(entity._id),
    actorId: toId(entity.actor),
    actorName,
    actorRole: entity.actorRole,
    action: entity.action,
    entity: entity.entity,
    entityId: entity.entityId ? toId(entity.entityId) : null,
    outcome: entity.outcome,
    ip: entity.ip ?? null,
    at: entity.createdAt.toISOString(),
  };
}
