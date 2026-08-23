import type { Metadata } from 'next';

import { AUDIT_OUTCOME_FILTERS } from '@/constants';

import { requireAdminArea } from '@/lib/auth';
import { AuditFiltersSchema } from '@/lib/schemas';
import { AuditService } from '@/lib/services';

import { AuditScreen } from '@/components/audit';

import { loadAuditSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const auditService = new AuditService();

type AdminAuditPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Access trail',
  robots: { index: false, follow: false },
};

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `AuditFiltersSchema` catches rather than throws on every field,
    so a hand-edited query string degrades to the unfiltered trail instead of rendering an error page.
  */
  const filters = AuditFiltersSchema.parse(await loadAuditSearchParams(searchParams));

  const result = await auditService.list(filters);

  // A failed read is thrown, not shown as an empty trail — an unreachable database is not "no access".
  if (!result.success) {
    throw new Error('Could not load the access trail. Please try again.');
  }

  const isFiltered = filters.outcome !== AUDIT_OUTCOME_FILTERS.ALL || filters.query !== '';

  return <AuditScreen entries={result.result} filtered={isFiltered} />;
}
