import { Doctor } from '@/models/doctor.model';
import { Encounter } from '@/models/encounter.model';
import { LabOrder } from '@/models/lab-order.model';
import { LabReport } from '@/models/lab-report.model';
import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { LabOrderDto, LabReportDto, LabStatus, SessionUser, labOrderFromEntity, labReportFromEntity } from '@/types';

import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_OUTCOMES } from '@/constants/audit.const';
import { CODES } from '@/constants/codes.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { LAB_PRIORITIES, LAB_REPORT_MIME_TYPES, LAB_STATUSES } from '@/constants/lab.const';
import { NOTIFICATION_CHANNELS, NOTIFICATION_KINDS } from '@/constants/notification.const';
import { USER_ROLES } from '@/constants/roles.const';
import { STORAGE } from '@/constants/storage.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { resultReleasedContent } from '@/lib/notify';
import { ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure, singleSuccess } from '@/lib/result';
import type { LabOrderCreateOutput, LabOrderStatusOutput, LabReportCreateOutput, LabReportReleaseOutput } from '@/lib/schemas';
import { storage } from '@/lib/storage';
import type { StoredFileStream } from '@/lib/storage';
import { fileMatchesDeclaredType, toId } from '@/lib/utils';

import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { hasStorageRoomFor } from './storage.guard';

import type { DoctorEntity } from '@/models/doctor.model';
import type { EncounterEntity } from '@/models/encounter.model';
import type { LabOrderEntity } from '@/models/lab-order.model';
import type { LabReportEntity } from '@/models/lab-report.model';
import type { PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('lab.service');

const DATABASE = CODES.DATABASE.DIAGNOSTICS;
const VALIDATION = CODES.VALIDATION.DIAGNOSTICS;
const BUSINESS = CODES.BUSINESS.DIAGNOSTICS;

// The lab work list is bounded — the outstanding orders, most urgent first.
const LIST_LIMIT = 200;

// The statuses still in front of the lab: everything that is neither released nor written off.
const OPEN_WORK_STATUSES: LabStatus[] = [LAB_STATUSES.ORDERED, LAB_STATUSES.COLLECTED, LAB_STATUSES.IN_PROGRESS, LAB_STATUSES.REPORTED];

/*
  Which manual move an order may make from where it sits. `reported` and `released` are deliberately
  absent as targets — those are not moves a hand makes on the work list, they are the side effects of
  filing a report and of releasing it, so they run through `uploadReport` and `releaseReport` where
  the report itself is the evidence the move is real.
*/
const ORDER_TRANSITIONS: Record<LabStatus, LabStatus[]> = {
  ordered: [LAB_STATUSES.COLLECTED, LAB_STATUSES.CANCELLED],
  collected: [LAB_STATUSES.IN_PROGRESS, LAB_STATUSES.CANCELLED],
  'in-progress': [LAB_STATUSES.CANCELLED],
  reported: [],
  released: [],
  cancelled: [],
};

/** A lab order with the names a list shows and the report behind it, so a row needs no second query. */
export type LabOrderRow = LabOrderDto & {
  patientName: string;
  medicalRecordNo: string;
  /** The report filed for this order, if any — released or not. Null when nothing has been filed. */
  reportId: string | null;
  /** Whether that report has been released. A doctor or patient may open it only when this is true. */
  reportReleased: boolean;
};

/** A mongo duplicate-key error — the one-report-per-order index refusing a second report. */
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
}

/*
  Diagnostics — ordering lab work, and the report that comes back.

  The rules that carry weight, all here because a Server Action and a route handler are public
  endpoints the screen cannot vouch for:

  - **An order is raised into the ordering doctor's own open encounter.** Patient and encounter are
    derived from that record, never sent.
  - **A report is filed by the lab, and its file is validated by its bytes, not its name.** The
    declared type is re-checked against the file's magic number, the size against the cap, and the
    storage key it is saved under never leaves the server.
  - **Released is not uploaded.** A report reaches the ordering doctor and the patient only after it
    has been verified and released; until then it is the lab's alone. A caller outside that circle is
    told the report is *not found*, never that it exists — for a medical record, confirming existence
    is itself disclosure.
*/
export class LabService {
  private readonly notificationService = new NotificationService();
  private readonly audit = new AuditService();

  /**
   * Raise a lab order from the ordering doctor's own open encounter.
   *
   * @param input - Validated order input (an encounter id, the tests, a priority, optional notes).
   * @param byUserId - The signed-in doctor's account id.
   *
   * @returns The placed order, or a failure.
   */
  public async createOrder(input: LabOrderCreateOutput, byUserId: string): Promise<SingleResult<LabOrderDto>> {
    try {
      await connectToDatabase();

      const guard = await this.loadOrderableEncounter(input.encounterId, byUserId);
      if (!('encounter' in guard)) {
        return guard;
      }

      const created = await LabOrder.create({
        encounter: guard.encounter._id,
        patient: guard.encounter.patient,
        orderedBy: guard.encounter.doctor,
        tests: input.tests.map(test => ({ name: test.name, code: this.optionalText(test.code) })),
        priority: input.priority,
        notes: this.optionalText(input.notes),
        status: LAB_STATUSES.ORDERED,
      });

      return singleSuccess(labOrderFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Placing a lab order failed');

      return singleFailure(createError(DATABASE.LAB_ORDER_CREATE_FAILED.CODE, DATABASE.LAB_ORDER_CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * The lab orders raised in one encounter, newest first — the encounter screen's list.
   *
   * @param encounterId - The encounter.
   *
   * @returns The orders, newest first.
   */
  public async listOrdersForEncounter(encounterId: string): Promise<ListResult<LabOrderRow>> {
    try {
      await connectToDatabase();

      const orders = await LabOrder.find({ encounter: encounterId }).sort({ createdAt: -1 }).lean<LabOrderEntity[]>();

      return listSuccess(await this.enrichOrders(orders));
    } catch (error) {
      log.error({ err: error }, 'Listing lab orders for an encounter failed');

      return listFailure(createError(DATABASE.LAB_ORDER_LIST_FAILED.CODE, DATABASE.LAB_ORDER_LIST_FAILED.MESSAGE));
    }
  }

  /**
   * A doctor's lab orders, newest first — the orders they have raised, with the report behind each.
   *
   * @param doctorId - The ordering doctor.
   *
   * @returns The doctor's orders as rows.
   */
  public async listOrdersForDoctor(doctorId: string): Promise<ListResult<LabOrderRow>> {
    try {
      await connectToDatabase();

      const orders = await LabOrder.find({ orderedBy: doctorId }).sort({ createdAt: -1 }).limit(LIST_LIMIT).lean<LabOrderEntity[]>();

      return listSuccess(await this.enrichOrders(orders));
    } catch (error) {
      log.error({ err: error }, 'Listing lab orders for a doctor failed');

      return listFailure(createError(DATABASE.LAB_ORDER_LIST_FAILED.CODE, DATABASE.LAB_ORDER_LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The lab's work list — every order still in front of them, most urgent first, enriched with the
   * patient's name and record number.
   *
   * @returns The outstanding orders as rows.
   */
  public async getWorkList(): Promise<ListResult<LabOrderRow>> {
    try {
      await connectToDatabase();

      /*
        "Most urgent first" is by clinical urgency, not by the priority's spelling — a plain string
        sort would put `routine` ahead of `stat`. An urgency weight is projected (stat 0, urgent 1,
        routine 2) and the list sorts by that, then by arrival, so a `stat` draw sits above a routine
        panel booked before it. The weight is derived here rather than stored, so no order carries a
        rank that could drift from the priority beside it.
      */
      const orders = await LabOrder.aggregate<LabOrderEntity>([
        { $match: { status: { $in: OPEN_WORK_STATUSES } } },
        {
          $addFields: {
            urgencyRank: {
              $switch: {
                branches: [
                  { case: { $eq: ['$priority', LAB_PRIORITIES.STAT] }, then: 0 },
                  { case: { $eq: ['$priority', LAB_PRIORITIES.URGENT] }, then: 1 },
                ],
                default: 2,
              },
            },
          },
        },
        { $sort: { urgencyRank: 1, createdAt: 1 } },
        { $limit: LIST_LIMIT },
      ]);

      return listSuccess(await this.enrichOrders(orders));
    } catch (error) {
      log.error({ err: error }, 'Reading the lab work list failed');

      return listFailure(createError(DATABASE.LAB_ORDER_LIST_FAILED.CODE, DATABASE.LAB_ORDER_LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One lab order, by id.
   *
   * @param labOrderId - The order to read.
   *
   * @returns The order, or a failure.
   */
  public async getOrder(labOrderId: string): Promise<SingleResult<LabOrderDto>> {
    try {
      await connectToDatabase();

      const order = await LabOrder.findById(labOrderId).lean<LabOrderEntity | null>();

      if (!order) {
        return singleFailure(createError(VALIDATION.LAB_ORDER_NOT_FOUND.CODE, VALIDATION.LAB_ORDER_NOT_FOUND.MESSAGE));
      }

      return singleSuccess(labOrderFromEntity(order));
    } catch (error) {
      log.error({ err: error }, 'Reading a lab order failed');

      return singleFailure(createError(DATABASE.LAB_ORDER_FIND_FAILED.CODE, DATABASE.LAB_ORDER_FIND_FAILED.MESSAGE));
    }
  }

  /**
   * Move an order along the lab lifecycle — collected, in progress, or cancelled. Which move is
   * legal from where the order sits is enforced here; filing and releasing a report are their own
   * acts, not moves this makes.
   *
   * @param input - Validated status change.
   *
   * @returns The updated order, or a failure.
   */
  public async changeOrderStatus(input: LabOrderStatusOutput): Promise<SingleResult<LabOrderDto>> {
    try {
      await connectToDatabase();

      const order = await LabOrder.findById(input.labOrderId).lean<LabOrderEntity | null>();

      if (!order) {
        return singleFailure(createError(VALIDATION.LAB_ORDER_NOT_FOUND.CODE, VALIDATION.LAB_ORDER_NOT_FOUND.MESSAGE));
      }

      if (!ORDER_TRANSITIONS[order.status].includes(input.status)) {
        return singleFailure(createError(BUSINESS.INVALID_STATUS_TRANSITION.CODE, BUSINESS.INVALID_STATUS_TRANSITION.MESSAGE));
      }

      const update: Record<string, unknown> = { status: input.status };

      if (input.status === LAB_STATUSES.CANCELLED) {
        update.cancelledAt = new Date();
        const reason = this.optionalText(input.cancelledReason);
        if (reason !== undefined) {
          update.cancelledReason = reason;
        }
      }

      const updated = await LabOrder.findByIdAndUpdate(input.labOrderId, update, { returnDocument: 'after' }).lean<LabOrderEntity | null>();

      if (!updated) {
        return singleFailure(createError(VALIDATION.LAB_ORDER_NOT_FOUND.CODE, VALIDATION.LAB_ORDER_NOT_FOUND.MESSAGE));
      }

      return singleSuccess(labOrderFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Changing a lab order status failed');

      return singleFailure(createError(DATABASE.LAB_ORDER_UPDATE_FAILED.CODE, DATABASE.LAB_ORDER_UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * File a report against an order — the written half plus the uploaded file.
   *
   * The file is trusted by its bytes, not its name: its declared type is re-checked against its
   * magic number, its size against the cap, and it is stored under a key that never leaves the
   * server. The bytes land first and the row second; if the row (or the order move) fails, the
   * orphaned file is deleted, so a failed upload leaves nothing behind and a retry is clean.
   *
   * @param input - The written fields and the file.
   * @param uploader - The signed-in lab account.
   *
   * @returns The filed report, or a failure.
   */
  public async uploadReport(input: LabReportCreateOutput & { file: File }, uploader: SessionUser): Promise<SingleResult<LabReportDto>> {
    try {
      await connectToDatabase();

      const order = await LabOrder.findById(input.labOrderId).lean<LabOrderEntity | null>();

      if (!order) {
        return singleFailure(createError(VALIDATION.LAB_ORDER_NOT_FOUND.CODE, VALIDATION.LAB_ORDER_NOT_FOUND.MESSAGE));
      }

      if (order.status === LAB_STATUSES.REPORTED || order.status === LAB_STATUSES.RELEASED) {
        return singleFailure(createError(BUSINESS.ALREADY_REPORTED.CODE, BUSINESS.ALREADY_REPORTED.MESSAGE));
      }

      if (order.status === LAB_STATUSES.CANCELLED) {
        return singleFailure(createError(BUSINESS.INVALID_STATUS_TRANSITION.CODE, BUSINESS.INVALID_STATUS_TRANSITION.MESSAGE));
      }

      if (input.file.size === 0) {
        return singleFailure(createError(VALIDATION.FILE_REQUIRED.CODE, VALIDATION.FILE_REQUIRED.MESSAGE, 'file'));
      }

      if (input.file.size > STORAGE.MAX_FILE_SIZE_BYTES) {
        return singleFailure(createError(VALIDATION.FILE_TOO_LARGE.CODE, VALIDATION.FILE_TOO_LARGE.MESSAGE, 'file'));
      }

      // Declared type on the allow-list, and the bytes agreeing with it — the one check the client
      // cannot fake, because it reads the file's magic number rather than its name or header.
      const typeAllowed = LAB_REPORT_MIME_TYPES.some(type => type === input.file.type);
      if (!typeAllowed || !(await fileMatchesDeclaredType(input.file))) {
        return singleFailure(createError(VALIDATION.FILE_TYPE_NOT_ALLOWED.CODE, VALIDATION.FILE_TYPE_NOT_ALLOWED.MESSAGE, 'file'));
      }

      if (!(await hasStorageRoomFor(input.file.size))) {
        return singleFailure(createError(CODES.BUSINESS.COMMON.STORAGE_FULL.CODE, CODES.BUSINESS.COMMON.STORAGE_FULL.MESSAGE, 'file'));
      }

      const stored = await storage.save(input.file);

      let created: LabReportEntity;
      try {
        created = await LabReport.create({
          labOrder: order._id,
          patient: order.patient,
          performedBy: uploader.userId,
          summary: this.optionalText(input.summary),
          findings: this.optionalText(input.findings),
          file: { storageKey: stored.storageKey, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size },
        });
      } catch (error) {
        // Bytes landed but the row did not — delete the orphan so it does not sit in the bucket
        // forever, invisible and still counting against the cap.
        await storage.remove(stored.storageKey);

        if (isDuplicateKeyError(error)) {
          return singleFailure(createError(BUSINESS.ALREADY_REPORTED.CODE, BUSINESS.ALREADY_REPORTED.MESSAGE));
        }

        log.error({ err: error }, 'Saving a lab report row failed');

        return singleFailure(createError(DATABASE.LAB_REPORT_CREATE_FAILED.CODE, DATABASE.LAB_REPORT_CREATE_FAILED.MESSAGE));
      }

      /*
        The report is filed, so the order is reported. The move is conditional on the order still
        being in a pre-report state — if a cancel raced in between, the filter matches nothing and the
        whole upload rolls back rather than resurrecting a cancelled order. Any failure of this move,
        whether it throws or matches nothing, rolls the upload back — the row first, then the bytes —
        so the order is never left carrying a report it does not show, and a retry starts clean.
      */
      let moved: LabOrderEntity | null;
      try {
        moved = await LabOrder.findOneAndUpdate(
          { _id: order._id, status: { $in: [LAB_STATUSES.ORDERED, LAB_STATUSES.COLLECTED, LAB_STATUSES.IN_PROGRESS] } },
          { status: LAB_STATUSES.REPORTED },
          { returnDocument: 'after' }
        ).lean<LabOrderEntity | null>();
      } catch (error) {
        await this.rollbackReport(toId(created._id), stored.storageKey);
        log.error({ err: error }, 'Moving a lab order to reported failed');

        return singleFailure(createError(DATABASE.LAB_REPORT_CREATE_FAILED.CODE, DATABASE.LAB_REPORT_CREATE_FAILED.MESSAGE));
      }

      if (!moved) {
        await this.rollbackReport(toId(created._id), stored.storageKey);

        return singleFailure(createError(BUSINESS.ALREADY_REPORTED.CODE, BUSINESS.ALREADY_REPORTED.MESSAGE));
      }

      return singleSuccess(labReportFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Uploading a lab report failed');

      return singleFailure(createError(DATABASE.LAB_REPORT_CREATE_FAILED.CODE, DATABASE.LAB_REPORT_CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * One report's metadata (never its storage key), if the requester may see it.
   *
   * @param labReportId - The report.
   * @param requester - Who is asking.
   *
   * @returns The report DTO, or a not-found — the same answer a wrong caller and a missing report get.
   */
  public async getReport(labReportId: string, requester: SessionUser): Promise<SingleResult<LabReportDto>> {
    try {
      await connectToDatabase();

      const access = await this.loadAccessibleReport(labReportId, requester);
      if (!('report' in access)) {
        await this.audit.record({
          actor: requester,
          action: AUDIT_ACTIONS.VIEW,
          entity: AUDIT_ENTITIES.LAB_REPORT,
          entityId: labReportId,
          outcome: AUDIT_OUTCOMES.REFUSED,
        });

        return access;
      }

      await this.audit.record({
        actor: requester,
        action: AUDIT_ACTIONS.VIEW,
        entity: AUDIT_ENTITIES.LAB_REPORT,
        entityId: labReportId,
        outcome: AUDIT_OUTCOMES.GRANTED,
      });

      return singleSuccess(labReportFromEntity(access.report));
    } catch (error) {
      log.error({ err: error }, 'Reading a lab report failed');

      return singleFailure(createError(DATABASE.LAB_REPORT_FIND_FAILED.CODE, DATABASE.LAB_REPORT_FIND_FAILED.MESSAGE));
    }
  }

  /**
   * Open a report's file for download, behind the same access check as its metadata.
   *
   * Resolving the storage key to a stream happens here, after the check — which is what keeps the
   * key off the client. A wrong caller, a report with no file, or a row that has outlived its bytes
   * all return the same not-found.
   *
   * @param labReportId - The report.
   * @param requester - Who is asking (null when unauthenticated).
   *
   * @returns The file stream, or a failure.
   */
  public async openReportForDownload(labReportId: string, requester: SessionUser | null): Promise<SingleResult<StoredFileStream>> {
    try {
      if (!requester) {
        return singleFailure(createError(CODES.AUTH.COMMON.NOT_AUTHENTICATED.CODE, CODES.AUTH.COMMON.NOT_AUTHENTICATED.MESSAGE));
      }

      await connectToDatabase();

      const access = await this.loadAccessibleReport(labReportId, requester);
      if (!('report' in access)) {
        await this.audit.record({
          actor: requester,
          action: AUDIT_ACTIONS.DOWNLOAD,
          entity: AUDIT_ENTITIES.LAB_REPORT,
          entityId: labReportId,
          outcome: AUDIT_OUTCOMES.REFUSED,
        });

        return this.reportNotFound();
      }

      const file = access.report.file;
      if (!file) {
        return this.reportNotFound();
      }

      const stream = await storage.read(file.storageKey);
      if (!stream) {
        // The row outlived its bytes — report it as gone rather than as a broken download.
        return this.reportNotFound();
      }

      await this.audit.record({
        actor: requester,
        action: AUDIT_ACTIONS.DOWNLOAD,
        entity: AUDIT_ENTITIES.LAB_REPORT,
        entityId: labReportId,
        outcome: AUDIT_OUTCOMES.GRANTED,
      });

      return singleSuccess(stream);
    } catch (error) {
      log.error({ err: error }, 'Opening a lab report file failed');

      return singleFailure(createError(DATABASE.LAB_REPORT_READ_FAILED.CODE, DATABASE.LAB_REPORT_READ_FAILED.MESSAGE));
    }
  }

  /**
   * Release a report — verify it and make it visible to the ordering doctor and the patient.
   *
   * The verifier is the signed-in account, never the caller's word. A report with no file, or one
   * already released, cannot be released. Releasing also moves the order to released.
   *
   * @param input - Validated release input (the report id).
   * @param verifier - The signed-in account releasing it.
   *
   * @returns The released report, or a failure.
   */
  public async releaseReport(input: LabReportReleaseOutput, verifier: SessionUser): Promise<SingleResult<LabReportDto>> {
    try {
      await connectToDatabase();

      const report = await LabReport.findById(input.labReportId).lean<LabReportEntity | null>();

      if (!report) {
        return this.reportNotFound();
      }

      if (!report.file) {
        return singleFailure(createError(BUSINESS.REPORT_NOT_READY_TO_RELEASE.CODE, BUSINESS.REPORT_NOT_READY_TO_RELEASE.MESSAGE));
      }

      /*
        Setting the release stamp is the single-writer act: the filter releases the report only while
        it is still unreleased, so two concurrent releases cannot both stamp it and overwrite the
        verifier. A no-match means it was already released — a lost race, or a prior attempt whose
        order move failed — so we reconcile the order and report it, rather than dead-ending.
      */
      const released = await LabReport.findOneAndUpdate(
        { _id: input.labReportId, releasedAt: { $exists: false } },
        { verifiedBy: verifier.userId, releasedAt: new Date() },
        { returnDocument: 'after' }
      ).lean<LabReportEntity | null>();

      if (!released) {
        await this.moveOrderToReleased(toId(report.labOrder));

        return singleFailure(createError(BUSINESS.ALREADY_RELEASED.CODE, BUSINESS.ALREADY_RELEASED.MESSAGE));
      }

      // Releasing the report releases the order behind it. Best-effort: the report is already released
      // (the write that matters), so if this move fails the order simply stays on the work list with
      // its Release control, and clicking it again reconciles through the branch above.
      await this.moveOrderToReleased(toId(report.labOrder));

      // Best-effort: the release is what matters; the patient is told a result is ready, never what it is.
      await this.notifyResultReleased(released);

      return singleSuccess(labReportFromEntity(released));
    } catch (error) {
      log.error({ err: error }, 'Releasing a lab report failed');

      return singleFailure(createError(DATABASE.LAB_REPORT_UPDATE_FAILED.CODE, DATABASE.LAB_REPORT_UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Tell the patient a result is ready — in-app, and without naming it.
   *
   * Best-effort and swallowed: the release is the act that matters, and a notification failure must
   * not undo it. The message says a result is ready and to sign in; the result itself stays behind
   * the session, never in the notification.
   *
   * @param report - The report just released.
   */
  private async notifyResultReleased(report: LabReportEntity): Promise<void> {
    try {
      const patient = await Patient.findById(report.patient).select('user').lean<Pick<PatientEntity, 'user'> | null>();

      if (!patient) {
        return;
      }

      const content = resultReleasedContent();

      await this.notificationService.notify({
        recipientId: toId(patient.user),
        channel: NOTIFICATION_CHANNELS.IN_APP,
        kind: NOTIFICATION_KINDS.RESULT_RELEASED,
        subject: content.subject,
        body: content.body,
        relatedType: 'labReport',
        relatedId: toId(report._id),
      });
    } catch (error) {
      log.warn({ err: error }, 'Writing a result-ready notification failed');
    }
  }

  /**
   * Load a report and confirm the requester may see it, or the not-found to return in their place.
   *
   * @param labReportId - The report.
   * @param requester - Who is asking.
   *
   * @returns `{ report }` when accessible, or a `SingleResult` not-found.
   */
  private async loadAccessibleReport(labReportId: string, requester: SessionUser): Promise<{ report: LabReportEntity } | SingleResult<never>> {
    const report = await LabReport.findById(labReportId).lean<LabReportEntity | null>();

    if (!report) {
      return this.reportNotFound();
    }

    const order = await LabOrder.findById(report.labOrder).select('orderedBy').lean<Pick<LabOrderEntity, '_id' | 'orderedBy'> | null>();

    if (!(await this.mayAccessReport(report, order, requester))) {
      return this.reportNotFound();
    }

    return { report };
  }

  /**
   * Who may see a report. The lab and administration always; the ordering doctor and the owning
   * patient only once it is released. Anybody else is refused — reported to the caller as not-found.
   *
   * @param report - The report.
   * @param order - Its order (for the ordering doctor), or null when the order has gone.
   * @param requester - Who is asking.
   *
   * @returns True when the requester may see the report.
   */
  private async mayAccessReport(report: LabReportEntity, order: Pick<LabOrderEntity, 'orderedBy'> | null, requester: SessionUser): Promise<boolean> {
    if (requester.role === USER_ROLES.SUPER_ADMIN || requester.role === USER_ROLES.ADMIN || requester.role === USER_ROLES.LAB) {
      return true;
    }

    // Beyond the lab and administration, a report is visible only once released.
    if (!report.releasedAt) {
      return false;
    }

    if (requester.role === USER_ROLES.DOCTOR) {
      if (!order) {
        return false;
      }

      const doctor = await Doctor.findOne({ user: requester.userId }).select('_id').lean<Pick<DoctorEntity, '_id'> | null>();

      return doctor ? toId(order.orderedBy) === toId(doctor._id) : false;
    }

    if (requester.role === USER_ROLES.PATIENT) {
      const patient = await Patient.findOne({ user: requester.userId }).select('_id').lean<Pick<PatientEntity, '_id'> | null>();

      return patient ? toId(report.patient) === toId(patient._id) : false;
    }

    return false;
  }

  /**
   * Load an encounter a lab order may be raised against — it exists, it is open, and it is the
   * requester's own.
   *
   * @param encounterId - The encounter.
   * @param byUserId - The signed-in doctor's account id.
   *
   * @returns `{ encounter }` when orderable, or a `SingleResult` failure.
   */
  private async loadOrderableEncounter(encounterId: string, byUserId: string): Promise<{ encounter: EncounterEntity } | SingleResult<LabOrderDto>> {
    const encounter = await Encounter.findById(encounterId).lean<EncounterEntity | null>();

    if (!encounter) {
      return singleFailure(createError(VALIDATION.ENCOUNTER_NOT_FOUND.CODE, VALIDATION.ENCOUNTER_NOT_FOUND.MESSAGE));
    }

    const doctor = await Doctor.findOne({ user: byUserId }).select('_id').lean<Pick<DoctorEntity, '_id'> | null>();

    if (!doctor) {
      return singleFailure(createError(VALIDATION.NO_DOCTOR_PROFILE.CODE, VALIDATION.NO_DOCTOR_PROFILE.MESSAGE));
    }

    if (toId(encounter.doctor) !== toId(doctor._id)) {
      return singleFailure(createError(BUSINESS.NOT_YOUR_ENCOUNTER.CODE, BUSINESS.NOT_YOUR_ENCOUNTER.MESSAGE));
    }

    if (encounter.status !== ENCOUNTER_STATUSES.OPEN) {
      return singleFailure(createError(BUSINESS.ENCOUNTER_NOT_OPEN.CODE, BUSINESS.ENCOUNTER_NOT_OPEN.MESSAGE));
    }

    return { encounter };
  }

  /**
   * Attach the patient name and record number each order row shows.
   *
   * @param orders - The orders to enrich.
   *
   * @returns The rows, with names.
   */
  private async enrichOrders(orders: LabOrderEntity[]): Promise<LabOrderRow[]> {
    if (orders.length === 0) {
      return [];
    }

    const patientIds = [...new Set(orders.map(order => toId(order.patient)))];
    const patients = await Patient.find({ _id: { $in: patientIds } })
      .select('_id user medicalRecordNo')
      .lean<Pick<PatientEntity, '_id' | 'user' | 'medicalRecordNo'>[]>();

    const accounts = await User.find({ _id: { $in: patients.map(patient => patient.user) } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();

    // The report behind each order — its id and whether it has been released — so a row can link to
    // it (the lab always, a doctor only once released) without a second query per order.
    const reports = await LabReport.find({ labOrder: { $in: orders.map(order => order._id) } })
      .select('_id labOrder releasedAt')
      .lean<Pick<LabReportEntity, '_id' | 'labOrder' | 'releasedAt'>[]>();

    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));
    const patientById = new Map(patients.map(patient => [toId(patient._id), patient]));
    const reportByOrderId = new Map(reports.map(report => [toId(report.labOrder), report]));

    return orders.map(order => {
      const dto = labOrderFromEntity(order);
      const patient = patientById.get(dto.patientId);
      const report = reportByOrderId.get(dto.labOrderId);

      return {
        ...dto,
        patientName: patient ? (nameByUserId.get(toId(patient.user)) ?? '—') : '—',
        medicalRecordNo: patient?.medicalRecordNo ?? '—',
        reportId: report ? toId(report._id) : null,
        reportReleased: Boolean(report?.releasedAt),
      };
    });
  }

  /**
   * Undo a report upload — the row first, then the bytes. An orphaned file is recoverable; a row
   * pointing at bytes that were deleted is not, so the row goes first.
   *
   * @param reportId - The just-created report row.
   * @param storageKey - The stored file to remove.
   */
  private async rollbackReport(reportId: string, storageKey: string): Promise<void> {
    await LabReport.findByIdAndDelete(reportId);
    await storage.remove(storageKey);
  }

  /**
   * Move an order to released — a repeat call on an already-released order simply writes the same
   * status again. Best-effort: the report's release stamp is the write that governs visibility; this
   * only keeps the order's status denormalization in step, so its failure is logged, not surfaced.
   *
   * @param labOrderId - The order behind a released report.
   */
  private async moveOrderToReleased(labOrderId: string): Promise<void> {
    try {
      await LabOrder.findByIdAndUpdate(labOrderId, { status: LAB_STATUSES.RELEASED });
    } catch (error) {
      log.error({ err: error }, 'Moving a released report’s order to released failed');
    }
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  private reportNotFound<T>(): SingleResult<T> {
    return singleFailure(createError(VALIDATION.LAB_REPORT_NOT_FOUND.CODE, VALIDATION.LAB_REPORT_NOT_FOUND.MESSAGE));
  }
}
