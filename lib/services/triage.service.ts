import { Appointment } from '@/models/appointment.model';
import { AppointmentDto, appointmentFromEntity } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { SingleResult, createError, singleFailure, singleSuccess } from '@/lib/result';
import type { AppointmentTriageOutput } from '@/lib/schemas';

import type { AppointmentEntity } from '@/models/appointment.model';

const log = createLoggerWithContext('triage.service');

const DATABASE = CODES.DATABASE.VITALS;
const VALIDATION = CODES.VALIDATION.VITALS;
const BUSINESS = CODES.BUSINESS.VITALS;

/*
  Setting a patient's triage priority.

  The priority reorders the live queue ahead of token order — `compareQueueOrder` already sorts by
  it, so writing the value is the whole of the move; the queue self-heals on its next read. It is
  recorded with who set it and when, the same provenance the vitals carry, and it is only
  meaningful on a patient who has arrived, so a booking not yet checked in is refused.
*/
export class TriageService {
  /**
   * Set the triage priority for a checked-in appointment.
   *
   * @param input - Validated triage input (the appointment and the priority).
   * @param byUserId - The nurse setting it.
   *
   * @returns The updated appointment, or a failure.
   */
  public async setPriority(input: AppointmentTriageOutput, byUserId: string): Promise<SingleResult<AppointmentDto>> {
    try {
      await connectToDatabase();

      const appointment = await Appointment.findById(input.appointmentId).lean<AppointmentEntity | null>();

      if (!appointment) {
        return singleFailure(createError(VALIDATION.APPOINTMENT_NOT_FOUND.CODE, VALIDATION.APPOINTMENT_NOT_FOUND.MESSAGE));
      }

      if (appointment.status !== APPOINTMENT_STATUSES.CHECKED_IN && appointment.status !== APPOINTMENT_STATUSES.IN_CONSULTATION) {
        return singleFailure(createError(BUSINESS.NOT_CHECKED_IN.CODE, BUSINESS.NOT_CHECKED_IN.MESSAGE));
      }

      const updated = await Appointment.findByIdAndUpdate(
        input.appointmentId,
        { triagePriority: input.triagePriority, triagedBy: byUserId, triagedAt: new Date() },
        { returnDocument: 'after' }
      ).lean<AppointmentEntity | null>();

      if (!updated) {
        return singleFailure(createError(VALIDATION.APPOINTMENT_NOT_FOUND.CODE, VALIDATION.APPOINTMENT_NOT_FOUND.MESSAGE));
      }

      return singleSuccess(appointmentFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Setting triage priority failed');

      return singleFailure(createError(DATABASE.TRIAGE_FAILED.CODE, DATABASE.TRIAGE_FAILED.MESSAGE));
    }
  }
}
