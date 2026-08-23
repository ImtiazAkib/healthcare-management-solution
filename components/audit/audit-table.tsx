import { AuditLogDto } from '@/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { AuditTableRow } from './audit-table-row';

type AuditTableProps = {
  entries: AuditLogDto[];
};

export function AuditTable({ entries }: AuditTableProps) {
  return (
    /*
      The wrapper scrolls and the table holds its natural width, so the id and address columns keep
      their own line on a phone rather than being crushed into the actor column.
    */
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Access trail" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {entries.map(x => (
            <AuditTableRow key={x.auditId} entry={x} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
