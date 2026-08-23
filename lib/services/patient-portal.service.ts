import { Appointment } from '@/models/appointment.model';
import { Availability } from '@/models/availability.model';
import { Department } from '@/models/department.model';
import { Doctor } from '@/models/doctor.model';
import { Encounter } from '@/models/encounter.model';
import { LabOrder } from '@/models/lab-order.model';
import { LabReport } from '@/models/lab-report.model';
import { Patient } from '@/models/patient.model';
import { Prescription } from '@/models/prescription.model';
import { User } from '@/models/user.model';
import {
  AppointmentDto,
  DoctorDirectoryDto,
  PatientDetailDto,
  PrescriptionDto,
  SessionUser,
  appointmentFromEntity,
  availabilityFromEntity,
  doctorDirectoryFromParts,
  doctorFromEntity,
  encounterFromEntity,
  prescriptionFromEntity,
} from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { CODES } from '@/constants/codes.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ErrorDto, ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure, singleSuccess } from '@/lib/result';
import type { AppointmentSelfBookOutput } from '@/lib/schemas';
import { toId } from '@/lib/utils';

import { AppointmentService, BookableSlot } from './appointment.service';
import { PatientService } from './patient.service';
import { PrescriptionService, PrescriptionDetail } from './prescription.service';

import type { AppointmentEntity } from '@/models/appointment.model';
import type { AvailabilityEntity } from '@/models/availability.model';
import type { DepartmentEntity } from '@/models/department.model';
import type { DoctorEntity } from '@/models/doctor.model';
import type { EncounterEntity } from '@/models/encounter.model';
import type { LabOrderEntity } from '@/models/lab-order.model';
import type { LabReportEntity } from '@/models/lab-report.model';
import type { PatientEntity } from '@/models/patient.model';
import type { PrescriptionEntity } from '@/models/prescription.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('patient-portal.service');

const DATABASE = CODES.DATABASE.PORTAL;
const VALIDATION = CODES.VALIDATION.PORTAL;

/** A patient's appointment, with the doctor and department named for the row. */
export type PortalAppointment = AppointmentDto & { doctorName: string; departmentName: string };

/** A patient's prescription, with the prescriber named. */
export type PortalPrescription = PrescriptionDto & { doctorName: string };

/** One completed encounter on the patient's timeline, with the doctor named. */
export type PortalTimelineEntry = ReturnType<typeof encounterFromEntity> & { doctorName: string };

/** A released report as the patient reads it — the tests, when it came out, and the file to open. No storage key. */
export type PortalReport = {
  labReportId: string;
  labOrderId: string;
  releasedAt: string;
  tests: { name: string; code?: string | null }[];
  summary?: string | null;
  file: { fileName: string; mimeType: string; size: number } | null;
};

/** The dashboard: who the patient is, their next visit, and how much sits behind each area. */
export type PortalOverview = {
  patient: PatientDetailDto;
  nextAppointment: PortalAppointment | null;
  upcomingCount: number;
  prescriptionCount: number;
  reportCount: number;
};

/*
  Everything a patient is allowed to read, and the one thing they may do — book their own visit.

  The rule the whole surface is built on: **the current patient is resolved from the session, never
  from the request.** There is no method here that takes a patient id from the caller; each resolves
  the patient from the signed-in account and scopes every read to it. A patient reaching for another
  patient's prescription or report by id is answered with the same not-found a missing one gets, so
  the portal discloses nothing about records that are not theirs. The visibility filters the portal
  applies — completed encounters, released reports, issued prescriptions — are the difference between
  a record and a diagnosis in progress.
*/
export class PatientPortalService {
  private readonly appointmentService = new AppointmentService();
  private readonly prescriptionService = new PrescriptionService();
  private readonly patientService = new PatientService();

  /**
   * The signed-in patient's own record, resolved from the session.
   *
   * @param session - The signed-in account.
   *
   * @returns The patient detail, or a failure when the account has no record.
   */
  public async getMyProfile(session: SessionUser): Promise<SingleResult<PatientDetailDto>> {
    return this.patientService.findByUser(session.userId);
  }

  /**
   * The patient's dashboard — their profile, their next appointment, and the counts behind each area.
   *
   * @param session - The signed-in patient.
   *
   * @returns The overview, or a failure.
   */
  public async getOverview(session: SessionUser): Promise<SingleResult<PortalOverview>> {
    try {
      await connectToDatabase();

      const self = await this.resolveSelf(session);
      if (typeof self !== 'string') {
        return singleFailure(self);
      }

      const profile = await this.patientService.findByUser(session.userId);
      if (!profile.result) {
        return singleFailure(
          profile.errors[0] ?? createError(VALIDATION.PATIENT_PROFILE_NOT_FOUND.CODE, VALIDATION.PATIENT_PROFILE_NOT_FOUND.MESSAGE)
        );
      }

      const appointments = await Appointment.find({ patient: self }).lean<AppointmentEntity[]>();
      const upcoming = appointments
        .filter(appointment => this.isUpcoming(appointment))
        .sort((first, second) => `${first.date} ${first.startTime}`.localeCompare(`${second.date} ${second.startTime}`));

      const [nextAppointment] = await this.enrichAppointments(upcoming.slice(0, 1));
      const [prescriptionCount, reportCount] = await Promise.all([
        Prescription.countDocuments({ patient: self }),
        LabReport.countDocuments({ patient: self, releasedAt: { $exists: true } }),
      ]);

      return singleSuccess({
        patient: profile.result,
        nextAppointment: nextAppointment ?? null,
        upcomingCount: upcoming.length,
        prescriptionCount,
        reportCount,
      });
    } catch (error) {
      log.error({ err: error }, 'Reading the patient overview failed');

      return singleFailure(createError(DATABASE.OVERVIEW_FAILED.CODE, DATABASE.OVERVIEW_FAILED.MESSAGE));
    }
  }

  /**
   * The patient's own appointments, newest day first.
   *
   * @param session - The signed-in patient.
   *
   * @returns The appointments as rows.
   */
  public async listMyAppointments(session: SessionUser): Promise<ListResult<PortalAppointment>> {
    try {
      await connectToDatabase();

      const self = await this.resolveSelf(session);
      if (typeof self !== 'string') {
        return listFailure(self);
      }

      const appointments = await Appointment.find({ patient: self }).sort({ date: -1, startTime: 1 }).lean<AppointmentEntity[]>();

      return listSuccess(await this.enrichAppointments(appointments));
    } catch (error) {
      log.error({ err: error }, 'Listing the patient appointments failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The patient's clinical timeline — their **completed** encounters, newest first. An encounter
   * still open is a visit in progress, not a record, so it is not shown.
   *
   * @param session - The signed-in patient.
   *
   * @returns The timeline entries.
   */
  public async getMyTimeline(session: SessionUser): Promise<ListResult<PortalTimelineEntry>> {
    try {
      await connectToDatabase();

      const self = await this.resolveSelf(session);
      if (typeof self !== 'string') {
        return listFailure(self);
      }

      const encounters = await Encounter.find({ patient: self, status: ENCOUNTER_STATUSES.COMPLETED })
        .sort({ createdAt: -1 })
        .lean<EncounterEntity[]>();
      const doctorNames = await this.doctorNames(encounters.map(encounter => toId(encounter.doctor)));

      const entries = encounters.map(encounter => {
        const dto = encounterFromEntity(encounter);

        return { ...dto, doctorName: doctorNames.get(dto.doctorId) ?? '—' };
      });

      return listSuccess(entries);
    } catch (error) {
      log.error({ err: error }, 'Reading the patient timeline failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The patient's prescriptions, newest first — all issued, the superseded ones marked so.
   *
   * @param session - The signed-in patient.
   *
   * @returns The prescriptions as rows.
   */
  public async listMyPrescriptions(session: SessionUser): Promise<ListResult<PortalPrescription>> {
    try {
      await connectToDatabase();

      const self = await this.resolveSelf(session);
      if (typeof self !== 'string') {
        return listFailure(self);
      }

      const prescriptions = await Prescription.find({ patient: self }).sort({ issuedAt: -1 }).lean<PrescriptionEntity[]>();
      const doctorNames = await this.doctorNames(prescriptions.map(prescription => toId(prescription.doctor)));

      const rows = prescriptions.map(prescription => {
        const dto = prescriptionFromEntity(prescription);

        return { ...dto, doctorName: doctorNames.get(dto.doctorId) ?? '—' };
      });

      return listSuccess(rows);
    } catch (error) {
      log.error({ err: error }, 'Listing the patient prescriptions failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One of the patient's prescriptions in full — refused (as not-found) if it is not theirs.
   *
   * @param prescriptionId - The prescription.
   * @param session - The signed-in patient.
   *
   * @returns The prescription detail, or a not-found.
   */
  public async getMyPrescription(prescriptionId: string, session: SessionUser): Promise<SingleResult<PrescriptionDetail>> {
    const detail = await this.prescriptionService.getDetail(prescriptionId);

    if (!detail.result) {
      return detail;
    }

    // A prescription that is not the signed-in patient's own is answered as not-found, never shown.
    const self = await this.resolveSelf(session);
    if (typeof self !== 'string' || detail.result.patientId !== self) {
      return singleFailure(
        createError(CODES.VALIDATION.PRESCRIPTIONS.PRESCRIPTION_NOT_FOUND.CODE, CODES.VALIDATION.PRESCRIPTIONS.PRESCRIPTION_NOT_FOUND.MESSAGE)
      );
    }

    return detail;
  }

  /**
   * The patient's **released** reports, newest first. An unreleased report is a result still being
   * checked, invisible to the patient until the lab releases it.
   *
   * @param session - The signed-in patient.
   *
   * @returns The released reports.
   */
  public async listMyReleasedReports(session: SessionUser): Promise<ListResult<PortalReport>> {
    try {
      await connectToDatabase();

      const self = await this.resolveSelf(session);
      if (typeof self !== 'string') {
        return listFailure(self);
      }

      const reports = await LabReport.find({ patient: self, releasedAt: { $exists: true } })
        .sort({ releasedAt: -1 })
        .lean<LabReportEntity[]>();

      if (reports.length === 0) {
        return listSuccess([]);
      }

      const orders = await LabOrder.find({ _id: { $in: reports.map(report => report.labOrder) } })
        .select('_id tests')
        .lean<Pick<LabOrderEntity, '_id' | 'tests'>[]>();
      const testsByOrderId = new Map(orders.map(order => [toId(order._id), order.tests]));

      const rows: PortalReport[] = reports.map(report => ({
        labReportId: toId(report._id),
        labOrderId: toId(report.labOrder),
        releasedAt: report.releasedAt ? report.releasedAt.toISOString() : '',
        tests: (testsByOrderId.get(toId(report.labOrder)) ?? []).map(test => ({ name: test.name, code: test.code ?? null })),
        summary: report.summary ?? null,
        file: report.file ? { fileName: report.file.fileName, mimeType: report.file.mimeType, size: report.file.size } : null,
      }));

      return listSuccess(rows);
    } catch (error) {
      log.error({ err: error }, 'Listing the patient reports failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The doctor directory a patient chooses from — every doctor with their department and sitting
   * hours, and nothing personal.
   *
   * @returns The directory.
   */
  public async listDoctorDirectory(): Promise<ListResult<DoctorDirectoryDto>> {
    try {
      await connectToDatabase();

      const doctors = await Doctor.find().sort({ specialization: 1 }).lean<DoctorEntity[]>();

      if (doctors.length === 0) {
        return listSuccess([]);
      }

      const accounts = await User.find({ _id: { $in: doctors.map(doctor => doctor.user) } })
        .select('_id name')
        .lean<Pick<UserEntity, '_id' | 'name'>[]>();
      const departments = await Department.find({ _id: { $in: doctors.map(doctor => doctor.department) } })
        .select('_id name')
        .lean<Pick<DepartmentEntity, '_id' | 'name'>[]>();
      const blocks = await Availability.find({ doctor: { $in: doctors.map(doctor => doctor._id) }, isActive: true }).lean<AvailabilityEntity[]>();

      const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));
      const departmentNameById = new Map(departments.map(department => [toId(department._id), department.name]));
      const blocksByDoctorId = new Map<string, AvailabilityEntity[]>();
      for (const block of blocks) {
        const key = toId(block.doctor);
        blocksByDoctorId.set(key, [...(blocksByDoctorId.get(key) ?? []), block]);
      }

      const directory = doctors.map(doctor => {
        const dto = doctorFromEntity(doctor);

        return doctorDirectoryFromParts(
          dto,
          nameByUserId.get(dto.userId) ?? '—',
          departmentNameById.get(dto.departmentId) ?? '—',
          (blocksByDoctorId.get(dto.doctorId) ?? []).map(block => availabilityFromEntity(block))
        );
      });

      return listSuccess(directory);
    } catch (error) {
      log.error({ err: error }, 'Reading the doctor directory failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The free slots for a doctor on a date — the patient's own slot picker.
   *
   * @param doctorId - The doctor.
   * @param date - The day.
   *
   * @returns The bookable slots.
   */
  public async computeSlotsForSelf(doctorId: string, date: string): Promise<ListResult<BookableSlot>> {
    return this.appointmentService.computeAvailableSlots(doctorId, date);
  }

  /**
   * Book an appointment for the signed-in patient.
   *
   * The patient is pinned from the session and is both the patient and the booker — a request cannot
   * name whom the booking is for. The service still re-checks the slot against the doctor's
   * availability and derives the department and end time itself.
   *
   * @param input - Validated self-book input (no patient id).
   * @param session - The signed-in patient.
   *
   * @returns The booked appointment, or a failure.
   */
  public async bookForSelf(input: AppointmentSelfBookOutput, session: SessionUser): Promise<SingleResult<AppointmentDto>> {
    await connectToDatabase();

    const self = await this.resolveSelf(session);
    if (typeof self !== 'string') {
      return singleFailure(self);
    }

    // The department comes from the doctor, never the patient — the same value `book` derives, resolved
    // here only to satisfy the booking input. `book` re-checks the slot and derives the end time itself.
    const doctor = await Doctor.findById(input.doctorId).select('department').lean<Pick<DoctorEntity, '_id' | 'department'> | null>();
    const departmentId = doctor ? toId(doctor.department) : input.doctorId;

    return this.appointmentService.book({ ...input, patientId: self, departmentId }, session.userId);
  }

  /**
   * Resolve the signed-in patient's own record id from their account.
   *
   * @param session - The signed-in account.
   *
   * @returns The patient id, or the error to return when the account has no record.
   */
  private async resolveSelf(session: SessionUser): Promise<string | ErrorDto> {
    const patient = await Patient.findOne({ user: session.userId }).select('_id').lean<Pick<PatientEntity, '_id'> | null>();

    if (!patient) {
      return createError(VALIDATION.PATIENT_PROFILE_NOT_FOUND.CODE, VALIDATION.PATIENT_PROFILE_NOT_FOUND.MESSAGE);
    }

    return toId(patient._id);
  }

  /**
   * Whether an appointment is still ahead — booked or in progress, not finished or written off.
   *
   * @param appointment - The appointment.
   *
   * @returns True when it is upcoming.
   */
  private isUpcoming(appointment: AppointmentEntity): boolean {
    return (
      appointment.status !== APPOINTMENT_STATUSES.COMPLETED &&
      appointment.status !== APPOINTMENT_STATUSES.CANCELLED &&
      appointment.status !== APPOINTMENT_STATUSES.NO_SHOW
    );
  }

  /**
   * Attach the doctor and department names each appointment row shows.
   *
   * @param appointments - The appointments to enrich.
   *
   * @returns The rows, with names.
   */
  private async enrichAppointments(appointments: AppointmentEntity[]): Promise<PortalAppointment[]> {
    if (appointments.length === 0) {
      return [];
    }

    const doctorNames = await this.doctorNames(appointments.map(appointment => toId(appointment.doctor)));
    const departments = await Department.find({ _id: { $in: [...new Set(appointments.map(appointment => toId(appointment.department)))] } })
      .select('_id name')
      .lean<Pick<DepartmentEntity, '_id' | 'name'>[]>();
    const departmentNameById = new Map(departments.map(department => [toId(department._id), department.name]));

    return appointments.map(appointment => {
      const dto = appointmentFromEntity(appointment);

      return { ...dto, doctorName: doctorNames.get(dto.doctorId) ?? '—', departmentName: departmentNameById.get(dto.departmentId) ?? '—' };
    });
  }

  /**
   * Resolve doctor ids to their account names, joining each doctor to its user.
   *
   * @param doctorIds - The doctor ids.
   *
   * @returns A map of doctor id to name.
   */
  private async doctorNames(doctorIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(doctorIds)];

    if (unique.length === 0) {
      return new Map();
    }

    const doctors = await Doctor.find({ _id: { $in: unique } })
      .select('_id user')
      .lean<Pick<DoctorEntity, '_id' | 'user'>[]>();
    const accounts = await User.find({ _id: { $in: doctors.map(doctor => doctor.user) } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));

    return new Map(doctors.map(doctor => [toId(doctor._id), nameByUserId.get(toId(doctor.user)) ?? '—']));
  }
}
