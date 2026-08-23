import { env } from '@/env/server';
import { AuditLog } from '@/models/audit-log.model';
import { User } from '@/models/user.model';
import { AuditAction, AuditEntity, AuditLogDto, AuditOutcome, SessionUser, auditLogFromEntity } from '@/types';

import { AUDIT_LIST_LIMIT, AUDIT_OUTCOME_FILTERS } from '@/constants/audit.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, createError, listFailure, listSuccess } from '@/lib/result';
import type { AuditFiltersOutput } from '@/lib/schemas';
import { escapeRegExp, resolveCallerIp, toId } from '@/lib/utils';

import type { AuditLogAttributes, AuditLogEntity } from '@/models/audit-log.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter } from 'mongoose';

const log = createLoggerWithContext('audit.service');

const DATABASE = CODES.DATABASE.AUDIT;

/** One access to record: who, what, on which record, and whether it was allowed. */
export type AuditRecordInput = {
  actor: SessionUser;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  outcome: AuditOutcome;
};

/*
  The access trail: recording who read which record, and reading the trail back for an administrator.

  Recording is **best-effort and append-only** — an audit write that fails is logged and swallowed, so
  a trail outage never breaks the clinical read it was recording, and nothing here ever updates or
  deletes a row. The caller's address is resolved from the request only when the proxy is trusted; in
  any other context it is simply absent rather than a guess. No clinical content is written — the row
  points at a record, it does not copy it.
*/
export class AuditService {
  /**
   * Record one access. Never throws — the read it accompanies must not fail because the trail did.
   *
   * @param input - The actor, the action, the target and the outcome.
   */
  public async record(input: AuditRecordInput): Promise<void> {
    try {
      const ip = await this.resolveIp();

      await connectToDatabase();

      await AuditLog.create({
        actor: input.actor.userId,
        actorRole: input.actor.role,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        outcome: input.outcome,
        ip: ip ?? undefined,
      });
    } catch (error) {
      log.warn({ err: error }, 'Recording an audit event failed');
    }
  }

  /**
   * The access trail for an administrator, newest first, narrowed by the screen's filters.
   *
   * @param filters - Outcome, and an actor-name search.
   *
   * @returns The matching entries as DTOs.
   */
  public async list(filters: AuditFiltersOutput): Promise<ListResult<AuditLogDto>> {
    try {
      await connectToDatabase();

      const conditions: QueryFilter<AuditLogAttributes> = {};

      if (filters.outcome !== AUDIT_OUTCOME_FILTERS.ALL) {
        conditions.outcome = filters.outcome;
      }

      if (filters.query) {
        const actorIds = await this.actorIdsMatching(filters.query);

        if (actorIds.length === 0) {
          return listSuccess([]);
        }

        conditions.actor = { $in: actorIds };
      }

      const entries = await AuditLog.find(conditions).sort({ createdAt: -1 }).limit(AUDIT_LIST_LIMIT).lean<AuditLogEntity[]>();

      return listSuccess(await this.toDtoList(entries));
    } catch (error) {
      log.error({ err: error }, 'Listing the access trail failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The caller's address, resolved from the request only when the deployment trusts its proxy.
   *
   * The request context is reached by a dynamic import, so a service that pulls this in outside a
   * request (a script, a test) never loads `next/headers` and simply records no address.
   *
   * @returns The address, or null.
   */
  private async resolveIp(): Promise<string | null> {
    try {
      const { headers } = await import('next/headers');

      return resolveCallerIp(await headers(), env.TRUSTED_PROXY);
    } catch {
      return null;
    }
  }

  /**
   * The actor ids whose name matches a search — the step behind the trail's text filter, because a row
   * names its actor by id.
   *
   * @param query - The raw search text.
   *
   * @returns The matching account ids.
   */
  private async actorIdsMatching(query: string): Promise<string[]> {
    const pattern = new RegExp(escapeRegExp(query), 'i');
    const users = await User.find({ name: pattern }).select('_id').lean<Pick<UserEntity, '_id'>[]>();

    return users.map(user => toId(user._id));
  }

  /**
   * Map entries to DTOs, resolving each actor's name in one batched lookup.
   *
   * @param entries - The stored entries.
   *
   * @returns The entries as DTOs.
   */
  private async toDtoList(entries: AuditLogEntity[]): Promise<AuditLogDto[]> {
    const actorIds = [...new Set(entries.map(entry => toId(entry.actor)))];

    const users = await User.find({ _id: { $in: actorIds } })
      .select('name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameById = new Map(users.map(user => [toId(user._id), user.name]));

    return entries.map(entry => auditLogFromEntity(entry, nameById.get(toId(entry.actor)) ?? null));
  }
}
