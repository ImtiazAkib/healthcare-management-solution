import { TriagePriority } from '@/types';

import { TRIAGE_PRIORITY_LABELS } from '@/constants/appointment.const';

import { Badge } from '@/components/ui';

import { QueueActions } from './queue-actions';

import type { QueueRowProps } from './queue.types';

/*
  Priority decides the chip's color, so urgency reads at a glance down the list: an emergency in
  the loud destructive red, an urgent case in amber, a routine visit in a calm grey. The queue is
  already sorted by exactly this, so the colors run top-to-bottom in order.
*/
const PRIORITY_VARIANTS: Record<TriagePriority, 'destructive' | 'warning' | 'neutral'> = {
  emergency: 'destructive',
  urgent: 'warning',
  routine: 'neutral',
};

/**
 * One live-queue entry: the token that fixes arrival order, the patient and their record number,
 * a priority chip, the appointment time, and the doctor's move for wherever the visit has got.
 */
export function QueueRow({ entry, role, isWorking, onOpenConsultation }: QueueRowProps) {
  return (
    <li className="border-border flex items-center gap-4 rounded-lg border p-4">
      <div className="bg-muted flex size-14 shrink-0 flex-col items-center justify-center rounded-lg">
        <span className="text-xl leading-none font-semibold tabular-nums">{entry.tokenNo ?? '—'}</span>
        <span className="text-muted-foreground text-[0.625rem] tracking-wide uppercase">Token</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{entry.patientName}</p>
          <Badge variant={PRIORITY_VARIANTS[entry.triagePriority]}>{TRIAGE_PRIORITY_LABELS[entry.triagePriority]}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {entry.medicalRecordNo} · {entry.startTime}
        </p>
      </div>

      <QueueActions context="queue" entry={entry} role={role} isWorking={isWorking} onOpenConsultation={onOpenConsultation} />
    </li>
  );
}
