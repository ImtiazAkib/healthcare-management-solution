import { AuditLogDto } from '@/types';

import { PageHeader } from '@/components/ui';

import { AuditEmpty } from './audit-empty';
import { AuditFilters } from './audit-filters';
import { AuditTable } from './audit-table';

type AuditScreenProps = {
  entries: AuditLogDto[];
  /** True when any filter is applied, so the empty state can tell "none yet" from "none match". */
  filtered: boolean;
};

/*
  The trail is read-only — there is nothing to create, edit or delete — so unlike the other admin
  screens this one holds no client state. The filter row is the only interactive part and carries its
  own; the screen itself renders on the server.
*/
export function AuditScreen({ entries, filtered }: AuditScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Access trail"
        description="Every record opened and report downloaded across the hospital — who, what, from where, and whether it was allowed. Newest first."
      />

      <AuditFilters />

      {entries.length === 0 ? <AuditEmpty filtered={filtered} /> : <AuditTable entries={entries} />}
    </div>
  );
}
