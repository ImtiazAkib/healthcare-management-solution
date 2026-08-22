import { Appointment } from '@/models/appointment.model';
import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { AppointmentDto, appointmentFromEntity } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, createError, listFailure, listSuccess } from '@/lib/result';
import { compareQueueOrder, toId } from '@/lib/utils';

import type { AppointmentEntity } from '@/models/appointment.model';
import type { PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('queue.service');

const DATABASE = CODES.DATABASE.APPOINTMENTS;

/** A queue row: an appointment with the patient's name and record number. */
export type QueueEntry = AppointmentDto & {
  patientName: string;
  medicalRecordNo: string;
};

// Present in the building: checked in and waiting, or in with the doctor.
const LIVE_STATUSES = [APPOINTMENT_STATUSES.CHECKED_IN, APPOINTMENT_STATUSES.IN_CONSULTATION];

/*
  The queue is **derived, not stored**. It is the checked-in appointments for a doctor on a day,
  ordered by urgency and then by the token that records arrival — computed on every read, so it
  cannot drift from the appointments it is made of the way a second stored copy would. Nothing here
  writes; check-in and calling the next patient are status changes on `AppointmentService`, and this
  simply reads the result.
*/
export class QueueService {
  /**
   * A doctor's live queue for a day — who has arrived, most urgent first, then in arrival order.
   *
   * @param doctorId - The doctor.
   * @param date - The day, `YYYY-MM-DD`.
   *
   * @returns The queue, ordered.
   */
  public async getQueue(doctorId: string, date: string): Promise<ListResult<QueueEntry>> {
    try {
      await connectToDatabase();

      const appointments = await Appointment.find({ doctor: doctorId, date, status: { $in: LIVE_STATUSES } }).lean<AppointmentEntity[]>();
      const entries = await this.withPatientNames(appointments);

      entries.sort(compareQueueOrder);

      return listSuccess(entries);
    } catch (error) {
      log.error({ err: error }, 'Reading the queue failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The day's confirmed arrivals a doctor's patients can still be checked in from — booked and
   * not yet checked in, in appointment-time order.
   *
   * @param doctorId - The doctor.
   * @param date - The day.
   *
   * @returns The arrivals awaiting check-in.
   */
  public async getWaitingRoom(doctorId: string, date: string): Promise<ListResult<QueueEntry>> {
    try {
      await connectToDatabase();

      const appointments = await Appointment.find({ doctor: doctorId, date, status: APPOINTMENT_STATUSES.CONFIRMED })
        .sort({ startTime: 1 })
        .lean<AppointmentEntity[]>();
      const entries = await this.withPatientNames(appointments);

      return listSuccess(entries);
    } catch (error) {
      log.error({ err: error }, 'Reading the waiting room failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * Attach each appointment's patient name and record number, joining the patient and its account.
   *
   * @param appointments - The appointments to enrich.
   *
   * @returns The queue entries.
   */
  private async withPatientNames(appointments: AppointmentEntity[]): Promise<QueueEntry[]> {
    if (appointments.length === 0) {
      return [];
    }

    const patientIds = [...new Set(appointments.map(appointment => toId(appointment.patient)))];
    const patients = await Patient.find({ _id: { $in: patientIds } })
      .select('_id user medicalRecordNo')
      .lean<Pick<PatientEntity, '_id' | 'user' | 'medicalRecordNo'>[]>();

    const accounts = await User.find({ _id: { $in: patients.map(patient => patient.user) } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));
    const patientById = new Map(patients.map(patient => [toId(patient._id), patient]));

    return appointments.map(appointment => {
      const dto = appointmentFromEntity(appointment);
      const patient = patientById.get(dto.patientId);

      return {
        ...dto,
        patientName: patient ? (nameByUserId.get(toId(patient.user)) ?? '—') : '—',
        medicalRecordNo: patient?.medicalRecordNo ?? '—',
      };
    });
  }
}
