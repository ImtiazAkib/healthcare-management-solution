import { ExternalLink } from 'lucide-react';

import { formatShortDate } from '@/lib/utils';

import { Badge, TableCell, TableRow } from '@/components/ui';

import { LabPriorityBadge } from './lab-priority.badge';
import { LabStatusBadge } from './lab-status.badge';

import type { LabOrderRow } from './lab.types';

type LabOrdersTableRowProps = {
  order: LabOrderRow;
};

/** The tests column: each test named, the code kept in muted mono where present. */
function TestCell({ order }: { order: LabOrderRow }) {
  return (
    <span className="flex flex-col gap-0.5">
      {order.tests.map((test, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {test.name}
          {test.code && <span className="text-muted-foreground font-mono text-xs">{test.code}</span>}
        </span>
      ))}
    </span>
  );
}

export function LabOrdersTableRow({ order }: LabOrdersTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{order.patientName}</span>
          <Badge variant="neutral" className="font-mono">
            {order.medicalRecordNo}
          </Badge>
        </div>
      </TableCell>

      <TableCell className="max-w-xs">
        <TestCell order={order} />
      </TableCell>

      <TableCell>
        <LabPriorityBadge priority={order.priority} />
      </TableCell>

      <TableCell>
        <LabStatusBadge status={order.status} />
      </TableCell>

      <TableCell className="whitespace-nowrap">{formatShortDate(order.createdAt)}</TableCell>

      <TableCell>
        {order.reportReleased && order.reportId ? (
          <a
            href={`/api/lab/reports/${order.reportId}/view`}
            target="_blank"
            rel="noopener"
            className="text-foreground inline-flex items-center gap-1 font-medium hover:underline">
            <ExternalLink className="size-3.5" />
            View report
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
