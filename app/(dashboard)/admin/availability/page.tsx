import type { Metadata } from 'next';

import { FILTER_ALL } from '@/constants/users.const';

import { requireAdminArea } from '@/lib/auth';
import { AvailabilityFiltersSchema } from '@/lib/schemas';
import { AvailabilityService, DoctorService } from '@/lib/services';

import { AvailabilityScreen } from '@/components/availability';

import { loadAvailabilitySearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const availabilityService = new AvailabilityService();
const doctorService = new DoctorService();

type AdminAvailabilityPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Availability',
  robots: { index: false, follow: false },
};

export default async function AdminAvailabilityPage({ searchParams }: AdminAvailabilityPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `AvailabilityFiltersSchema` catches rather than throws on
    every field, so a hand-edited query string degrades to the unfiltered week instead of
    rendering an error page.
  */
  const filters = AvailabilityFiltersSchema.parse(await loadAvailabilitySearchParams(searchParams));

  const [blocks, doctorOptions] = await Promise.all([availabilityService.list(filters), doctorService.listForSelection()]);

  /*
    Id → name, built once here so each block in the week can show its doctor by name without a
    second query. A doctor whose account has since gone is not in this set, so the block falls
    back to "—" — a display gap, not a lost link, since the id is still stored.
  */
  const doctorNames: Record<string, string> = {};

  for (const option of doctorOptions.result) {
    doctorNames[option.doctorId] = option.name;
  }

  const isFiltered = filters.doctorId !== FILTER_ALL || filters.dayOfWeek !== FILTER_ALL || filters.status !== FILTER_ALL;

  return <AvailabilityScreen blocks={blocks.result} doctorOptions={doctorOptions.result} doctorNames={doctorNames} filtered={isFiltered} />;
}
