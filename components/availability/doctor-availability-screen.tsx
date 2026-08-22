import { AvailabilityDto } from '@/types';

import { PageHeader } from '@/components/ui';

import { AvailabilityEmpty } from './availability-empty';
import { AvailabilityWeekView } from './availability-week-view';

type DoctorAvailabilityScreenProps = {
  blocks: AvailabilityDto[];
};

/*
  The signed-in doctor's own week, read-only: an administrator publishes and changes these hours,
  the doctor only reads them. No dialogs, no menu, no doctor name beside each block — every one is
  theirs — so this stays a server component, which is why the doctor names map is empty. An empty
  week is a normal state, not a failure.
*/
export function DoctorAvailabilityScreen({ blocks }: DoctorAvailabilityScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My availability" description="The hours reception can book you for. Ask an administrator to change them." />

      {blocks.length === 0 ? <AvailabilityEmpty filtered={false} /> : <AvailabilityWeekView blocks={blocks} doctorNames={{}} readOnly />}
    </div>
  );
}
