'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ExternalLink, FlaskConical, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { LAB_STATUSES } from '@/constants';
import { LabStatus } from '@/types';

import { isSuccess } from '@/lib/result';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';

import { changeLabOrderStatusAction } from './actions';
import { ReportReleaseButton } from './report-release.button';
import { ReportUploadForm } from './report-upload-form';

import type { LabOrderRow } from './lab.types';

type LabOrderWorkActionsProps = {
  order: LabOrderRow;
};

/*
  Cancel is offered only where the service can actually make the move. A reported order can no longer
  be cancelled (its report is filed), and a released or cancelled one is done — so all three hide the
  control that would otherwise only ever return a refusal.
*/
const NON_CANCELLABLE_STATUSES: readonly LabStatus[] = [LAB_STATUSES.REPORTED, LAB_STATUSES.RELEASED, LAB_STATUSES.CANCELLED];

/** A link that opens the report in a new tab — shown wherever a report exists on the row. */
function ViewReportLink({ reportId }: { reportId: string }) {
  return (
    <a
      href={`/api/lab/reports/${reportId}/view`}
      target="_blank"
      rel="noopener"
      className="text-foreground inline-flex items-center gap-1 text-sm font-medium hover:underline">
      <ExternalLink className="size-3.5" />
      View report
    </a>
  );
}

/*
  The lab's controls for one work-list row. Which move is offered is a function of where the order
  has got to: it is collected, then worked, then a report is filed and released. Any order still in
  flight can be cancelled. The moves run through the status action in a transition and reload on
  success; a refusal — an illegal move the service rejects — surfaces as a toast and leaves the row
  as it was.
*/
export function LabOrderWorkActions({ order }: LabOrderWorkActionsProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();
  const [isUploading, setIsUploading] = useState(false);

  const runStatusChange = (status: LabStatus, successMessage: string): void => {
    startWorking(async () => {
      const result = await changeLabOrderStatusAction({ labOrderId: order.labOrderId, status });

      if (!isSuccess(result)) {
        toast.error(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      toast.success(successMessage);
      router.refresh();
    });
  };

  const handleCancelClick = (): void => {
    if (!window.confirm('Cancel this lab order?')) {
      return;
    }

    runStatusChange(LAB_STATUSES.CANCELLED, 'Order cancelled.');
  };

  const handleDialogOpenChange = (open: boolean): void => {
    if (!open) {
      setIsUploading(false);
    }
  };

  const canCancel = !NON_CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {order.status === LAB_STATUSES.ORDERED && (
        <Button type="button" size="sm" disabled={isWorking} onClick={() => runStatusChange(LAB_STATUSES.COLLECTED, 'Sample marked collected.')}>
          Mark collected
        </Button>
      )}

      {order.status === LAB_STATUSES.COLLECTED && (
        <Button type="button" size="sm" disabled={isWorking} onClick={() => runStatusChange(LAB_STATUSES.IN_PROGRESS, 'Marked in progress.')}>
          Mark in progress
        </Button>
      )}

      {order.status === LAB_STATUSES.IN_PROGRESS && (
        <Button type="button" size="sm" onClick={() => setIsUploading(true)}>
          <Upload className="size-4" />
          Upload report
        </Button>
      )}

      {order.status === LAB_STATUSES.REPORTED && order.reportId && (
        <>
          <ReportReleaseButton labReportId={order.reportId} />
          <ViewReportLink reportId={order.reportId} />
        </>
      )}

      {(order.status === LAB_STATUSES.RELEASED || order.status === LAB_STATUSES.CANCELLED) && order.reportId && (
        <ViewReportLink reportId={order.reportId} />
      )}

      {canCancel && (
        <Button type="button" variant="ghost" size="sm" disabled={isWorking} onClick={handleCancelClick}>
          <X className="size-4" />
          Cancel
        </Button>
      )}

      {isUploading && (
        <Dialog open onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload the report</DialogTitle>
              <DialogDescription>
                <FlaskConical className="mr-1 inline size-4" aria-hidden />
                File the result against this order. It is not visible to the doctor until you release it.
              </DialogDescription>
            </DialogHeader>

            <ReportUploadForm labOrderId={order.labOrderId} onDone={() => setIsUploading(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
