import { Appointment } from '@/models/appointment.model';
import { Doctor } from '@/models/doctor.model';
import { Encounter } from '@/models/encounter.model';
import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { EncounterDto, PatientDetailDto, PatientSummaryDto, SessionUser, encounterFromEntity, patientSummaryFromEntities } from '@/types';

import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_OUTCOMES } from '@/constants/audit.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure } from '@/lib/result';
import { toId } from '@/lib/utils';

import { AuditService } from './audit.service';
import { DoctorService } from './doctor.service';
import { PatientService } from './patient.service';

import type { DoctorEntity } from '@/models/doctor.model';
import type { EncounterEntity } from '@/models/encounter.model';
import type { PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('medical-record.service');

const DATABASE = CODES.DATABASE.ENCOUNTERS;
const VALIDATION = CODES.VALIDATION.ENCOUNTERS;
const BUSINESS = CODES.BUSINESS.ENCOUNTERS;

/** One entry in a patient's clinical timeline — an encounter, with the doctor's name. */
export type TimelineEntry = EncounterDto & {
  doctorName: string;
};

/*
  The read facade over the clinical record — the patients a doctor may see, and the timeline behind
  each. It creates nothing; it enforces the one rule the plan is built on: **access is by
  relationship, not by role.** A doctor sees a patient only through an appointment or encounter that
  links them, so a doctor guessing a stranger's URL is refused here, never handed the record.

  The methods take the `requester` because the same timeline is read by three audiences at three
  scopes — a doctor now, a nurse and the patient in later steps — and a method that takes who is
  asking extends to them without a rewrite.
*/
export class MedicalRecordService {
  private readonly doctors = new DoctorService();
  private readonly patients = new PatientService();
  private readonly audit = new AuditService();

  /**
   * The patients a doctor has a record with, newest interaction first, optionally searched.
   *
   * @param requester - The signed-in doctor.
   * @param query - Optional search over name and record number.
   *
   * @returns The doctor's patients as list-safe summaries.
   */
  public async listMyPatients(requester: SessionUser, query: string): Promise<ListResult<PatientSummaryDto>> {
    try {
      await connectToDatabase();

      const doctorId = await this.resolveDoctorId(requester);
      if (typeof doctorId !== 'string') {
        return listFailure(doctorId.errors[0] ?? createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
      }

      const patientIds = await this.relatedPatientIds(doctorId);
      if (patientIds.length === 0) {
        return listSuccess([]);
      }

      const patients = await Patient.find({ _id: { $in: patientIds } }).lean<PatientEntity[]>();
      const accounts = await User.find({ _id: { $in: patients.map(patient => patient.user) } }).lean<UserEntity[]>();
      const accountById = new Map(accounts.map(account => [toId(account._id), account]));

      const summaries: PatientSummaryDto[] = [];
      for (const patient of patients) {
        const account = accountById.get(toId(patient.user));
        if (account) {
          summaries.push(patientSummaryFromEntities(patient, account));
        }
      }

      const trimmed = query.trim();
      const filtered = trimmed
        ? summaries.filter(
            summary =>
              summary.name.toLowerCase().includes(trimmed.toLowerCase()) || summary.medicalRecordNo.toLowerCase().includes(trimmed.toLowerCase())
          )
        : summaries;

      filtered.sort((first, second) => first.name.localeCompare(second.name));

      return listSuccess(filtered);
    } catch (error) {
      log.error({ err: error }, 'Listing a doctor patients failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One patient's full record, if the requester is related to them.
   *
   * @param patientId - The patient.
   * @param requester - The signed-in doctor.
   *
   * @returns The patient detail, or a failure — never the record when there is no relationship.
   */
  public async getPatientForDoctor(patientId: string, requester: SessionUser): Promise<SingleResult<PatientDetailDto>> {
    try {
      await connectToDatabase();

      const doctorId = await this.resolveDoctorId(requester);
      if (typeof doctorId !== 'string') {
        return singleFailure(doctorId.errors[0] ?? createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
      }

      if (!(await this.isRelatedToPatient(doctorId, patientId))) {
        // A refused access is recorded as much as a granted one — an attempt on a stranger's record is exactly what a trail is for.
        await this.audit.record({
          actor: requester,
          action: AUDIT_ACTIONS.VIEW,
          entity: AUDIT_ENTITIES.PATIENT,
          entityId: patientId,
          outcome: AUDIT_OUTCOMES.REFUSED,
        });

        return singleFailure(createError(BUSINESS.NOT_YOUR_PATIENT.CODE, BUSINESS.NOT_YOUR_PATIENT.MESSAGE));
      }

      await this.audit.record({
        actor: requester,
        action: AUDIT_ACTIONS.VIEW,
        entity: AUDIT_ENTITIES.PATIENT,
        entityId: patientId,
        outcome: AUDIT_OUTCOMES.GRANTED,
      });

      return this.patients.getDetail(patientId);
    } catch (error) {
      log.error({ err: error }, 'Reading a patient for a doctor failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * A patient's clinical timeline — their encounters, newest first — if the requester may see it.
   *
   * @param patientId - The patient.
   * @param requester - The signed-in doctor.
   *
   * @returns The timeline entries, or a failure when there is no relationship.
   */
  public async getPatientTimeline(patientId: string, requester: SessionUser): Promise<ListResult<TimelineEntry>> {
    try {
      await connectToDatabase();

      const doctorId = await this.resolveDoctorId(requester);
      if (typeof doctorId !== 'string') {
        return listFailure(doctorId.errors[0] ?? createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
      }

      if (!(await this.isRelatedToPatient(doctorId, patientId))) {
        await this.audit.record({
          actor: requester,
          action: AUDIT_ACTIONS.VIEW,
          entity: AUDIT_ENTITIES.TIMELINE,
          entityId: patientId,
          outcome: AUDIT_OUTCOMES.REFUSED,
        });

        return listFailure(createError(BUSINESS.NOT_YOUR_PATIENT.CODE, BUSINESS.NOT_YOUR_PATIENT.MESSAGE));
      }

      await this.audit.record({
        actor: requester,
        action: AUDIT_ACTIONS.VIEW,
        entity: AUDIT_ENTITIES.TIMELINE,
        entityId: patientId,
        outcome: AUDIT_OUTCOMES.GRANTED,
      });

      const encounters = await Encounter.find({ patient: patientId }).sort({ createdAt: -1 }).lean<EncounterEntity[]>();
      const entries = await this.withDoctorNames(encounters);

      return listSuccess(entries);
    } catch (error) {
      log.error({ err: error }, 'Reading a patient timeline failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * Attach the doctor's name to each encounter, joining each encounter's doctor and account.
   *
   * @param encounters - The encounters to enrich.
   *
   * @returns The timeline entries.
   */
  private async withDoctorNames(encounters: EncounterEntity[]): Promise<TimelineEntry[]> {
    if (encounters.length === 0) {
      return [];
    }

    const doctorIds = [...new Set(encounters.map(encounter => toId(encounter.doctor)))];
    const doctors = await Doctor.find({ _id: { $in: doctorIds } })
      .select('_id user')
      .lean<Pick<DoctorEntity, '_id' | 'user'>[]>();
    const accounts = await User.find({ _id: { $in: doctors.map(doctor => doctor.user) } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();

    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));
    const doctorUserById = new Map(doctors.map(doctor => [toId(doctor._id), toId(doctor.user)]));

    return encounters.map(encounter => {
      const dto = encounterFromEntity(encounter);
      const doctorUserId = doctorUserById.get(dto.doctorId);

      return { ...dto, doctorName: doctorUserId ? (nameByUserId.get(doctorUserId) ?? '—') : '—' };
    });
  }

  /**
   * The distinct patients a doctor is related to, from their appointments and encounters.
   *
   * @param doctorId - The doctor.
   *
   * @returns The patient ids.
   */
  private async relatedPatientIds(doctorId: string): Promise<string[]> {
    const [fromAppointments, fromEncounters] = await Promise.all([
      Appointment.find({ doctor: doctorId }).distinct('patient'),
      Encounter.find({ doctor: doctorId }).distinct('patient'),
    ]);

    return [...new Set([...fromAppointments, ...fromEncounters].map(id => String(id)))];
  }

  private async isRelatedToPatient(doctorId: string, patientId: string): Promise<boolean> {
    const [byAppointment, byEncounter] = await Promise.all([
      Appointment.exists({ doctor: doctorId, patient: patientId }),
      Encounter.exists({ doctor: doctorId, patient: patientId }),
    ]);

    return Boolean(byAppointment) || Boolean(byEncounter);
  }

  private async resolveDoctorId(requester: SessionUser): Promise<string | SingleResult<never>> {
    const doctor = await this.doctors.findByUser(requester.userId);

    if (!doctor.result) {
      return singleFailure(createError(VALIDATION.NO_DOCTOR_PROFILE.CODE, VALIDATION.NO_DOCTOR_PROFILE.MESSAGE));
    }

    return doctor.result.doctorId;
  }
}
