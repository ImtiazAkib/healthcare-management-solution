'use client';

import { useState } from 'react';

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label, Textarea } from '@/components/ui';

import type { AppointmentRow } from './appointments.types';

type AppointmentCancelDialogProps = {
  appointment: AppointmentRow;
  isWorking: boolean;
  error: string | null;
  onConfirm: (cancelledReason: string) => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Cancelling releases the slot the appointment held, so somebody else can book it — which is why
  it is a status change rather than a delete, and why a reason is asked for: the record stays, and
  the reason is what it stays with. Mounted only while an appointment is selected and keyed on its
  id by the parent, so the reason box starts empty each time.

  A red confirm, mirroring the destructive confirm on the staff screen — this ends the booking.
*/
export function AppointmentCancelDialog({ appointment, isWorking, error, onConfirm, onOpenChange }: AppointmentCancelDialogProps) {
  const [reason, setReason] = useState('');

  const handleReasonChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.target.value);
  };

  const handleConfirmClick = (): void => {
    onConfirm(reason.trim());
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  const canConfirm = reason.trim().length > 0;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this appointment</DialogTitle>
          <DialogDescription>The slot is released for someone else to book. The record is kept with the reason you give below.</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
          <span className="block font-medium">{appointment.patientName}</span>
          <span className="text-muted-foreground block text-xs">
            {appointment.doctorName} · {appointment.startTime}–{appointment.endTime}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-reason">Reason</Label>
          <Textarea id="cancel-reason" rows={2} placeholder="e.g. patient called to cancel" value={reason} onChange={handleReasonChange} />
        </div>

        {error && (
          <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isWorking} onClick={handleCancelClick}>
            Keep appointment
          </Button>

          <Button type="button" variant="destructive" disabled={isWorking || !canConfirm} onClick={handleConfirmClick}>
            {isWorking ? 'Cancelling…' : 'Cancel appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
