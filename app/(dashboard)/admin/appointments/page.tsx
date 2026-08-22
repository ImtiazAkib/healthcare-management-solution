import type { Metadata } from 'next';

import { FILTER_ALL } from '@/constants/users.const';

import { requireAdminArea } from '@/lib/auth';
import { AppointmentFiltersSchema } from '@/lib/schemas';
import { AppointmentService, DoctorService } from '@/lib/services';

import { AppointmentsScreen } from '@/components/appointments';

import { loadAppointmentsSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const appointmentService = new AppointmentService();
const doctorService = new DoctorService();

type AdminAppointmentsPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Appointments',
  robots: { index: false, follow: false },
};

export default async function AdminAppointmentsPage({ searchParams }: AdminAppointmentsPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `AppointmentFiltersSchema` catches rather than throws on
    every field, so a hand-edited query string degrades to the unfiltered list instead of
    rendering an error page.
  */
  const filters = AppointmentFiltersSchema.parse(await loadAppointmentsSearchParams(searchParams));

  const [appointments, doctorOptions] = await Promise.all([appointmentService.list(filters), doctorService.listForSelection()]);

  const total = appointments.resultInfo?.totalCount ?? appointments.result.length;
  const isFiltered = filters.doctorId !== FILTER_ALL || filters.date !== '' || filters.status !== FILTER_ALL;

  return <AppointmentsScreen rows={appointments.result} total={total} doctorOptions={doctorOptions.result} filtered={isFiltered} />;
}
