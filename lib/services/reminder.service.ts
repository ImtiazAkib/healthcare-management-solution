import { Appointment } from '@/models/appointment.model';
import { Notification } from '@/models/notification.model';
import { Patient } from '@/models/patient.model';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { NOTIFICATION_CHANNELS, NOTIFICATION_KINDS, REMINDER } from '@/constants/notification.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { appointmentReminderContent } from '@/lib/notify';
import { toCalendarDate, toId } from '@/lib/utils';

import { NotificationService } from './notification.service';

import type { AppointmentEntity } from '@/models/appointment.model';
import type { PatientEntity } from '@/models/patient.model';
import type { Types } from 'mongoose';

const log = createLoggerWithContext('reminder.service');

/** What one sweep did. */
export type ReminderSweepSummary = { examined: number; created: number };

/*
  Appointment reminders as a **sweep, not a timer**.

  The sweep finds confirmed appointments falling within the reminder window that have no reminder yet
  and writes one each — so running it twice sends one message per appointment, and missing a run sends
  it late rather than never. Idempotency is enforced twice over: the sweep skips appointments already
  reminded, and a partial unique index on the reminder rows refuses a second one under a race. It runs
  under cron or PM2; there is no in-process scheduler, because a serverless instance is not alive when
  a reminder comes due.
*/
export class ReminderService {
  private readonly notificationService = new NotificationService();

  /**
   * Run the sweep once.
   *
   * @param reference - "Now" for the window, defaulting to the real clock. Passable so a test can
   *   pin the day.
   *
   * @returns How many appointments were examined and how many reminders were newly written.
   */
  public async sweep(reference: Date = new Date()): Promise<ReminderSweepSummary> {
    await connectToDatabase();

    const windowDates = this.windowDates(reference);

    const appointments = await Appointment.find({ date: { $in: windowDates }, status: APPOINTMENT_STATUSES.CONFIRMED }).lean<AppointmentEntity[]>();

    if (appointments.length === 0) {
      return { examined: 0, created: 0 };
    }

    const appointmentIds = appointments.map(appointment => appointment._id);

    const existing = await Notification.find({ kind: NOTIFICATION_KINDS.APPOINTMENT_REMINDER, relatedId: { $in: appointmentIds } })
      .select('relatedId')
      .lean<{ relatedId: Types.ObjectId }[]>();
    const reminded = new Set(existing.map(row => String(row.relatedId)));

    const pending = appointments.filter(appointment => !reminded.has(String(appointment._id)));

    if (pending.length === 0) {
      return { examined: appointments.length, created: 0 };
    }

    const patients = await Patient.find({ _id: { $in: pending.map(appointment => appointment.patient) } })
      .select('user')
      .lean<Pick<PatientEntity, '_id' | 'user'>[]>();
    const userByPatient = new Map(patients.map(patient => [toId(patient._id), toId(patient.user)]));

    const outcomes = await Promise.all(
      pending.map(async appointment => {
        const recipientId = userByPatient.get(toId(appointment.patient));

        if (!recipientId) {
          return false;
        }

        const content = appointmentReminderContent(`${appointment.date} at ${appointment.startTime}`);

        const result = await this.notificationService.notify({
          recipientId,
          channel: NOTIFICATION_CHANNELS.EMAIL,
          kind: NOTIFICATION_KINDS.APPOINTMENT_REMINDER,
          subject: content.subject,
          body: content.body,
          relatedType: 'appointment',
          relatedId: toId(appointment._id),
          scheduledFor: new Date(`${appointment.date}T${appointment.startTime}`),
        });

        return result.success;
      })
    );

    const created = outcomes.filter(Boolean).length;

    log.info({ examined: appointments.length, created }, 'Reminder sweep complete');

    return { examined: appointments.length, created };
  }

  /**
   * The set of `YYYY-MM-DD` day-strings the window covers, from the reference day forward.
   *
   * @param reference - "Now".
   *
   * @returns The day-strings to match appointments on.
   */
  private windowDates(reference: Date): string[] {
    const days = Math.max(1, Math.ceil(REMINDER.WINDOW_HOURS / 24));
    const dates: string[] = [];

    for (let offset = 0; offset <= days; offset += 1) {
      const day = new Date(reference);
      day.setDate(day.getDate() + offset);
      dates.push(toCalendarDate(day));
    }

    return dates;
  }
}
