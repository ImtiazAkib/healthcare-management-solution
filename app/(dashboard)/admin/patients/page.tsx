import type { Metadata } from 'next';

import { requireAdminArea } from '@/lib/auth';
import { PatientFiltersSchema } from '@/lib/schemas';
import { PatientService } from '@/lib/services';

import { PatientsScreen } from '@/components/patients';

import { loadPatientsSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const patientService = new PatientService();

type AdminPatientsPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Patients',
  robots: { index: false, follow: false },
};

export default async function AdminPatientsPage({ searchParams }: AdminPatientsPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  const filters = PatientFiltersSchema.parse(await loadPatientsSearchParams(searchParams));

  const result = await patientService.list(filters);

  return <PatientsScreen patients={result.result} total={result.resultInfo?.totalCount ?? result.result.length} filtered={filters.query !== ''} />;
}
