import { Appointment } from '@/models/appointment.model';
import { AppointmentDto, appointmentFromEntity } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { SingleResult, createError, singleFailure, singleSuccess } from '@/lib/result';
import type { VitalsRecordOutput } from '@/lib/schemas';

import type { AppointmentEntity } from '@/models/appointment.model';

const log = createLoggerWithContext('vitals.service');

const DATABASE = CODES.DATABASE.VITALS;
const VALIDATION = CODES.VALIDATION.VITALS;
const BUSINESS = CODES.BUSINESS.VITALS;

/*
  Recording the vitals a nurse takes at check-in.

  The readings live on the appointment, not the encounter — a nurse takes them before the doctor
  opens anything to hang them on — and they carry their own recorder and timestamp, so a value read
  later on the doctor's screen still says who took it and when. The plausible ranges are enforced by
  the schema and again by the model; this only refuses a booking that has not arrived, since vitals
  are a reading of a patient in the room. Re-recording replaces the set and re-stamps it.
*/
export class VitalsService {
  /**
   * Record (or re-record) the vitals for a checked-in appointment.
   *
   * @param input - Validated readings (each optional — blank means "not taken", never zero).
   * @param recordedByUserId - The account taking the readings.
   *
   * @returns The updated appointment, or a failure.
   */
  public async recordVitals(input: VitalsRecordOutput, recordedByUserId: string): Promise<SingleResult<AppointmentDto>> {
    try {
      await connectToDatabase();

      const appointment = await Appointment.findById(input.appointmentId).lean<AppointmentEntity | null>();

      if (!appointment) {
        return singleFailure(createError(VALIDATION.APPOINTMENT_NOT_FOUND.CODE, VALIDATION.APPOINTMENT_NOT_FOUND.MESSAGE));
      }

      if (appointment.status !== APPOINTMENT_STATUSES.CHECKED_IN && appointment.status !== APPOINTMENT_STATUSES.IN_CONSULTATION) {
        return singleFailure(createError(BUSINESS.NOT_CHECKED_IN.CODE, BUSINESS.NOT_CHECKED_IN.MESSAGE));
      }

      // Replace the whole vitals set — a re-record supersedes the last one and re-stamps its provenance.
      // Undefined readings are dropped on write and read back as "not taken".
      const vitals = {
        systolic: input.systolic,
        diastolic: input.diastolic,
        pulse: input.pulse,
        temperature: input.temperature,
        respiratoryRate: input.respiratoryRate,
        oxygenSaturation: input.oxygenSaturation,
        weight: input.weight,
        height: input.height,
        recordedBy: recordedByUserId,
        recordedAt: new Date(),
      };

      const updated = await Appointment.findByIdAndUpdate(
        input.appointmentId,
        { vitals },
        { returnDocument: 'after' }
      ).lean<AppointmentEntity | null>();

      if (!updated) {
        return singleFailure(createError(VALIDATION.APPOINTMENT_NOT_FOUND.CODE, VALIDATION.APPOINTMENT_NOT_FOUND.MESSAGE));
      }

      return singleSuccess(appointmentFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Recording vitals failed');

      return singleFailure(createError(DATABASE.RECORD_FAILED.CODE, DATABASE.RECORD_FAILED.MESSAGE));
    }
  }
}
