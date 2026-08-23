import { Department } from '@/models/department.model';
import { Doctor } from '@/models/doctor.model';
import { Notice } from '@/models/notice.model';
import { User } from '@/models/user.model';
import { NoticeAudience, NoticeDto, SessionUser, UserRole, noticeFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { NOTICE_AUDIENCES, NOTICE_CATEGORIES, NOTICE_IMAGE, NOTICE_MRN_PATTERN } from '@/constants/notice.const';
import { NOTIFICATION_KINDS } from '@/constants/notification.const';
import { STAFF_ROLES, USER_ROLES } from '@/constants/roles.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { emergencyNoticeContent } from '@/lib/notify';
import {
  EmptyResult,
  ErrorDto,
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
import type { NoticeCreateOutput } from '@/lib/schemas';
import { storage } from '@/lib/storage';
import type { StoredFileStream } from '@/lib/storage';
import { fileMatchesDeclaredType, toId } from '@/lib/utils';

import { NotificationService } from './notification.service';
import { hasStorageRoomFor } from './storage.guard';

import type { DepartmentEntity } from '@/models/department.model';
import type { NoticeAttributes, NoticeEntity } from '@/models/notice.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter, Types } from 'mongoose';

const log = createLoggerWithContext('notice.service');

const DATABASE = CODES.DATABASE.NOTICES;
const VALIDATION = CODES.VALIDATION.NOTICES;

/** How many notices a role's dashboard feed carries. */
const FEED_LIMIT = 20;

/*
  Hospital announcements: publishing them, reading the ones aimed at you, and serving their images.

  Two things carry the weight:

  - **Targeting is a query, not a filter on the client.** Every read narrows to the audiences the
    viewer belongs to before the rows leave the database, so a patient's feed never fetches a staff
    notice — the payload is the disclosure, and hiding a card the query already returned is not
    security.
  - **An image is bytes a stranger supplied**, so it is magic-number checked on the way in, served
    from a route with `nosniff` and a `sandbox` policy, and never described to a client by anything
    that could fetch it directly. And a notice carries no patient identity: a title or body with a
    medical record number in it is refused.
*/
export class NoticeService {
  private readonly notificationService = new NotificationService();

  /**
   * Every notice, newest first — the administrator's management view, not narrowed by audience.
   *
   * @returns Every notice as a DTO.
   */
  public async list(): Promise<ListResult<NoticeDto>> {
    try {
      await connectToDatabase();

      const notices = await Notice.find().sort({ publishedAt: -1 }).lean<NoticeEntity[]>();

      return listSuccess(await this.toDtoList(notices));
    } catch (error) {
      log.error({ err: error }, 'Listing notices failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The notices aimed at a role, for its dashboard feed. Narrowed to the viewer's audiences, with any
   * emergency pinned to the top; a doctor also sees notices for their own department.
   *
   * @param session - The signed-in account whose feed this is.
   * @param limit - How many to return (defaults to the feed limit).
   *
   * @returns The targeted notices as DTOs, emergency-first.
   */
  public async listForRole(session: SessionUser, limit: number = FEED_LIMIT): Promise<ListResult<NoticeDto>> {
    try {
      await connectToDatabase();

      const department = await this.viewerDepartment(session);
      const conditions = this.conditionsForFeed(session.role, department);

      /*
        Aggregated rather than a plain `find().sort()`, so an emergency pins even when it is older than
        the newest ordinary notices — a `$sort` by publish date alone could push it below the limit.
      */
      const notices = await Notice.aggregate<NoticeEntity>([
        { $match: conditions },
        { $addFields: { pinRank: { $cond: [{ $eq: ['$category', NOTICE_CATEGORIES.EMERGENCY] }, 1, 0] } } },
        { $sort: { pinRank: -1, publishedAt: -1 } },
        { $limit: limit },
        { $project: { pinRank: 0 } },
      ]);

      return listSuccess(await this.toDtoList(notices));
    } catch (error) {
      log.error({ err: error }, 'Listing a role feed failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * Publish a notice.
   *
   * The title and body are refused if either carries a medical record number, a department notice is
   * refused if its department is not real, and an image — if one is attached — is refused unless its
   * bytes match an accepted image type and the bucket has room. The bytes are stored first and the
   * row second, with the bytes dropped if the row fails so nothing is orphaned.
   *
   * @param input - Validated text fields.
   * @param file - An attached image, or null.
   * @param publisher - The signed-in account publishing it.
   *
   * @returns The published notice, or a failure.
   */
  public async create(input: NoticeCreateOutput, file: File | null, publisher: SessionUser): Promise<SingleResult<NoticeDto>> {
    try {
      await connectToDatabase();

      const contentRefusal = this.refuseMedicalRecordNo(input.title, input.body);

      if (contentRefusal) {
        return singleFailure(contentRefusal);
      }

      const departmentRefusal = await this.refuseUnknownDepartment(input);

      if (departmentRefusal) {
        return singleFailure(departmentRefusal);
      }

      const imageRefusal = file ? await this.refuseBadImage(file) : null;

      if (imageRefusal) {
        return singleFailure(imageRefusal);
      }

      const stored = file ? await storage.save(file) : null;

      try {
        const created = await Notice.create({
          title: input.title,
          body: this.optionalText(input.body),
          image: stored ? { storageKey: stored.storageKey, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size } : undefined,
          audience: input.audience,
          department: input.audience === NOTICE_AUDIENCES.DEPARTMENT ? input.departmentId : undefined,
          category: input.category,
          publishedBy: publisher.userId,
        });

        const entity = created.toObject();

        // An emergency notice is also an alert: it fans out to its audience as in-app notifications.
        if (entity.category === NOTICE_CATEGORIES.EMERGENCY) {
          await this.fanOutEmergency(entity);
        }

        return singleSuccess((await this.toDtoList([entity]))[0]);
      } catch (error) {
        // Bytes landed but the row did not — drop the orphan so it does not sit in the bucket, counting.
        if (stored) {
          await storage.remove(stored.storageKey);
        }

        log.error({ err: error }, 'Creating a notice row failed');

        return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
      }
    } catch (error) {
      log.error({ err: error }, 'Publishing a notice failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a notice.
   *
   * The same content and department guards as publishing. A replacement image is validated and
   * stored before the row is updated; only once the row is saved is the old image removed, so a
   * failed edit never leaves the notice pointing at bytes that are gone.
   *
   * @param id - The notice to edit.
   * @param input - Validated text fields.
   * @param file - A replacement image, or null to keep the current one.
   *
   * @returns The updated notice, or a failure.
   */
  public async update(id: string, input: NoticeCreateOutput, file: File | null): Promise<SingleResult<NoticeDto>> {
    try {
      await connectToDatabase();

      const existing = await Notice.findById(id).lean<NoticeEntity | null>();

      if (!existing) {
        return this.noticeNotFound();
      }

      const contentRefusal = this.refuseMedicalRecordNo(input.title, input.body);

      if (contentRefusal) {
        return singleFailure(contentRefusal);
      }

      const departmentRefusal = await this.refuseUnknownDepartment(input);

      if (departmentRefusal) {
        return singleFailure(departmentRefusal);
      }

      const imageRefusal = file ? await this.refuseBadImage(file) : null;

      if (imageRefusal) {
        return singleFailure(imageRefusal);
      }

      const stored = file ? await storage.save(file) : null;

      // A plain object rather than `Partial<NoticeAttributes>`: the department arrives as a string id,
      // which Mongoose casts to an ObjectId on write. A replacement image is set; nothing said keeps the current one.
      const changes: Record<string, unknown> = {
        title: input.title,
        body: this.optionalText(input.body),
        audience: input.audience,
        department: input.audience === NOTICE_AUDIENCES.DEPARTMENT ? input.departmentId : undefined,
        category: input.category,
        ...(stored ? { image: { storageKey: stored.storageKey, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size } } : {}),
      };

      let updated: NoticeEntity | null;
      try {
        updated = await Notice.findByIdAndUpdate(
          id,
          input.audience === NOTICE_AUDIENCES.DEPARTMENT ? { $set: changes } : { $set: changes, $unset: { department: '' } },
          { returnDocument: 'after' }
        ).lean<NoticeEntity | null>();
      } catch (error) {
        if (stored) {
          await storage.remove(stored.storageKey);
        }

        log.error({ err: error }, 'Updating a notice row failed');

        return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
      }

      if (!updated) {
        if (stored) {
          await storage.remove(stored.storageKey);
        }

        return this.noticeNotFound();
      }

      // The row now points at the new bytes, so the old ones can go. Best-effort — an orphan is the safe failure.
      if (stored && existing.image) {
        await storage.remove(existing.image.storageKey);
      }

      return singleSuccess((await this.toDtoList([updated]))[0]);
    } catch (error) {
      log.error({ err: error }, 'Editing a notice failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Delete a notice, and its image if it had one.
   *
   * @param id - The notice to delete.
   *
   * @returns An empty success, or a failure.
   */
  public async delete(id: string): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const removed = await Notice.findByIdAndDelete(id).lean<NoticeEntity | null>();

      if (!removed) {
        return emptyFailureWithError(createError(VALIDATION.NOTICE_NOT_FOUND.CODE, VALIDATION.NOTICE_NOT_FOUND.MESSAGE));
      }

      // Best-effort: the row is already gone, and a leftover image is a bounded orphan, not a broken notice.
      if (removed.image) {
        await storage.remove(removed.image.storageKey);
      }

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Deleting a notice failed');

      return emptyFailureWithError(createError(DATABASE.DELETE_FAILED.CODE, DATABASE.DELETE_FAILED.MESSAGE));
    }
  }

  /**
   * Open a notice's image for streaming, once the viewer is allowed to see the notice.
   *
   * A viewer outside the notice's audience gets the same not-found a missing notice gives, so a
   * guessed id reveals nothing. A notice with no image is a not-found too.
   *
   * @param id - The notice whose image is wanted.
   * @param session - The signed-in viewer.
   *
   * @returns The opened image stream, or a failure.
   */
  public async openImage(id: string, session: SessionUser): Promise<SingleResult<StoredFileStream>> {
    try {
      await connectToDatabase();

      const notice = await Notice.findById(id).lean<NoticeEntity | null>();

      if (!notice || !notice.image) {
        return this.noticeNotFound();
      }

      const department = await this.viewerDepartment(session);

      if (!this.mayView(notice, session, department)) {
        // Indistinguishable from a missing notice on purpose — a wrong audience learns nothing.
        return this.noticeNotFound();
      }

      const file = await storage.read(notice.image.storageKey);

      if (!file) {
        return this.noticeNotFound();
      }

      return singleSuccess(file);
    } catch (error) {
      log.error({ err: error }, 'Opening a notice image failed');

      return singleFailure(createError(DATABASE.READ_FAILED.CODE, DATABASE.READ_FAILED.MESSAGE));
    }
  }

  /**
   * The audiences a role's feed matches. Every staff role sees the notices for everyone and for
   * staff; a patient sees the notices for everyone and for patients. Department notices are added
   * separately, because only a doctor carries a department to match on.
   *
   * @param role - The viewer's role.
   *
   * @returns The audiences to match.
   */
  private audiencesFor(role: UserRole): NoticeAudience[] {
    if (role === USER_ROLES.PATIENT) {
      return [NOTICE_AUDIENCES.EVERYONE, NOTICE_AUDIENCES.PATIENTS];
    }

    return [NOTICE_AUDIENCES.EVERYONE, NOTICE_AUDIENCES.STAFF];
  }

  /**
   * The feed query for a viewer: the audiences they belong to, plus — for a doctor — the notices for
   * their own department.
   *
   * @param role - The viewer's role.
   * @param department - The doctor's department, or null.
   *
   * @returns Conditions for the feed.
   */
  private conditionsForFeed(role: UserRole, department: Types.ObjectId | null): QueryFilter<NoticeAttributes> {
    const base: QueryFilter<NoticeAttributes> = { audience: { $in: this.audiencesFor(role) } };

    if (role === USER_ROLES.DOCTOR && department) {
      return { $or: [base, { audience: NOTICE_AUDIENCES.DEPARTMENT, department }] };
    }

    return base;
  }

  /**
   * Whether a viewer may see a given notice — the access check the image route makes.
   *
   * An administrator may see any notice, because they manage all of them. Everyone else is held to
   * their feed's audiences, with a doctor additionally allowed their own department's notices.
   *
   * @param notice - The notice.
   * @param session - The viewer.
   * @param department - The doctor's department, or null.
   *
   * @returns True when the viewer may see it.
   */
  private mayView(notice: NoticeEntity, session: SessionUser, department: Types.ObjectId | null): boolean {
    if (session.role === USER_ROLES.ADMIN || session.role === USER_ROLES.SUPER_ADMIN) {
      return true;
    }

    if (this.audiencesFor(session.role).includes(notice.audience)) {
      return true;
    }

    return notice.audience === NOTICE_AUDIENCES.DEPARTMENT && Boolean(department) && String(notice.department) === String(department);
  }

  /**
   * The department a viewer belongs to, for department targeting. Only a doctor has one.
   *
   * @param session - The viewer.
   *
   * @returns The department id, or null.
   */
  private async viewerDepartment(session: SessionUser): Promise<Types.ObjectId | null> {
    if (session.role !== USER_ROLES.DOCTOR) {
      return null;
    }

    const doctor = await Doctor.findOne({ user: session.userId }).select('department').lean<{ department: Types.ObjectId } | null>();

    return doctor?.department ?? null;
  }

  /**
   * Fan an emergency notice out to its audience as in-app notifications. Best-effort and swallowed:
   * the notice is published whether or not the alerts land, so a failure here is logged, not raised.
   *
   * @param notice - The emergency notice.
   */
  private async fanOutEmergency(notice: NoticeEntity): Promise<void> {
    try {
      const recipients = await this.recipientsForAudience(notice);

      if (recipients.length === 0) {
        return;
      }

      const content = emergencyNoticeContent(notice.title);

      await this.notificationService.fanOutInApp(recipients, {
        kind: NOTIFICATION_KINDS.EMERGENCY_NOTICE,
        subject: content.subject,
        body: content.body,
        relatedType: 'notice',
        relatedId: toId(notice._id),
      });
    } catch (error) {
      log.warn({ err: error }, 'Fanning out an emergency notice failed');
    }
  }

  /**
   * The accounts a notice's audience resolves to — the same targeting the feed uses, expanded to the
   * users it names rather than a query condition.
   *
   * @param notice - The notice.
   *
   * @returns The recipient account ids.
   */
  private async recipientsForAudience(notice: NoticeEntity): Promise<string[]> {
    if (notice.audience === NOTICE_AUDIENCES.DEPARTMENT) {
      if (!notice.department) {
        return [];
      }

      const doctors = await Doctor.find({ department: notice.department }).select('user').lean<{ user: Types.ObjectId }[]>();

      return doctors.map(doctor => toId(doctor.user));
    }

    const conditions: QueryFilter<UserEntity> = { isActive: true };

    if (notice.audience === NOTICE_AUDIENCES.PATIENTS) {
      conditions.role = USER_ROLES.PATIENT;
    } else if (notice.audience === NOTICE_AUDIENCES.STAFF) {
      conditions.role = { $in: [...STAFF_ROLES, USER_ROLES.SUPER_ADMIN] };
    }

    const users = await User.find(conditions).select('_id').lean<Pick<UserEntity, '_id'>[]>();

    return users.map(user => toId(user._id));
  }

  /**
   * Refuse a title or body that carries a medical record number. A notice is not clinical, and this
   * is the guard against the most likely accidental disclosure.
   *
   * @param title - The notice title.
   * @param body - The notice body, if any.
   *
   * @returns An error to return, or null when the content is clean.
   */
  private refuseMedicalRecordNo(title: string, body: string | undefined): ErrorDto | null {
    if (NOTICE_MRN_PATTERN.test(title)) {
      return createError(VALIDATION.BODY_CONTAINS_MRN.CODE, VALIDATION.BODY_CONTAINS_MRN.MESSAGE, 'title');
    }

    if (body && NOTICE_MRN_PATTERN.test(body)) {
      return createError(VALIDATION.BODY_CONTAINS_MRN.CODE, VALIDATION.BODY_CONTAINS_MRN.MESSAGE, 'body');
    }

    return null;
  }

  /**
   * Refuse a department notice whose department does not exist.
   *
   * @param input - The validated fields.
   *
   * @returns An error to return, or null.
   */
  private async refuseUnknownDepartment(input: NoticeCreateOutput): Promise<ErrorDto | null> {
    if (input.audience !== NOTICE_AUDIENCES.DEPARTMENT || !input.departmentId) {
      return null;
    }

    const exists = await Department.exists({ _id: input.departmentId });

    return exists ? null : createError(VALIDATION.DEPARTMENT_NOT_FOUND.CODE, VALIDATION.DEPARTMENT_NOT_FOUND.MESSAGE, 'departmentId');
  }

  /**
   * Refuse an attached image whose bytes do not match an accepted image type, or that there is no
   * room to store.
   *
   * @param file - The attached image.
   *
   * @returns An error to return, or null when the image is acceptable.
   */
  private async refuseBadImage(file: File): Promise<ErrorDto | null> {
    if (file.size > NOTICE_IMAGE.MAX_SIZE_BYTES) {
      return createError(VALIDATION.IMAGE_TOO_LARGE.CODE, VALIDATION.IMAGE_TOO_LARGE.MESSAGE, 'image');
    }

    const typeAllowed = NOTICE_IMAGE.MIME_TYPES.some(type => type === file.type);

    if (!typeAllowed || !(await fileMatchesDeclaredType(file))) {
      return createError(VALIDATION.IMAGE_TYPE_NOT_ALLOWED.CODE, VALIDATION.IMAGE_TYPE_NOT_ALLOWED.MESSAGE, 'image');
    }

    if (!(await hasStorageRoomFor(file.size))) {
      return createError(CODES.BUSINESS.COMMON.STORAGE_FULL.CODE, CODES.BUSINESS.COMMON.STORAGE_FULL.MESSAGE, 'image');
    }

    return null;
  }

  /**
   * Map notices to DTOs, resolving every department name in one lookup rather than one per notice.
   *
   * @param notices - The stored notices.
   *
   * @returns The notices as DTOs, with department names filled in.
   */
  private async toDtoList(notices: NoticeEntity[]): Promise<NoticeDto[]> {
    const departmentIds = notices.filter(notice => notice.department).map(notice => notice.department);

    const names = new Map<string, string>();

    if (departmentIds.length > 0) {
      const departments = await Department.find({ _id: { $in: departmentIds } })
        .select('name')
        .lean<Pick<DepartmentEntity, '_id' | 'name'>[]>();

      departments.forEach(department => names.set(toId(department._id), department.name));
    }

    return notices.map(notice => noticeFromEntity(notice, notice.department ? (names.get(toId(notice.department)) ?? null) : null));
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  private noticeNotFound(): SingleResult<never> {
    return singleFailure(createError(VALIDATION.NOTICE_NOT_FOUND.CODE, VALIDATION.NOTICE_NOT_FOUND.MESSAGE));
  }
}
