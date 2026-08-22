import { Appointment } from '@/models/appointment.model';
import { Availability } from '@/models/availability.model';
import { Counter } from '@/models/counter.model';
import { Doctor } from '@/models/doctor.model';
import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { AppointmentDto, appointmentFromEntity } from '@/types';

import { APPOINTMENT_STATUSES, SLOT_HOLDING_STATUSES } from '@/constants/appointment.const';
import { CODES } from '@/constants/codes.const';
import { FILTER_ALL } from '@/constants/users.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccessWithInfo, singleFailure, singleSuccess } from '@/lib/result';
import type { AppointmentCreateOutput, AppointmentFiltersOutput, AppointmentRescheduleOutput, AppointmentStatusOutput } from '@/lib/schemas';
import { canTransition, dayOfWeekFor, expandSlots, isSlotPast, toId } from '@/lib/utils';

import type { AppointmentAttributes, AppointmentEntity } from '@/models/appointment.model';
import type { AvailabilityEntity } from '@/models/availability.model';
import type { CounterAttributes } from '@/models/counter.model';
import type { DoctorEntity } from '@/models/doctor.model';
import type { PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter, UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('appointment.service');

const DATABASE = CODES.DATABASE.APPOINTMENTS;
const VALIDATION = CODES.VALIDATION.APPOINTMENTS;
const BUSINESS = CODES.BUSINESS.APPOINTMENTS;

// The appointments list is bounded; the total rides along so the screen can say "showing 100 of N".
const LIST_LIMIT = 100;

/** A slot a patient can be booked into: the time, and the room the doctor sits in for it. */
export type BookableSlot = {
  startTime: string;
  endTime: string;
  room?: string | null;
};

/** An appointment with the names a list shows, so a row needs no second query. */
export type AppointmentRow = AppointmentDto & {
  patientName: string;
  medicalRecordNo: string;
  doctorName: string;
};

/** A mongo duplicate-key error — the double-booking index refusing the second writer. */
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
}

/*
  Booking against real availability, and the lifecycle a booked visit moves through.

  Two rules carry the weight, both here because a Server Action is a public endpoint the screen
  cannot vouch for:

  - **A slot is bookable only if availability says it exists and nothing already holds it.** The
    picker showing a slot is not permission to take it, so the write re-checks — and the real guard
    against two people taking the same slot at once is the partial unique index on
    `{ doctor, date, startTime }`, not this check: two requests can both read "free", and the second
    insert is refused by the database, reported as "that slot was just taken" rather than a crash.
  - **Which status may follow which is the lifecycle's to say.** A counter booking starts confirmed;
    check-in assigns a token and cannot be undone into a cancellation; a no-show waits for the slot
    to pass. Every move goes through `canTransition`, so no screen can invent one.
*/
export class AppointmentService {
  /**
   * The slots a doctor can still be booked into on a date — availability minus what is taken.
   *
   * A reschedule passes its own appointment id to exclude, so the slot it currently holds is
   * offered rather than counted against itself — the write path excludes it too, and a picker that
   * hid the current time while the save accepted it would be a contradiction the user could see.
   *
   * @param doctorId - The doctor.
   * @param date - The day, `YYYY-MM-DD`.
   * @param excludeAppointmentId - An appointment to ignore when counting what is taken, or null.
   *
   * @returns The free slots, in order.
   */
  public async computeAvailableSlots(doctorId: string, date: string, excludeAppointmentId: string | null = null): Promise<ListResult<BookableSlot>> {
    try {
      await connectToDatabase();

      const slots = await this.availableSlots(doctorId, date, excludeAppointmentId);

      return listSuccessWithInfo(slots, slots.length, 0, slots.length, slots.length);
    } catch (error) {
      log.error({ err: error }, 'Computing available slots failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The appointments matching the screen's filters, newest day first, enriched with names.
   *
   * @param filters - Doctor, date and status, already validated.
   *
   * @returns The matching appointments as rows, with the total match count.
   */
  public async list(filters: AppointmentFiltersOutput): Promise<ListResult<AppointmentRow>> {
    try {
      await connectToDatabase();

      const conditions: QueryFilter<AppointmentAttributes> = {};

      if (filters.doctorId !== FILTER_ALL) {
        conditions.doctor = filters.doctorId;
      }

      if (filters.date) {
        conditions.date = filters.date;
      }

      if (filters.status !== FILTER_ALL) {
        conditions.status = filters.status;
      }

      const totalCount = await Appointment.countDocuments(conditions);
      const appointments = await Appointment.find(conditions).sort({ date: -1, startTime: 1 }).limit(LIST_LIMIT).lean<AppointmentEntity[]>();
      const rows = await this.enrich(appointments);

      return listSuccessWithInfo(rows, rows.length, 0, LIST_LIMIT, totalCount);
    } catch (error) {
      log.error({ err: error }, 'Listing appointments failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One appointment, by id.
   *
   * @param appointmentId - The appointment to read.
   *
   * @returns The appointment, or a failure.
   */
  public async getById(appointmentId: string): Promise<SingleResult<AppointmentDto>> {
    try {
      await connectToDatabase();

      const appointment = await Appointment.findById(appointmentId).lean<AppointmentEntity | null>();

      if (!appointment) {
        return this.notFound();
      }

      return singleSuccess(appointmentFromEntity(appointment));
    } catch (error) {
      log.error({ err: error }, 'Reading an appointment failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Book an appointment at the counter — confirmed at once, because reception is the confirmation.
   *
   * The end time and the department are **derived** from the doctor's availability and record, not
   * taken from the request: the client picked a start time, and everything else about the slot is
   * the hospital's to say.
   *
   * @param input - Validated booking input.
   * @param bookedById - The account making the booking.
   *
   * @returns The booked appointment, or a failure.
   */
  public async book(input: AppointmentCreateOutput, bookedById: string): Promise<SingleResult<AppointmentDto>> {
    try {
      await connectToDatabase();

      const patientExists = await Patient.exists({ _id: input.patientId });

      if (!patientExists) {
        return singleFailure(createError(VALIDATION.PATIENT_NOT_FOUND.CODE, VALIDATION.PATIENT_NOT_FOUND.MESSAGE, 'patientId'));
      }

      const doctor = await Doctor.findById(input.doctorId).select('department').lean<Pick<DoctorEntity, '_id' | 'department'> | null>();

      if (!doctor) {
        return singleFailure(createError(VALIDATION.DOCTOR_NOT_FOUND.CODE, VALIDATION.DOCTOR_NOT_FOUND.MESSAGE, 'doctorId'));
      }

      const slot = await this.findBookableSlot(input.doctorId, input.date, input.startTime, null);

      if (!slot) {
        return singleFailure(createError(BUSINESS.SLOT_NOT_AVAILABLE.CODE, BUSINESS.SLOT_NOT_AVAILABLE.MESSAGE, 'startTime'));
      }

      const created = await Appointment.create({
        patient: input.patientId,
        doctor: input.doctorId,
        department: doctor.department,
        date: input.date,
        startTime: input.startTime,
        endTime: slot.endTime,
        status: APPOINTMENT_STATUSES.CONFIRMED,
        reason: this.optionalText(input.reason),
        bookedBy: bookedById,
      });

      return singleSuccess(appointmentFromEntity(created));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return singleFailure(createError(BUSINESS.SLOT_JUST_TAKEN.CODE, BUSINESS.SLOT_JUST_TAKEN.MESSAGE, 'startTime'));
      }

      log.error({ err: error }, 'Booking an appointment failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Move an appointment to another slot — a new time, and possibly a new doctor. The patient never
   * changes. Only a booking that has not yet been checked in can move.
   *
   * @param input - Validated reschedule input.
   *
   * @returns The moved appointment, or a failure.
   */
  public async reschedule(input: AppointmentRescheduleOutput): Promise<SingleResult<AppointmentDto>> {
    try {
      await connectToDatabase();

      const target = await Appointment.findById(input.appointmentId).lean<AppointmentEntity | null>();

      if (!target) {
        return this.notFound();
      }

      if (target.status !== APPOINTMENT_STATUSES.REQUESTED && target.status !== APPOINTMENT_STATUSES.CONFIRMED) {
        return singleFailure(createError(BUSINESS.ILLEGAL_STATUS_TRANSITION.CODE, BUSINESS.ILLEGAL_STATUS_TRANSITION.MESSAGE));
      }

      const doctor = await Doctor.findById(input.doctorId).select('department').lean<Pick<DoctorEntity, '_id' | 'department'> | null>();

      if (!doctor) {
        return singleFailure(createError(VALIDATION.DOCTOR_NOT_FOUND.CODE, VALIDATION.DOCTOR_NOT_FOUND.MESSAGE, 'doctorId'));
      }

      // Exclude this appointment from the free-slot check, so re-timing it does not clash with itself.
      const slot = await this.findBookableSlot(input.doctorId, input.date, input.startTime, toId(target._id));

      if (!slot) {
        return singleFailure(createError(BUSINESS.SLOT_NOT_AVAILABLE.CODE, BUSINESS.SLOT_NOT_AVAILABLE.MESSAGE, 'startTime'));
      }

      const update: UpdateQuery<AppointmentAttributes> = {
        doctor: input.doctorId,
        department: doctor.department,
        date: input.date,
        startTime: input.startTime,
        endTime: slot.endTime,
      };

      const reason = this.optionalText(input.reason);
      if (reason === undefined) {
        update.$unset = { reason: '' };
      } else {
        update.reason = reason;
      }

      const updated = await Appointment.findByIdAndUpdate(input.appointmentId, update, { returnDocument: 'after' }).lean<AppointmentEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(appointmentFromEntity(updated));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return singleFailure(createError(BUSINESS.SLOT_JUST_TAKEN.CODE, BUSINESS.SLOT_JUST_TAKEN.MESSAGE, 'startTime'));
      }

      log.error({ err: error }, 'Rescheduling an appointment failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Move an appointment along its lifecycle, enforcing which moves are legal.
   *
   * Check-in assigns the token (atomically, per doctor per day) and stamps the arrival; a
   * cancellation records who and why; a no-show is refused until the slot has passed. A move the
   * lifecycle does not allow is a coded failure, and cancelling a checked-in patient has its own.
   *
   * @param input - Validated status change.
   * @param byUserId - The account making the change.
   *
   * @returns The updated appointment, or a failure.
   */
  public async changeStatus(input: AppointmentStatusOutput, byUserId: string): Promise<SingleResult<AppointmentDto>> {
    try {
      await connectToDatabase();

      const target = await Appointment.findById(input.appointmentId).lean<AppointmentEntity | null>();

      if (!target) {
        return this.notFound();
      }

      const next = input.status;

      if (!canTransition(target.status, next)) {
        if (
          next === APPOINTMENT_STATUSES.CANCELLED &&
          (target.status === APPOINTMENT_STATUSES.CHECKED_IN || target.status === APPOINTMENT_STATUSES.IN_CONSULTATION)
        ) {
          return singleFailure(createError(BUSINESS.CANNOT_CANCEL_AFTER_CHECK_IN.CODE, BUSINESS.CANNOT_CANCEL_AFTER_CHECK_IN.MESSAGE));
        }

        return singleFailure(createError(BUSINESS.ILLEGAL_STATUS_TRANSITION.CODE, BUSINESS.ILLEGAL_STATUS_TRANSITION.MESSAGE));
      }

      if (next === APPOINTMENT_STATUSES.NO_SHOW && !isSlotPast(target.date, target.endTime)) {
        return singleFailure(createError(BUSINESS.NO_SHOW_BEFORE_SLOT_PASSED.CODE, BUSINESS.NO_SHOW_BEFORE_SLOT_PASSED.MESSAGE));
      }

      const update: UpdateQuery<AppointmentAttributes> = { status: next };

      if (next === APPOINTMENT_STATUSES.CHECKED_IN) {
        update.tokenNo = await this.assignToken(toId(target.doctor), target.date);
        update.checkedInAt = new Date();
      }

      if (next === APPOINTMENT_STATUSES.COMPLETED) {
        update.completedAt = new Date();
      }

      if (next === APPOINTMENT_STATUSES.CANCELLED) {
        update.cancelledAt = new Date();
        update.cancelledBy = byUserId;

        const reason = this.optionalText(input.cancelledReason);
        if (reason !== undefined) {
          update.cancelledReason = reason;
        }
      }

      const updated = await Appointment.findByIdAndUpdate(input.appointmentId, update, { returnDocument: 'after' }).lean<AppointmentEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(appointmentFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Changing an appointment status failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * The free slots for a doctor on a date: availability expanded into slots, minus the ones a
   * slot-holding appointment already occupies.
   *
   * @param doctorId - The doctor.
   * @param date - The day.
   * @param excludeAppointmentId - An appointment to ignore when counting what is taken (a
   *                               reschedule ignoring its own current slot), or null.
   *
   * @returns The free slots, in start-time order.
   */
  private async availableSlots(doctorId: string, date: string, excludeAppointmentId: string | null): Promise<BookableSlot[]> {
    const dayOfWeek = dayOfWeekFor(date);

    if (!dayOfWeek) {
      return [];
    }

    const blocks = await Availability.find({
      doctor: doctorId,
      dayOfWeek,
      isActive: true,
      effectiveFrom: { $lte: date },
      $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: date } }],
    }).lean<AvailabilityForSlots[]>();

    const takenConditions: QueryFilter<AppointmentAttributes> = { doctor: doctorId, date, status: { $in: [...SLOT_HOLDING_STATUSES] } };

    if (excludeAppointmentId) {
      takenConditions._id = { $ne: excludeAppointmentId };
    }

    const taken = await Appointment.find(takenConditions).select('startTime').lean<Pick<AppointmentEntity, 'startTime'>[]>();
    const takenTimes = new Set(taken.map(appointment => appointment.startTime));

    const slots: BookableSlot[] = [];
    const seen = new Set<string>();

    for (const block of blocks) {
      for (const slot of expandSlots(block.startTime, block.endTime, block.slotMinutes)) {
        if (takenTimes.has(slot.startTime) || seen.has(slot.startTime)) {
          continue;
        }

        seen.add(slot.startTime);
        slots.push({ startTime: slot.startTime, endTime: slot.endTime, room: block.room ?? null });
      }
    }

    slots.sort((first, second) => first.startTime.localeCompare(second.startTime));

    return slots;
  }

  private async findBookableSlot(
    doctorId: string,
    date: string,
    startTime: string,
    excludeAppointmentId: string | null
  ): Promise<BookableSlot | null> {
    const slots = await this.availableSlots(doctorId, date, excludeAppointmentId);

    return slots.find(slot => slot.startTime === startTime) ?? null;
  }

  /**
   * The next token for a doctor on a date, from an atomic counter keyed by both.
   *
   * The same `$inc` that mints a record number: two nurses checking two patients in at once are
   * handed two consecutive numbers rather than reading the same count and both writing it. Keyed
   * per doctor per day, so each doctor's day starts again at one.
   *
   * @param doctorId - The doctor whose queue the token belongs to.
   * @param date - The day.
   *
   * @returns The token number, from 1.
   */
  private async assignToken(doctorId: string, date: string): Promise<number> {
    const key = `appointment-token-${doctorId}-${date}`;

    const counter = await Counter.findByIdAndUpdate(
      key,
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean<CounterAttributes | null>();

    if (!counter) {
      throw new Error(`Failed to advance the token counter "${key}".`);
    }

    return counter.seq;
  }

  /**
   * Attach the patient and doctor names a list shows, joining each appointment's patient (and its
   * account) and doctor (and its account) in one round trip apiece.
   *
   * @param appointments - The appointments to enrich.
   *
   * @returns The rows, with names.
   */
  private async enrich(appointments: AppointmentEntity[]): Promise<AppointmentRow[]> {
    if (appointments.length === 0) {
      return [];
    }

    const patientIds = [...new Set(appointments.map(appointment => toId(appointment.patient)))];
    const doctorIds = [...new Set(appointments.map(appointment => toId(appointment.doctor)))];

    const [patients, doctors] = await Promise.all([
      Patient.find({ _id: { $in: patientIds } })
        .select('_id user medicalRecordNo')
        .lean<Pick<PatientEntity, '_id' | 'user' | 'medicalRecordNo'>[]>(),
      Doctor.find({ _id: { $in: doctorIds } })
        .select('_id user')
        .lean<Pick<DoctorEntity, '_id' | 'user'>[]>(),
    ]);

    const accountIds = [...patients.map(patient => patient.user), ...doctors.map(doctor => doctor.user)];
    const accounts = await User.find({ _id: { $in: accountIds } })
      .select('_id name')
      .lean<Pick<UserEntity, '_id' | 'name'>[]>();
    const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));

    const patientById = new Map(patients.map(patient => [toId(patient._id), patient]));
    const doctorUserById = new Map(doctors.map(doctor => [toId(doctor._id), toId(doctor.user)]));

    return appointments.map(appointment => {
      const dto = appointmentFromEntity(appointment);
      const patient = patientById.get(dto.patientId);
      const doctorUserId = doctorUserById.get(dto.doctorId);

      return {
        ...dto,
        patientName: patient ? (nameByUserId.get(toId(patient.user)) ?? '—') : '—',
        medicalRecordNo: patient?.medicalRecordNo ?? '—',
        doctorName: doctorUserId ? (nameByUserId.get(doctorUserId) ?? '—') : '—',
      };
    });
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  private notFound(): SingleResult<AppointmentDto> {
    return singleFailure(createError(VALIDATION.APPOINTMENT_NOT_FOUND.CODE, VALIDATION.APPOINTMENT_NOT_FOUND.MESSAGE));
  }
}

/** The availability fields the slot computation reads. */
type AvailabilityForSlots = Pick<AvailabilityEntity, 'startTime' | 'endTime' | 'slotMinutes' | 'room'>;
