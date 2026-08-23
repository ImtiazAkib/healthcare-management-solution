import { AppointmentStatus } from './appointment-status';

/** The window every figure is measured over — inclusive `YYYY-MM-DD` day-strings. */
export type AnalyticsRangeDto = {
  from: string;
  to: string;
};

/** One status and how many appointments held it in the window. */
export type StatusCountDto = {
  status: AppointmentStatus;
  count: number;
};

/** How a doctor's, or a department's, consultations totalled — named, because a doctor is not a patient. */
export type NamedCountDto = {
  id: string;
  name: string;
  count: number;
};

/** One day and its appointment count, for the trend line. */
export type DailyCountDto = {
  date: string;
  count: number;
};

/**
 * What the administration needs to run the place, every figure aggregated in the database over a date
 * range and none of it naming a patient. A doctor and a department are named — they are staff, not
 * patients — but no medical record number or patient name appears anywhere here, because analytics is
 * exactly where clinical data most easily leaks as a convenience.
 *
 * Money is integer minor units, formatted once at the edge. A null average means the window held
 * nothing to average, which a tile states rather than showing a misleading zero.
 */
export type AnalyticsOverviewDto = {
  range: AnalyticsRangeDto;
  appointmentsByStatus: StatusCountDto[];
  attendance: { attended: number; noShow: number; cancelled: number; total: number };
  /** Average minutes from check-in to the doctor opening the encounter; null when nothing was seen. */
  averageWaitMinutes: number | null;
  consultationsByDoctor: NamedCountDto[];
  consultationsByDepartment: NamedCountDto[];
  /** Average hours from a lab order to its report's release; null when nothing was released. */
  labTurnaroundHours: number | null;
  labReleasedCount: number;
  revenue: { billedMinorUnits: number; collectedMinorUnits: number };
  newPatients: number;
  appointmentsPerDay: DailyCountDto[];
};
