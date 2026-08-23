/*
  `actions.ts` is deliberately absent from the barrel — a `'use server'` module re-exported through a
  barrel that client components import pulls every action into their graph. The components that call
  an action import it by relative path.
*/
export * from './doctor-directory';
export * from './patient-appointments';
export * from './patient-dashboard';
export * from './patient-portal-empty';
export * from './patient-prescriptions';
export * from './patient-reports';
export * from './patient-timeline';

export type {
  DoctorDirectoryProps,
  PatientAppointmentsProps,
  PatientDashboardProps,
  PatientPortalEmptyProps,
  PatientPrescriptionsProps,
  PatientReportsProps,
  PatientTimelineProps,
  PortalAppointment,
  PortalOverview,
  PortalPrescription,
  PortalReport,
  PortalTimelineEntry,
  DoctorDirectoryDto,
} from './patient.types';
