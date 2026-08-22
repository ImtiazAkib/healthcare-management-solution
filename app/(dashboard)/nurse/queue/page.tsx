import type { Metadata } from 'next';

import { Stethoscope } from 'lucide-react';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { DoctorService, QueueService } from '@/lib/services';
import { toCalendarDate } from '@/lib/utils';

import { NurseQueueDoctorFilter, QueueScreen } from '@/components/queue';
import { EmptyState } from '@/components/ui';

import type { SearchParams } from 'nuqs/server';

const doctorService = new DoctorService();
const queueService = new QueueService();

type NurseQueuePageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Queue',
  robots: { index: false, follow: false },
};

export default async function NurseQueuePage({ searchParams }: NurseQueuePageProps) {
  // A doctor, lab, patient or administrator who reaches this URL is sent to /unauthorized, not sign-in.
  await requireRole(USER_ROLES.NURSE);

  const doctorOptions = (await doctorService.listForSelection()).result;

  /*
    The nurse's queue is always somebody's queue, so with no doctors on file there is nothing to
    watch. That is an early state, not an error — doctor records are seeded elsewhere — so it shows
    an empty state rather than an empty picker over an empty list.
  */
  const [firstDoctor] = doctorOptions;

  if (!firstDoctor) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No doctors yet"
        description="An administrator sets up the doctors' records. Once one exists, you can watch and build their queue here."
      />
    );
  }

  /*
    `?doctorId` is read straight from the URL and validated against the doctors on file: a hand-edited
    or stale id falls back to the first doctor rather than querying a queue for a doctor who is not
    there. The filter writes this same key.
  */
  const params = await searchParams;
  const requested = typeof params.doctorId === 'string' ? params.doctorId : undefined;
  const selectedDoctorId = doctorOptions.find(option => option.doctorId === requested)?.doctorId ?? firstDoctor.doctorId;

  const today = toCalendarDate();

  const [waiting, queue] = await Promise.all([queueService.getWaitingRoom(selectedDoctorId, today), queueService.getQueue(selectedDoctorId, today)]);

  // A failed read returns an empty list too; throw rather than show an empty queue that is really an error.
  if (!waiting.success || !queue.success) {
    throw new Error('Could not load the queue. Please try again.');
  }

  return (
    <QueueScreen
      entries={queue.result}
      waiting={waiting.result}
      role="nurse"
      doctorPicker={<NurseQueueDoctorFilter doctorOptions={doctorOptions} value={selectedDoctorId} />}
    />
  );
}
