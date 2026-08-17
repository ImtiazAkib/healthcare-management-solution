import type { Metadata } from 'next';

import { FILTER_ALL } from '@/constants/users.const';

import { requireAdminArea } from '@/lib/auth';
import { ServiceItemFiltersSchema } from '@/lib/schemas';
import { ServiceItemService } from '@/lib/services';

import { ServicesScreen } from '@/components/admin/services';

import { loadServicesSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const serviceItemService = new ServiceItemService();

type AdminServicesPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Service catalogue',
  robots: { index: false, follow: false },
};

export default async function AdminServicesPage({ searchParams }: AdminServicesPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `ServiceItemFiltersSchema` catches rather than throws on
    every field, so a hand-edited query string degrades to the unfiltered catalogue instead of
    rendering an error page.
  */
  const filters = ServiceItemFiltersSchema.parse(await loadServicesSearchParams(searchParams));

  const result = await serviceItemService.list(filters);

  const isFiltered = filters.category !== FILTER_ALL || filters.status !== FILTER_ALL || filters.query !== '';

  return <ServicesScreen services={result.result} filtered={isFiltered} />;
}
