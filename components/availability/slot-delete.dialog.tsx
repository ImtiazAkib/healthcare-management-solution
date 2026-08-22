'use client';

import { AvailabilityDto } from '@/types';

import { DAY_OF_WEEK_LABELS } from '@/constants/schedule.const';

import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';

type SlotDeleteDialogProps = {
  block: AvailabilityDto | null;
  isWorking: boolean;
  error: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Deleting a block is the one availability action that cannot be taken back — deactivating keeps
  the record so the same hours can be reactivated later, deleting does not. So it alone asks first,
  with a red confirm. Deactivate and reactivate fire straight from the menu.

  The block being removed is named on its own line — the day and its hours — rather than
  interpolated into the description, so the description stays a fixed string.
*/
export function SlotDeleteDialog({ block, isWorking, error, onConfirm, onOpenChange }: SlotDeleteDialogProps) {
  const handleConfirmClick = (): void => {
    onConfirm();
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(block)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this availability</DialogTitle>
          <DialogDescription>
            This permanently removes the block. It cannot be undone — deactivate instead if the doctor may sit these hours again.
          </DialogDescription>
        </DialogHeader>

        {block && (
          <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-sm">
            <span className="font-medium">{DAY_OF_WEEK_LABELS[block.dayOfWeek]}</span>
            <span className="tabular-nums">
              {block.startTime}–{block.endTime}
            </span>
            {block.room && (
              <Badge variant="neutral" className="font-mono">
                {block.room}
              </Badge>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isWorking} onClick={handleCancelClick}>
            Cancel
          </Button>

          <Button type="button" variant="destructive" disabled={isWorking} onClick={handleConfirmClick}>
            {isWorking ? 'Working…' : 'Delete availability'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
