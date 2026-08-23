'use client';

import Link from 'next/link';

import { ClipboardPlus, LogIn, Play, Stethoscope, UserX } from 'lucide-react';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';

import { Button } from '@/components/ui';

import type { QueueActionsProps } from './queue.types';

/*
  The buttons for one row. Which appear is a function of where the row sits and, in the queue, of
  how far the visit has got: a checked-in patient is started — the doctor opens the consultation
  record — and one already in consultation is resumed into that record, where the visit is
  documented and completed. The screen owns the navigation and the handlers, so these only disable
  while it works and hand the row back when clicked.
*/
export function QueueActions(props: QueueActionsProps) {
  if (props.context === 'waiting') {
    const { entry, isWorking, onCheckIn, onNoShow } = props;

    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={isWorking} onClick={() => onCheckIn(entry)}>
          <LogIn className="size-4" />
          Check in
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isWorking} onClick={() => onNoShow(entry)}>
          <UserX className="size-4" />
          No show
        </Button>
      </div>
    );
  }

  const { entry, role, isWorking, onOpenConsultation } = props;

  // A nurse works the live queue by recording each arrival's vitals and triage — the consultation
  // itself is the doctor's to open, so the nurse's control leads to the vitals screen, not into it.
  if (role === 'nurse') {
    return (
      <Button size="sm" variant="outline" className="shrink-0" nativeButton={false} render={<Link href={`/nurse/vitals/${entry.appointmentId}`} />}>
        <ClipboardPlus className="size-4" />
        Record vitals
      </Button>
    );
  }

  // In consultation with a record already open: resume into it. The chief button is "resume", so the
  // doctor returns to exactly where they left the notes rather than starting over.
  if (entry.status === APPOINTMENT_STATUSES.IN_CONSULTATION && entry.encounterId) {
    return (
      <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={isWorking} onClick={() => onOpenConsultation(entry)}>
        <Stethoscope className="size-4" />
        Resume consultation
      </Button>
    );
  }

  // Checked in — or in consultation with no record yet — so the doctor opens the consultation.
  return (
    <Button type="button" size="sm" className="shrink-0" disabled={isWorking} onClick={() => onOpenConsultation(entry)}>
      <Play className="size-4" />
      Start consultation
    </Button>
  );
}
