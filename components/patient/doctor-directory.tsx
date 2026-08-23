import { Stethoscope } from 'lucide-react';

import { DAYS_OF_WEEK, DAY_OF_WEEK_LABELS } from '@/constants/schedule.const';

import { Badge } from '@/components/ui';

import { PatientPortalEmpty } from './patient-portal-empty';

import type { DoctorDirectoryDto, DoctorDirectoryProps } from './patient.types';

type SittingSlot = DoctorDirectoryDto['sittingHours'][number];

/** The doctor's sitting hours grouped by day, in week order, so each day reads as one line of times. */
function groupSittingHoursByDay(sittingHours: SittingSlot[]): { dayLabel: string; slots: SittingSlot[] }[] {
  return DAYS_OF_WEEK.map(day => ({
    dayLabel: DAY_OF_WEEK_LABELS[day],
    slots: sittingHours.filter(slot => slot.dayOfWeek === day).sort((first, second) => first.startTime.localeCompare(second.startTime)),
  })).filter(group => group.slots.length > 0);
}

/*
  The directory a patient chooses a doctor from: name, specialization and designation, department,
  whether they are taking new patients, and their published sitting hours grouped by day. It carries
  nothing personal — no fee, no registration number, no contact detail — because that is exactly what
  the directory DTO leaves out.
*/
export function DoctorDirectory({ doctors }: DoctorDirectoryProps) {
  if (doctors.length === 0) {
    return (
      <PatientPortalEmpty
        icon={Stethoscope}
        title="No doctors listed yet"
        description="When doctors publish their profiles and hours, you can find and book with them here."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {doctors.map(doctor => {
        const groupedHours = groupSittingHoursByDay(doctor.sittingHours);

        return (
          <li key={doctor.doctorId} className="border-border flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-medium wrap-break-word">{doctor.name}</p>
                <p className="text-muted-foreground text-sm">
                  {doctor.specialization}
                  {doctor.designation ? ` · ${doctor.designation}` : ''}
                </p>
                <p className="text-muted-foreground text-sm">{doctor.departmentName}</p>
              </div>

              {doctor.isAcceptingPatients ? <Badge variant="success">Accepting patients</Badge> : <Badge variant="neutral">Not accepting</Badge>}
            </div>

            {groupedHours.length > 0 ? (
              <dl className="border-border flex flex-col gap-1.5 border-t pt-3">
                {groupedHours.map(group => (
                  <div key={group.dayLabel} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
                    <dt className="text-muted-foreground w-24 shrink-0">{group.dayLabel}</dt>
                    <dd className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {group.slots.map((slot, index) => (
                        <span key={index} className="whitespace-nowrap">
                          {slot.startTime}–{slot.endTime}
                          {slot.room ? <span className="text-muted-foreground"> · {slot.room}</span> : null}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="border-border text-muted-foreground border-t pt-3 text-sm">No sitting hours published.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
