import { formatShortDate } from '@/lib/utils';

import { Badge } from '@/components/ui';

import { LabOrderWorkActions } from './lab-order-work-actions';
import { LabPriorityBadge } from './lab-priority.badge';
import { LabStatusBadge } from './lab-status.badge';

import type { LabOrderRow } from './lab.types';

type LabWorkRowProps = {
  order: LabOrderRow;
};

/*
  One order on the lab's work list: who it is for, what was ordered, how urgent it is and where it
  has got to, when it was raised, and the controls for the next move. The row is a plain server
  component — only the actions are interactive.
*/
export function LabWorkRow({ order }: LabWorkRowProps) {
  return (
    <li className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{order.patientName}</span>
            <Badge variant="neutral" className="font-mono">
              {order.medicalRecordNo}
            </Badge>
          </div>

          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {order.tests.map((test, index) => (
              <span key={index} className="inline-flex items-center gap-1.5">
                {test.name}
                {test.code && <span className="text-muted-foreground font-mono text-xs">{test.code}</span>}
              </span>
            ))}
          </span>

          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <LabPriorityBadge priority={order.priority} />
            <LabStatusBadge status={order.status} />
            <span>Ordered {formatShortDate(order.createdAt)}</span>
          </div>
        </div>

        <LabOrderWorkActions order={order} />
      </div>
    </li>
  );
}
