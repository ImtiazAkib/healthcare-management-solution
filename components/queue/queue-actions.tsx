'use client';

import { CircleCheck, LogIn, Play, UserX } from 'lucide-react';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';

import { Button } from '@/components/ui';

import type { QueueActionsProps } from './queue.types';

/*
  The buttons for one row. Which appear is a function of where the row sits and, in the queue, of
  how far the visit has got: a checked-in patient can be called in, one already in consultation can
  be closed. The screen owns the transition and the handlers — like the staff screen — so these
  only disable while it works and hand the row back when clicked.
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

  // A nurse watches the live queue but does not move it — that is the doctor's to work.
  if (props.role !== 'doctor') {
    return null;
  }

  const { entry, isWorking, onStart, onComplete } = props;

  if (entry.status === APPOINTMENT_STATUSES.CHECKED_IN) {
    return (
      <Button type="button" size="sm" className="shrink-0" disabled={isWorking} onClick={() => onStart(entry)}>
        <Play className="size-4" />
        Start consultation
      </Button>
    );
  }

  if (entry.status === APPOINTMENT_STATUSES.IN_CONSULTATION) {
    return (
      <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={isWorking} onClick={() => onComplete(entry)}>
        <CircleCheck className="size-4" />
        Complete
      </Button>
    );
  }

  return null;
}
