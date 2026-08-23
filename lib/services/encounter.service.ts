import { Appointment } from '@/models/appointment.model';
import { Encounter } from '@/models/encounter.model';
import { User } from '@/models/user.model';
import { EncounterDto, SessionUser, encounterFromEntity } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_OUTCOMES } from '@/constants/audit.const';
import { CODES } from '@/constants/codes.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { SingleResult, createError, singleFailure, singleSuccess } from '@/lib/result';
import type { EncounterAddendumOutput, EncounterCreateOutput, EncounterUpdateOutput } from '@/lib/schemas';
import { toId } from '@/lib/utils';

import { AppointmentService } from './appointment.service';
import { AuditService } from './audit.service';
import { DoctorService } from './doctor.service';

import type { AppointmentEntity } from '@/models/appointment.model';
import type { EncounterAttributes, EncounterEntity } from '@/models/encounter.model';
import type { UserEntity } from '@/models/user.model';
import type { UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('encounter.service');

const DATABASE = CODES.DATABASE.ENCOUNTERS;
const VALIDATION = CODES.VALIDATION.ENCOUNTERS;
const BUSINESS = CODES.BUSINESS.ENCOUNTERS;

/** One addendum with its author resolved from an account id to a name, for the record view. */
export type AddendumView = { note: string; addedBy: string; addedByName: string; addedAt: string };

/**
 * An encounter as the detail screen reads it — the record, with each addendum attributed to the
 * person who wrote it rather than to a raw account id.
 */
export type EncounterDetail = Omit<EncounterDto, 'addenda'> & { addenda: AddendumView[] };

/** A mongo duplicate-key error — the one-encounter-per-appointment index refusing a second open. */
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
}

/*
  The consultation itself, and the record it becomes.

  Two rules carry the weight, both here because a Server Action is a public endpoint the screen
  cannot vouch for:

  - **Access is by relationship, not by role.** A doctor reaches a record only through an
    appointment or encounter that links them to the patient. A doctor guessing the URL of a
    stranger's encounter is refused — the patient and the doctor on an encounter are derived from
    the appointment, never sent, and viewing is checked against the link.
  - **A completed encounter is append-only.** Its fields are editable while open, by the doctor
    who opened it; once completed, a correction is a dated **addendum**, never an overwrite. A
    record that can be silently rewritten is not one.

  The encounter owns the one transition its life rides on — opening moves the appointment to
  `in-consultation`, completing it to `completed` — and calls `AppointmentService` for the move so
  the lifecycle lives in one place.
*/
export class EncounterService {
  private readonly doctors = new DoctorService();
  private readonly appointments = new AppointmentService();
  private readonly audit = new AuditService();

  /**
   * Open an encounter from a checked-in appointment, and move the appointment into consultation.
   *
   * The patient and doctor are taken from the appointment, never the request. The appointment must
   * be checked in — a patient who has not arrived has no visit to record — and must be the
   * requester's own. The unique index on `appointment` refuses a second open as a race.
   *
   * @param input - Validated create input (an appointment id, an optional chief complaint).
   * @param requester - The signed-in doctor.
   *
   * @returns The opened encounter, or a failure.
   */
  public async open(input: EncounterCreateOutput, requester: SessionUser): Promise<SingleResult<EncounterDto>> {
    try {
      await connectToDatabase();

      const doctorId = await this.resolveDoctorId(requester);
      if (typeof doctorId !== 'string') {
        return doctorId;
      }

      const appointment = await Appointment.findById(input.appointmentId).lean<AppointmentEntity | null>();

      if (!appointment) {
        return singleFailure(createError(VALIDATION.APPOINTMENT_NOT_FOUND.CODE, VALIDATION.APPOINTMENT_NOT_FOUND.MESSAGE));
      }

      if (toId(appointment.doctor) !== doctorId) {
        return singleFailure(createError(BUSINESS.NOT_YOUR_PATIENT.CODE, BUSINESS.NOT_YOUR_PATIENT.MESSAGE));
      }

      /*
        The encounter opens from a patient who has arrived. That is `checked-in`, or already
        `in-consultation` when the doctor started the visit from the queue first — either is a
        patient in the room; anything earlier has no visit to record.
      */
      if (appointment.status !== APPOINTMENT_STATUSES.CHECKED_IN && appointment.status !== APPOINTMENT_STATUSES.IN_CONSULTATION) {
        return singleFailure(createError(BUSINESS.APPOINTMENT_NOT_CHECKED_IN.CODE, BUSINESS.APPOINTMENT_NOT_CHECKED_IN.MESSAGE));
      }

      /*
        Two writes, ordered so a failure is recoverable. The appointment move comes first — it is the
        reversible one: if it fails, nothing has been created and the doctor simply tries again. Only
        once the patient is in the room do we create the encounter, whose unique-per-appointment index
        makes it one-way. Were the order reversed, a failed move would strand an open encounter that
        blocks every re-open. Opening a checked-in appointment moves it into consultation; one already
        started from the queue is there, so the move is skipped and only the record is written.
      */
      if (appointment.status === APPOINTMENT_STATUSES.CHECKED_IN) {
        const moved = await this.appointments.changeStatus(
          { appointmentId: toId(appointment._id), status: APPOINTMENT_STATUSES.IN_CONSULTATION },
          requester.userId
        );

        if (!moved.success) {
          return singleFailure(moved.errors[0] ?? createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
        }
      }

      const created = await Encounter.create({
        appointment: appointment._id,
        patient: appointment.patient,
        doctor: doctorId,
        status: ENCOUNTER_STATUSES.OPEN,
        chiefComplaint: this.optionalText(input.chiefComplaint),
      });

      return singleSuccess(encounterFromEntity(created));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return singleFailure(createError(BUSINESS.ENCOUNTER_ALREADY_OPEN.CODE, BUSINESS.ENCOUNTER_ALREADY_OPEN.MESSAGE));
      }

      log.error({ err: error }, 'Opening an encounter failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * One encounter, viewable by any doctor related to its patient.
   *
   * @param encounterId - The encounter to read.
   * @param requester - The signed-in doctor.
   *
   * @returns The encounter, or a failure.
   */
  public async getById(encounterId: string, requester: SessionUser): Promise<SingleResult<EncounterDto>> {
    try {
      await connectToDatabase();

      const doctorId = await this.resolveDoctorId(requester);
      if (typeof doctorId !== 'string') {
        return doctorId;
      }

      const encounter = await Encounter.findById(encounterId).lean<EncounterEntity | null>();

      if (!encounter) {
        return this.notFound();
      }

      if (!(await this.isRelatedToPatient(doctorId, toId(encounter.patient)))) {
        return singleFailure(createError(BUSINESS.NOT_YOUR_PATIENT.CODE, BUSINESS.NOT_YOUR_PATIENT.MESSAGE));
      }

      return singleSuccess(encounterFromEntity(encounter));
    } catch (error) {
      log.error({ err: error }, 'Reading an encounter failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * One encounter for the record screen, with each addendum's author named.
   *
   * The same relationship gate as {@link getById} — any doctor related to the patient may read it —
   * but the addenda carry the writer's name rather than a raw account id, because a correction on a
   * clinical record is attributed to a person, not an id.
   *
   * @param encounterId - The encounter to read.
   * @param requester - The signed-in doctor.
   *
   * @returns The enriched encounter, or a failure.
   */
  public async getDetail(encounterId: string, requester: SessionUser): Promise<SingleResult<EncounterDetail>> {
    try {
      await connectToDatabase();

      const doctorId = await this.resolveDoctorId<EncounterDetail>(requester);
      if (typeof doctorId !== 'string') {
        return doctorId;
      }

      const encounter = await Encounter.findById(encounterId).lean<EncounterEntity | null>();

      if (!encounter) {
        return this.notFound<EncounterDetail>();
      }

      if (!(await this.isRelatedToPatient(doctorId, toId(encounter.patient)))) {
        await this.audit.record({
          actor: requester,
          action: AUDIT_ACTIONS.VIEW,
          entity: AUDIT_ENTITIES.ENCOUNTER,
          entityId: encounterId,
          outcome: AUDIT_OUTCOMES.REFUSED,
        });

        return singleFailure(createError(BUSINESS.NOT_YOUR_PATIENT.CODE, BUSINESS.NOT_YOUR_PATIENT.MESSAGE));
      }

      await this.audit.record({
        actor: requester,
        action: AUDIT_ACTIONS.VIEW,
        entity: AUDIT_ENTITIES.ENCOUNTER,
        entityId: encounterId,
        outcome: AUDIT_OUTCOMES.GRANTED,
      });

      const dto = encounterFromEntity(encounter);
      const addenda = await this.withAuthorNames(dto.addenda);

      return singleSuccess({ ...dto, addenda });
    } catch (error) {
      log.error({ err: error }, 'Reading an encounter detail failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Edit an open encounter's notes. Refused once it is completed — a completed encounter takes an
   * addendum, not an overwrite — and only the doctor who opened it may edit.
   *
   * @param input - Validated update input.
   * @param requester - The signed-in doctor.
   *
   * @returns The updated encounter, or a failure.
   */
  public async update(input: EncounterUpdateOutput, requester: SessionUser): Promise<SingleResult<EncounterDto>> {
    try {
      await connectToDatabase();

      const guard = await this.loadOwned(input.encounterId, requester);
      if (!('encounter' in guard)) {
        return guard;
      }

      if (guard.encounter.status === ENCOUNTER_STATUSES.COMPLETED) {
        return singleFailure(createError(BUSINESS.ENCOUNTER_LOCKED.CODE, BUSINESS.ENCOUNTER_LOCKED.MESSAGE));
      }

      const updated = await Encounter.findByIdAndUpdate(
        input.encounterId,
        this.toUpdateDocument({
          chiefComplaint: this.optionalText(input.chiefComplaint),
          examination: this.optionalText(input.examination),
          diagnoses: input.diagnoses,
          treatmentNotes: this.optionalText(input.treatmentNotes),
          followUpDate: this.optionalText(input.followUpDate),
        }),
        { returnDocument: 'after' }
      ).lean<EncounterEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(encounterFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Updating an encounter failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Add a dated addendum — the only write a completed encounter allows, and the correction offered
   * when an edit is refused. Attributed to the acting account.
   *
   * @param input - Validated addendum input.
   * @param requester - The signed-in doctor.
   *
   * @returns The encounter with the addendum, or a failure.
   */
  public async addAddendum(input: EncounterAddendumOutput, requester: SessionUser): Promise<SingleResult<EncounterDto>> {
    try {
      await connectToDatabase();

      const guard = await this.loadOwned(input.encounterId, requester);
      if (!('encounter' in guard)) {
        return guard;
      }

      const updated = await Encounter.findByIdAndUpdate(
        input.encounterId,
        { $push: { addenda: { note: input.note, addedBy: requester.userId, addedAt: new Date() } } },
        { returnDocument: 'after' }
      ).lean<EncounterEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(encounterFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Adding an addendum failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Complete an encounter, and complete the appointment behind it.
   *
   * @param encounterId - The encounter to complete.
   * @param requester - The signed-in doctor.
   *
   * @returns The completed encounter, or a failure.
   */
  public async complete(encounterId: string, requester: SessionUser): Promise<SingleResult<EncounterDto>> {
    try {
      await connectToDatabase();

      const guard = await this.loadOwned(encounterId, requester);
      if (!('encounter' in guard)) {
        return guard;
      }

      if (guard.encounter.status === ENCOUNTER_STATUSES.COMPLETED) {
        return singleFailure(createError(BUSINESS.ENCOUNTER_ALREADY_COMPLETED.CODE, BUSINESS.ENCOUNTER_ALREADY_COMPLETED.MESSAGE));
      }

      /*
        The appointment is completed first — the reversible write — and only then is the encounter
        locked. A failed move therefore leaves the encounter open and fully retryable, rather than a
        completed record stranded against a live appointment with no way back. The move is skipped
        when the appointment is already completed, so a retry after a partial run still lands: closing
        the encounter is what the retry is for.
      */
      const appointmentId = toId(guard.encounter.appointment);
      const appointment = await Appointment.findById(appointmentId).select('status').lean<Pick<AppointmentEntity, 'status'> | null>();

      if (appointment && appointment.status !== APPOINTMENT_STATUSES.COMPLETED) {
        const moved = await this.appointments.changeStatus({ appointmentId, status: APPOINTMENT_STATUSES.COMPLETED }, requester.userId);

        if (!moved.success) {
          return singleFailure(moved.errors[0] ?? createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
        }
      }

      const updated = await Encounter.findByIdAndUpdate(
        encounterId,
        { status: ENCOUNTER_STATUSES.COMPLETED, completedAt: new Date() },
        { returnDocument: 'after' }
      ).lean<EncounterEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(encounterFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Completing an encounter failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Resolve the requester's Doctor id, or the failure to return when they have no doctor record.
   *
   * @param requester - The signed-in account.
   *
   * @returns The doctor id, or a `SingleResult` failure.
   */
  private async resolveDoctorId<T = EncounterDto>(requester: SessionUser): Promise<string | SingleResult<T>> {
    const doctor = await this.doctors.findByUser(requester.userId);

    if (!doctor.result) {
      return singleFailure(createError(VALIDATION.NO_DOCTOR_PROFILE.CODE, VALIDATION.NO_DOCTOR_PROFILE.MESSAGE));
    }

    return doctor.result.doctorId;
  }

  /**
   * Load an encounter and confirm the requester is the doctor who owns it — the writer's check for
   * edit, addendum and complete. Returns the encounter or the failure to return.
   *
   * @param encounterId - The encounter.
   * @param requester - The signed-in doctor.
   *
   * @returns `{ encounter }` when owned, or a `SingleResult` failure.
   */
  private async loadOwned(encounterId: string, requester: SessionUser): Promise<{ encounter: EncounterEntity } | SingleResult<EncounterDto>> {
    const doctorId = await this.resolveDoctorId(requester);
    if (typeof doctorId !== 'string') {
      return doctorId;
    }

    const encounter = await Encounter.findById(encounterId).lean<EncounterEntity | null>();

    if (!encounter) {
      return this.notFound();
    }

    if (toId(encounter.doctor) !== doctorId) {
      return singleFailure(createError(BUSINESS.NOT_YOUR_ENCOUNTER.CODE, BUSINESS.NOT_YOUR_ENCOUNTER.MESSAGE));
    }

    return { encounter };
  }

  /**
   * Whether a doctor is related to a patient — an appointment or an encounter links them. This is
   * the relationship the whole module gates on.
   *
   * @param doctorId - The doctor.
   * @param patientId - The patient.
   *
   * @returns True when the two are linked.
   */
  private async isRelatedToPatient(doctorId: string, patientId: string): Promise<boolean> {
    const [byAppointment, byEncounter] = await Promise.all([
      Appointment.exists({ doctor: doctorId, patient: patientId }),
      Encounter.exists({ doctor: doctorId, patient: patientId }),
    ]);

    return Boolean(byAppointment) || Boolean(byEncounter);
  }

  /**
   * Resolve each addendum's author account id to a name, for the record view.
   *
   * @param addenda - The addenda as the DTO carries them, authored by account id.
   *
   * @returns The addenda with the author's name attached.
   */
  private async withAuthorNames(addenda: EncounterDto['addenda']): Promise<AddendumView[]> {
    if (addenda.length === 0) {
      return [];
    }

    const authorIds = [...new Set(addenda.map(addendum => addendum.addedBy))];
    const accounts = await User.find({ _id: { $in: authorIds } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));

    return addenda.map(addendum => ({
      note: addendum.note,
      addedBy: addendum.addedBy,
      addedByName: nameByUserId.get(addendum.addedBy) ?? '—',
      addedAt: addendum.addedAt,
    }));
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  private toUpdateDocument(fields: Record<string, unknown>): UpdateQuery<EncounterAttributes> {
    const assigned: Record<string, unknown> = {};
    const cleared: Record<string, ''> = {};

    Object.entries(fields).forEach(([field, value]) => {
      // An empty diagnoses array is a real value — the doctor cleared the list — so it is written,
      // not treated as "unset". Only undefined (a field the form did not send) clears.
      if (value === undefined) {
        cleared[field] = '';

        return;
      }

      assigned[field] = value;
    });

    return Object.keys(cleared).length > 0 ? { $set: assigned, $unset: cleared } : { $set: assigned };
  }

  private notFound<T = EncounterDto>(): SingleResult<T> {
    return singleFailure(createError(VALIDATION.ENCOUNTER_NOT_FOUND.CODE, VALIDATION.ENCOUNTER_NOT_FOUND.MESSAGE));
  }
}
