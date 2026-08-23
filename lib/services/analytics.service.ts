import { Appointment } from '@/models/appointment.model';
import { Encounter } from '@/models/encounter.model';
import { Invoice } from '@/models/invoice.model';
import { LabReport } from '@/models/lab-report.model';
import { Patient } from '@/models/patient.model';
import { AnalyticsOverviewDto, AppointmentStatus, DailyCountDto, NamedCountDto, StatusCountDto } from '@/types';

import { ANALYTICS } from '@/constants/analytics.const';
import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { INVOICE_STATUSES } from '@/constants/billing.const';
import { CODES } from '@/constants/codes.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { SingleResult, createError, singleFailure, singleSuccess } from '@/lib/result';
import type { AnalyticsRangeOutput } from '@/lib/schemas';
import { toCalendarDate } from '@/lib/utils';

const log = createLoggerWithContext('analytics.service');

const DATABASE = CODES.DATABASE.COMMON;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** A window resolved to both the day-strings appointments match on and the instants timestamps do. */
type ResolvedRange = { from: string; to: string; fromDate: Date; toExclusive: Date };

/*
  The numbers the administration runs the place on.

  Two rules carry the weight. **Every figure is aggregated in the database** — a `$group` or a
  `$lookup`, never a `find()` that pulls rows into Node to count them, because a page that loads every
  appointment to count them stops working the month it matters. And **no result names a patient**:
  doctors and departments are named because they are staff, but nothing here carries a patient name or
  a medical record number, which is exactly the convenience that would leak clinical data through a
  reporting screen. Money is integer minor units; a window with nothing to average returns null, not a
  misleading zero.
*/
export class AnalyticsService {
  /**
   * The whole overview for a window, every metric aggregated in one parallel pass.
   *
   * @param range - The requested window; an empty or reversed one becomes the default.
   *
   * @returns The overview, or a failure.
   */
  public async getOverview(range: AnalyticsRangeOutput): Promise<SingleResult<AnalyticsOverviewDto>> {
    try {
      await connectToDatabase();

      const resolved = this.resolveRange(range);

      const [
        appointmentsByStatus,
        averageWaitMinutes,
        consultationsByDoctor,
        consultationsByDepartment,
        labTurnaround,
        revenue,
        newPatients,
        appointmentsPerDay,
      ] = await Promise.all([
        this.appointmentsByStatus(resolved),
        this.averageWaitMinutes(resolved),
        this.consultationsByDoctor(resolved),
        this.consultationsByDepartment(resolved),
        this.labTurnaround(resolved),
        this.revenue(resolved),
        this.newPatients(resolved),
        this.appointmentsPerDay(resolved),
      ]);

      return singleSuccess({
        range: { from: resolved.from, to: resolved.to },
        appointmentsByStatus,
        attendance: this.attendanceFrom(appointmentsByStatus),
        averageWaitMinutes,
        consultationsByDoctor,
        consultationsByDepartment,
        labTurnaroundHours: labTurnaround.hours,
        labReleasedCount: labTurnaround.count,
        revenue,
        newPatients,
        appointmentsPerDay,
      });
    } catch (error) {
      log.error({ err: error }, 'Computing the analytics overview failed');

      return singleFailure(createError(DATABASE.QUERY_FAILED.CODE, DATABASE.QUERY_FAILED.MESSAGE));
    }
  }

  /**
   * Resolve the requested window into the day-strings and instants the queries match on.
   *
   * An empty end defaults to today; an empty start to the default number of days before the end; a
   * reversed pair is swapped; and a span past the maximum is clamped from the end, so a hand-edited
   * URL cannot ask for years at once.
   *
   * @param range - The requested window.
   *
   * @returns The resolved window.
   */
  private resolveRange(range: AnalyticsRangeOutput): ResolvedRange {
    const to = range.to || toCalendarDate(new Date());

    let from = range.from;
    if (!from) {
      const start = new Date(`${to}T00:00:00.000`);
      start.setDate(start.getDate() - (ANALYTICS.DEFAULT_RANGE_DAYS - 1));
      from = toCalendarDate(start);
    }

    // A reversed range reads as a swap rather than an empty result.
    let start = from <= to ? from : to;
    const end = from <= to ? to : from;

    // Clamp an over-long span from the end, so every query stays bounded.
    const earliest = new Date(`${end}T00:00:00.000`);
    earliest.setDate(earliest.getDate() - (ANALYTICS.MAX_RANGE_DAYS - 1));
    const earliestString = toCalendarDate(earliest);
    if (start < earliestString) {
      start = earliestString;
    }

    const fromDate = new Date(`${start}T00:00:00.000`);
    const toExclusive = new Date(`${end}T00:00:00.000`);
    toExclusive.setDate(toExclusive.getDate() + 1);

    return { from: start, to: end, fromDate, toExclusive };
  }

  /**
   * Count the appointments in the window by status, on the visit day.
   *
   * @param range - The resolved window.
   *
   * @returns One row per status present.
   */
  private async appointmentsByStatus(range: ResolvedRange): Promise<StatusCountDto[]> {
    const rows = await Appointment.aggregate<{ status: AppointmentStatus; count: number }>([
      { $match: { date: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    return rows;
  }

  /**
   * Turn the status counts into the attendance figures a tile shows — done in memory over a handful of
   * already-aggregated rows, not by loading appointments.
   *
   * @param statusCounts - The per-status counts.
   *
   * @returns Attended, no-show, cancelled and the total.
   */
  private attendanceFrom(statusCounts: StatusCountDto[]): { attended: number; noShow: number; cancelled: number; total: number } {
    const countOf = (status: AppointmentStatus) => statusCounts.find(row => row.status === status)?.count ?? 0;

    return {
      attended: countOf(APPOINTMENT_STATUSES.COMPLETED),
      noShow: countOf(APPOINTMENT_STATUSES.NO_SHOW),
      cancelled: countOf(APPOINTMENT_STATUSES.CANCELLED),
      total: statusCounts.reduce((sum, row) => sum + row.count, 0),
    };
  }

  /**
   * Average minutes from a patient checking in to the doctor opening the encounter, over appointments
   * checked in during the window.
   *
   * @param range - The resolved window.
   *
   * @returns The average in minutes, or null when nothing was seen.
   */
  private async averageWaitMinutes(range: ResolvedRange): Promise<number | null> {
    const [row] = await Appointment.aggregate<{ avgMs: number }>([
      { $match: { date: { $gte: range.from, $lte: range.to }, checkedInAt: { $ne: null } } },
      { $lookup: { from: 'encounters', localField: '_id', foreignField: 'appointment', as: 'encounter' } },
      { $unwind: '$encounter' },
      { $project: { waitMs: { $subtract: ['$encounter.createdAt', '$checkedInAt'] } } },
      // A negative wait would be a clock artefact, not a real one — leave it out of the average.
      { $match: { waitMs: { $gte: 0 } } },
      { $group: { _id: null, avgMs: { $avg: '$waitMs' } } },
    ]);

    return row ? Math.round(row.avgMs / MS_PER_MINUTE) : null;
  }

  /**
   * Completed consultations in the window, grouped by doctor and named.
   *
   * @param range - The resolved window.
   *
   * @returns One row per doctor, busiest first.
   */
  private async consultationsByDoctor(range: ResolvedRange): Promise<NamedCountDto[]> {
    return Encounter.aggregate<NamedCountDto>([
      { $match: { status: ENCOUNTER_STATUSES.COMPLETED, completedAt: { $gte: range.fromDate, $lt: range.toExclusive } } },
      { $group: { _id: '$doctor', count: { $sum: 1 } } },
      { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
      { $unwind: '$doctor' },
      { $lookup: { from: 'users', localField: 'doctor.user', foreignField: '_id', as: 'account' } },
      { $unwind: '$account' },
      { $project: { id: { $toString: '$_id' }, name: '$account.name', count: 1, _id: 0 } },
      { $sort: { count: -1, name: 1 } },
      { $limit: ANALYTICS.BREAKDOWN_LIMIT },
    ]);
  }

  /**
   * Completed consultations in the window, grouped by the doctor's department and named.
   *
   * @param range - The resolved window.
   *
   * @returns One row per department, busiest first.
   */
  private async consultationsByDepartment(range: ResolvedRange): Promise<NamedCountDto[]> {
    return Encounter.aggregate<NamedCountDto>([
      { $match: { status: ENCOUNTER_STATUSES.COMPLETED, completedAt: { $gte: range.fromDate, $lt: range.toExclusive } } },
      { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doctor' } },
      { $unwind: '$doctor' },
      { $group: { _id: '$doctor.department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'department' } },
      { $unwind: '$department' },
      { $project: { id: { $toString: '$_id' }, name: '$department.name', count: 1, _id: 0 } },
      { $sort: { count: -1, name: 1 } },
      { $limit: ANALYTICS.BREAKDOWN_LIMIT },
    ]);
  }

  /**
   * Average hours from a lab order to the release of its report, over reports released in the window.
   *
   * @param range - The resolved window.
   *
   * @returns The average hours (or null) and how many were released.
   */
  private async labTurnaround(range: ResolvedRange): Promise<{ hours: number | null; count: number }> {
    // A report released in the window is released, whatever its turnaround works out to — so the count
    // is a plain count. The average is taken only over reports whose turnaround is non-negative, so a
    // clock artefact cannot drag it, but such a report still counts as released.
    const window = { $gte: range.fromDate, $lt: range.toExclusive };

    const [count, averaged] = await Promise.all([
      LabReport.countDocuments({ releasedAt: window }),
      LabReport.aggregate<{ avgMs: number }>([
        { $match: { releasedAt: window } },
        { $lookup: { from: 'laborders', localField: 'labOrder', foreignField: '_id', as: 'order' } },
        { $unwind: '$order' },
        { $project: { turnaroundMs: { $subtract: ['$releasedAt', '$order.createdAt'] } } },
        { $match: { turnaroundMs: { $gte: 0 } } },
        { $group: { _id: null, avgMs: { $avg: '$turnaroundMs' } } },
      ]),
    ]);

    return { hours: averaged[0] ? Math.round((averaged[0].avgMs / MS_PER_HOUR) * 10) / 10 : null, count };
  }

  /**
   * Revenue billed versus collected over invoices issued in the window, voided ones excluded.
   *
   * @param range - The resolved window.
   *
   * @returns The billed and collected totals in integer minor units.
   */
  private async revenue(range: ResolvedRange): Promise<{ billedMinorUnits: number; collectedMinorUnits: number }> {
    const [row] = await Invoice.aggregate<{ billed: number; collected: number }>([
      { $match: { issuedAt: { $gte: range.fromDate, $lt: range.toExclusive }, status: { $ne: INVOICE_STATUSES.VOID } } },
      { $group: { _id: null, billed: { $sum: '$totalMinorUnits' }, collected: { $sum: '$paidMinorUnits' } } },
    ]);

    return { billedMinorUnits: row?.billed ?? 0, collectedMinorUnits: row?.collected ?? 0 };
  }

  /**
   * New patient registrations in the window.
   *
   * @param range - The resolved window.
   *
   * @returns The count.
   */
  private async newPatients(range: ResolvedRange): Promise<number> {
    return Patient.countDocuments({ createdAt: { $gte: range.fromDate, $lt: range.toExclusive } });
  }

  /**
   * Appointments per day across the window — the trend line.
   *
   * @param range - The resolved window.
   *
   * @returns One row per day that held an appointment, in date order.
   */
  private async appointmentsPerDay(range: ResolvedRange): Promise<DailyCountDto[]> {
    return Appointment.aggregate<DailyCountDto>([
      { $match: { date: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
      { $sort: { date: 1 } },
    ]);
  }
}
