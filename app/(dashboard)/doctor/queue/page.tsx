import type { Metadata } from 'next';

import { Stethoscope } from 'lucide-react';

import { CODES, USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { DoctorService, QueueService } from '@/lib/services';
import { toCalendarDate } from '@/lib/utils';

import { QueueScreen } from '@/components/queue';
import { EmptyState } from '@/components/ui';

const doctorService = new DoctorService();
const queueService = new QueueService();

export const metadata: Metadata = {
  title: 'Queue',
  robots: { index: false, follow: false },
};

export default async function DoctorQueuePage() {
  // The doctor's own record is resolved from the session's user id, never from a URL.
  const sessionUser = await requireRole(USER_ROLES.DOCTOR);

  const doctor = await doctorService.findByUser(sessionUser.userId);

  /*
    A doctor account with no professional record yet is a normal early state, not an error — the
    record is set up by an administrator in a separate flow — so it renders an empty state. A real
    database failure returns the same empty `result`, though, so the two are told apart by the
    code: only a genuine "not found" shows the empty state; anything else is thrown to the error
    boundary rather than telling a doctor who has a profile that they have none.
  */
  if (!doctor.result) {
    if (doctor.errors[0]?.code !== CODES.VALIDATION.COMMON.RESOURCE_NOT_FOUND.CODE) {
      throw new Error('Could not load your queue. Please try again.');
    }

    return (
      <EmptyState
        icon={Stethoscope}
        title="No doctor profile yet"
        description="An administrator sets up your professional record. Once it exists, the patients checked in for you appear here."
      />
    );
  }

  const today = toCalendarDate();

  const queue = await queueService.getQueue(doctor.result.doctorId, today);

  // A failed read returns an empty list too; throw rather than tell a doctor with a full queue it is empty.
  if (!queue.success) {
    throw new Error('Could not load your queue. Please try again.');
  }

  return <QueueScreen entries={queue.result} role="doctor" />;
}
