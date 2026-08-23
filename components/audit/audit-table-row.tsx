import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, AUDIT_OUTCOME_LABELS, AUDIT_OUTCOME_VARIANTS, USER_ROLE_LABELS } from '@/constants';
import { AuditLogDto } from '@/types';

import { formatShortDateTime } from '@/lib/utils';

import { Badge, TableCell, TableRow } from '@/components/ui';

type AuditTableRowProps = {
  entry: AuditLogDto;
};

export function AuditTableRow({ entry }: AuditTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        {/*
          An actor whose account was since deleted no longer resolves to a name; the id stays in the
          row so the trail never loses who acted, only what they were called.
        */}
        <span className="block font-medium">{entry.actorName ?? 'Unknown account'}</span>
        <span className="text-muted-foreground block text-xs">{USER_ROLE_LABELS[entry.actorRole]}</span>
      </TableCell>

      <TableCell>
        <span className="block">{AUDIT_ACTION_LABELS[entry.action]}</span>
        <span className="text-muted-foreground block text-xs">{AUDIT_ENTITY_LABELS[entry.entity]}</span>
      </TableCell>

      {/* The raw record id, monospaced and truncated — it identifies the target without dominating the row. */}
      <TableCell className="text-muted-foreground max-w-40 truncate font-mono text-xs" title={entry.entityId ?? undefined}>
        {entry.entityId ?? '—'}
      </TableCell>

      <TableCell>
        <Badge variant={AUDIT_OUTCOME_VARIANTS[entry.outcome]}>{AUDIT_OUTCOME_LABELS[entry.outcome]}</Badge>
      </TableCell>

      <TableCell className="text-muted-foreground font-mono text-xs">{entry.ip ?? '—'}</TableCell>

      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatShortDateTime(entry.at)}</TableCell>
    </TableRow>
  );
}
