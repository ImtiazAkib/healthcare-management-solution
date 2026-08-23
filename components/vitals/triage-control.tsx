'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { TRIAGE_PRIORITIES, TRIAGE_PRIORITY_LABELS } from '@/constants';
import { TriagePriority } from '@/types';

import { isSuccess } from '@/lib/result';

import { Button } from '@/components/ui';

import { setTriageAction } from './actions';
import { TriagePriorityBadge } from './triage-priority.badge';

import type { TriageControlProps } from './vitals.types';

// Least to most urgent, the order the buttons read left to right.
const TRIAGE_OPTIONS: TriagePriority[] = [TRIAGE_PRIORITIES.ROUTINE, TRIAGE_PRIORITIES.URGENT, TRIAGE_PRIORITIES.EMERGENCY];

/*
  The one control that reorders the live queue. A nurse sets the priority; the change is written and
  the queue re-reads, so an emergency jumps the line the moment it is set. The selection updates at
  once and reverts if the service refuses, so the buttons never show a priority the record did not
  take.
*/
export function TriageControl({ appointmentId, priority }: TriageControlProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<TriagePriority>(priority);
  const [isWorking, startWorking] = useTransition();

  const handleSelect = (next: TriagePriority): void => {
    if (next === selected || isWorking) {
      return;
    }

    const previous = selected;
    setSelected(next);

    startWorking(async () => {
      const result = await setTriageAction({ appointmentId, triagePriority: next });

      if (!isSuccess(result)) {
        setSelected(previous);
        toast.error(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      toast.success('Triage updated.');
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Current priority</span>
        <TriagePriorityBadge priority={selected} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span id="triage-priority-label" className="text-sm font-medium">
          Set priority
        </span>
        <div role="group" aria-labelledby="triage-priority-label" className="flex flex-wrap gap-2">
          {TRIAGE_OPTIONS.map(option => (
            <Button
              key={option}
              type="button"
              variant={option === selected ? 'default' : 'outline'}
              aria-pressed={option === selected}
              disabled={isWorking}
              onClick={() => handleSelect(option)}>
              {TRIAGE_PRIORITY_LABELS[option]}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-sm">Marking a patient as an emergency moves them to the front of the live queue.</p>
    </div>
  );
}
