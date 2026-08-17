'use client';

import { DepartmentDto } from '@/types';

import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';

type DepartmentConfirmDialogProps = {
  department: DepartmentDto | null;
  title: string;
  description: string;
  confirmLabel: string;
  isWorking: boolean;
  error: string | null;
  /** A red confirm button for the one action that cannot be taken back — delete. */
  destructive?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Deactivate, reactivate and delete are the same dialog with different words — a title, a
  sentence, and one button. Three near-identical files would drift; this takes its copy as
  props.

  The department being acted on is named on its own line rather than interpolated into the
  description, so the description stays a fixed string the caller can hand in.
*/
export function DepartmentConfirmDialog({
  department,
  title,
  description,
  confirmLabel,
  isWorking,
  error,
  destructive = false,
  onConfirm,
  onOpenChange,
}: DepartmentConfirmDialogProps) {
  const handleConfirmClick = (): void => {
    onConfirm();
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(department)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {department && (
          <div className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm">
            <span className="font-medium">{department.name}</span>
            <Badge variant="neutral" className="font-mono">
              {department.code}
            </Badge>
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

          <Button type="button" variant={destructive ? 'destructive' : 'default'} disabled={isWorking} onClick={handleConfirmClick}>
            {isWorking ? 'Working…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
