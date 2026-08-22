import { CalendarRange, DoorClosed, LayoutGrid, MoreHorizontal, Pencil, Power, Trash2, User } from 'lucide-react';

import { AvailabilityDto } from '@/types';

import { cn, countSlots, formatShortDate } from '@/lib/utils';

import { Badge, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';

import type { DoctorNameMap } from './availability.types';

type AvailabilityGridCellProps = {
  block: AvailabilityDto;
  /** Id → name, so the admin week labels each block's doctor. Empty on the doctor's own week. */
  doctorNames: DoctorNameMap;
  /** The doctor's own read-only week hides the actions and the doctor name — it is themselves. */
  readOnly: boolean;
  onEdit?: (block: AvailabilityDto) => void;
  onDeactivate?: (block: AvailabilityDto) => void;
  onDelete?: (block: AvailabilityDto) => void;
};

/*
  One block in the week. Not a time-of-day grid: a fixed hour scale wastes most of its height on
  empty rows and is unreadable on a phone, so each day lists its blocks in order, which is the
  same information. A retired block stays in place, dimmed and badged, rather than vanishing.

  The doctor's own week passes `readOnly` — no menu, and no name beside each block, because every
  one is theirs. The admin week shows both.
*/
export function AvailabilityGridCell({ block, doctorNames, readOnly, onEdit, onDeactivate, onDelete }: AvailabilityGridCellProps) {
  const doctorName = doctorNames[block.doctorId];

  const effectiveWindow = block.effectiveTo
    ? `${formatShortDate(block.effectiveFrom)} → ${formatShortDate(block.effectiveTo)}`
    : `From ${formatShortDate(block.effectiveFrom)} onwards`;

  const handleEditClick = (): void => {
    onEdit?.(block);
  };

  const handleDeactivateClick = (): void => {
    onDeactivate?.(block);
  };

  const handleDeleteClick = (): void => {
    onDelete?.(block);
  };

  return (
    <article className={cn('border-border bg-card flex flex-col gap-2 rounded-lg border p-3', !block.isActive && 'opacity-70')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-regular-semibold tabular-nums', !block.isActive && 'text-muted-foreground line-through')}>
            {block.startTime}–{block.endTime}
          </span>
          {!block.isActive && <Badge variant="neutral">Deactivated</Badge>}
        </div>

        {!readOnly && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Actions" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleEditClick}>
                <Pencil />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleDeactivateClick}>
                <Power />
                {block.isActive ? 'Deactivate' : 'Reactivate'}
              </DropdownMenuItem>

              <DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <dl className="text-muted-foreground flex flex-col gap-1 text-xs">
        {!readOnly && doctorName && (
          <div className="flex items-center gap-1.5">
            <User className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Doctor</dt>
            <dd className="text-foreground truncate font-medium">{doctorName}</dd>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <DoorClosed className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Room</dt>
          <dd>{block.room ? block.room : 'No room set'}</dd>
        </div>

        <div className="flex items-center gap-1.5">
          <LayoutGrid className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Slots</dt>
          <dd className="tabular-nums">
            {countSlots(block)} × {block.slotMinutes}-min slots
          </dd>
        </div>

        <div className="flex items-center gap-1.5">
          <CalendarRange className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Effective window</dt>
          <dd>{effectiveWindow}</dd>
        </div>
      </dl>
    </article>
  );
}
