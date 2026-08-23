import type { PortalAppointment, PortalOverview, PortalPrescription, PortalReport, PortalTimelineEntry } from '@/lib/services';

import type { DoctorDirectoryDto } from '@/types';
import type { LucideIcon } from 'lucide-react';

/*
  The portal's view types, re-exported under the feature so its components share one name for each
  shape rather than each reaching into the service or the type layer for it.
*/
export type { DoctorDirectoryDto } from '@/types';
export type { PortalAppointment, PortalOverview, PortalPrescription, PortalReport, PortalTimelineEntry } from '@/lib/services';

/** A reusable "nothing here yet" empty state for a portal area. */
export type PatientPortalEmptyProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

/** The read-only list of the patient's own appointments. */
export type PatientAppointmentsProps = {
  appointments: PortalAppointment[];
};

/** The patient's completed-visit timeline, newest first. */
export type PatientTimelineProps = {
  entries: PortalTimelineEntry[];
};

/** The patient's prescriptions, newest first. */
export type PatientPrescriptionsProps = {
  prescriptions: PortalPrescription[];
};

/** The patient's released test results, newest first. */
export type PatientReportsProps = {
  reports: PortalReport[];
};

/** The doctor directory a patient chooses from. */
export type DoctorDirectoryProps = {
  doctors: DoctorDirectoryDto[];
};

/** The portal dashboard overview. */
export type PatientDashboardProps = {
  overview: PortalOverview;
};
