import { AvailabilityDto } from '@/types';

import { DAY_OF_WEEK_LABELS } from '@/constants/schedule.const';

import { groupBlocksByDay } from '@/lib/utils';

import { AvailabilityGridCell } from './availability-grid-cell';

import type { DoctorNameMap } from './availability.types';

type AvailabilityWeekViewProps = {
  blocks: AvailabilityDto[];
  /** Id → name for the admin week; an empty map on the doctor's own week. */
  doctorNames: DoctorNameMap;
  readOnly: boolean;
  onEdit?: (block: AvailabilityDto) => void;
  onDeactivate?: (block: AvailabilityDto) => void;
  onDelete?: (block: AvailabilityDto) => void;
};

/*
  The week as seven day-columns — Sunday first — that stack on a phone and spread from `lg` up.
  `groupBlocksByDay` returns every weekday even when it holds nothing, so an empty day renders a
  quiet "Nothing scheduled" row rather than collapsing and shifting the rest of the week.
*/
export function AvailabilityWeekView({ blocks, doctorNames, readOnly, onEdit, onDeactivate, onDelete }: AvailabilityWeekViewProps) {
  const week = groupBlocksByDay(blocks);

  return (
    <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {week.map(({ day, blocks: dayBlocks }) => (
        <section key={day} aria-label={DAY_OF_WEEK_LABELS[day]} className="flex flex-col gap-2">
          <header className="border-border flex items-center justify-between gap-2 border-b pb-2">
            <h2 className="text-sm font-semibold">{DAY_OF_WEEK_LABELS[day]}</h2>
          </header>

          {dayBlocks.length === 0 ? (
            <p className="text-muted-foreground px-1 py-4 text-center text-xs">Nothing scheduled</p>
          ) : (
            dayBlocks.map(block => (
              <AvailabilityGridCell
                key={block.availabilityId}
                block={block}
                doctorNames={doctorNames}
                readOnly={readOnly}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                onDelete={onDelete}
              />
            ))
          )}
        </section>
      ))}
    </div>
  );
}
