'use client';

import { useState } from 'react';

import { ExternalLink, FlaskConical, Plus } from 'lucide-react';

import { formatShortDate } from '@/lib/utils';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';

import { LabOrderForm } from './lab-order-form';
import { LabPriorityBadge } from './lab-priority.badge';
import { LabStatusBadge } from './lab-status.badge';

import type { LabOrderRow } from './lab.types';

type LabOrdersPanelProps = {
  encounterId: string;
  orders: LabOrderRow[];
  /** True while the encounter is open — a completed encounter's orders are read-only. */
  canOrder: boolean;
};

/** The tests of one order, names joined, each code kept in muted mono when present. */
function TestList({ order }: { order: LabOrderRow }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
      {order.tests.map((test, index) => (
        <span key={index} className="inline-flex items-center gap-1.5">
          {test.name}
          {test.code && <span className="text-muted-foreground font-mono text-xs">{test.code}</span>}
        </span>
      ))}
    </span>
  );
}

/*
  The lab work ordered in one encounter, shown on the encounter screen. Each order lists its tests,
  how urgently it is to be worked and where it has got to, and its ordered date; once a report has
  been released a link opens it.

  While the encounter is open the doctor can order more work; once it is completed the panel is
  read-only — the service refuses a write against a closed encounter regardless, so the control that
  could only produce a refusal is not rendered.
*/
export function LabOrdersPanel({ encounterId, orders, canOrder }: LabOrdersPanelProps) {
  const [isOrdering, setIsOrdering] = useState(false);

  const handleClose = (): void => {
    setIsOrdering(false);
  };

  const handleDialogOpenChange = (open: boolean): void => {
    if (!open) {
      setIsOrdering(false);
    }
  };

  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Lab orders</h2>

        {canOrder && (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsOrdering(true)}>
            <Plus className="size-4" />
            Order lab work
          </Button>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No lab work ordered yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map(order => (
            <li key={order.labOrderId} className="border-border flex flex-col gap-2 rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <TestList order={order} />

                <div className="flex shrink-0 items-center gap-1.5">
                  <LabPriorityBadge priority={order.priority} />
                  <LabStatusBadge status={order.status} />
                </div>
              </div>

              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                <span>Ordered {formatShortDate(order.createdAt)}</span>

                {order.reportReleased && order.reportId && (
                  <a
                    href={`/api/lab/reports/${order.reportId}/view`}
                    target="_blank"
                    rel="noopener"
                    className="text-foreground inline-flex items-center gap-1 font-medium hover:underline">
                    <ExternalLink className="size-3.5" />
                    View report
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOrdering && (
        <Dialog open onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order lab work</DialogTitle>
              <DialogDescription>
                <FlaskConical className="mr-1 inline size-4" aria-hidden />
                Name the tests and set the priority. It is ordered against this encounter.
              </DialogDescription>
            </DialogHeader>

            <LabOrderForm encounterId={encounterId} onDone={handleClose} />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
