'use client';

import { useEffect, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { AppointmentDto } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';

import { SingleResult, isSuccess } from '@/lib/result';

import { openEncounterAction } from '@/components/encounters/actions';
import { PageHeader, Spinner } from '@/components/ui';

import { checkInAction, noShowAction } from './actions';
import { QueueActions } from './queue-actions';
import { QueueEmpty } from './queue-empty';
import { QueueRow } from './queue-row';

import type { QueueEntry, QueueScreenProps } from './queue.types';

// How often the queue re-reads itself, in milliseconds. The queue is derived and changes as
// patients are checked in and called, so the screen re-reads on a timer rather than waiting for
// a reload — a mutation refreshes immediately, and this catches everyone else's between clicks.
const POLL_INTERVAL_MS = 5000;

const HEADER_COPY = {
  doctor: {
    title: 'Queue',
    description: 'The patients waiting for you today, most urgent first.',
  },
  nurse: {
    title: 'Queue',
    description: 'Check patients in and watch the queue build.',
  },
};

/*
  The one client component on this screen, and the only one that polls: on mount it re-runs the
  server component every few seconds so a queue two people are working stays current on both. Every
  action runs in a transition and reloads on success, so the acting screen updates at once rather
  than waiting for the next tick; a refusal surfaces as a toast and leaves the queue as it was.
*/
export function QueueScreen({ entries, waiting, role, doctorPicker }: QueueScreenProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [router]);

  const runStatusChange = (
    action: (values: unknown) => Promise<SingleResult<AppointmentDto>>,
    entry: QueueEntry,
    status: string,
    successMessage: string
  ): void => {
    startWorking(async () => {
      const result = await action({ appointmentId: entry.appointmentId, status });

      if (!isSuccess(result)) {
        toast.error(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      toast.success(successMessage);
      router.refresh();
    });
  };

  /*
    The doctor's one move on the queue: open the consultation record and go to it. A row already in
    consultation carries its encounter, so resuming is a straight navigation; a checked-in row has
    none yet, so the record is opened first — which also moves the appointment into consultation and
    drops the patient from "waiting". The visit is documented and completed inside that record, not
    from the queue, so there is no way here to complete a visit that was never written down.
  */
  const handleOpenConsultation = (entry: QueueEntry): void => {
    startWorking(async () => {
      if (entry.encounterId) {
        router.push(`/doctor/encounters/${entry.encounterId}`);

        return;
      }

      const result = await openEncounterAction({ appointmentId: entry.appointmentId });

      if (!isSuccess(result) || !result.result) {
        toast.error(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      router.push(`/doctor/encounters/${result.result.encounterId}`);
    });
  };

  const handleCheckIn = (entry: QueueEntry): void => {
    runStatusChange(checkInAction, entry, APPOINTMENT_STATUSES.CHECKED_IN, 'Patient checked in.');
  };

  const handleNoShow = (entry: QueueEntry): void => {
    runStatusChange(noShowAction, entry, APPOINTMENT_STATUSES.NO_SHOW, 'Marked as a no-show.');
  };

  const copy = HEADER_COPY[role];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.title} description={copy.description} />

      {doctorPicker}

      {role === 'nurse' && waiting && (
        <section className="flex flex-col gap-3">
          <h2 className="text-card-title">Waiting room</h2>

          {waiting.length === 0 ? (
            <p className="text-muted-foreground text-sm">No one is waiting to be checked in.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {waiting.map(entry => (
                <li key={entry.appointmentId} className="border-border flex items-center gap-4 rounded-lg border p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate font-medium">{entry.patientName}</p>
                    <p className="text-muted-foreground text-sm">
                      {entry.medicalRecordNo} · {entry.startTime}
                    </p>
                  </div>
                  <QueueActions context="waiting" entry={entry} isWorking={isWorking} onCheckIn={handleCheckIn} onNoShow={handleNoShow} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-card-title">In the queue</h2>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Spinner className="size-3.5" />
            Updated live
          </span>
        </div>

        {entries.length === 0 ? (
          <QueueEmpty />
        ) : (
          <ul aria-live="polite" className="flex flex-col gap-2">
            {entries.map(entry => (
              <QueueRow key={entry.appointmentId} entry={entry} role={role} isWorking={isWorking} onOpenConsultation={handleOpenConsultation} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
