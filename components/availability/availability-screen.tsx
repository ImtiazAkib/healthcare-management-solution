'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { AvailabilityDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, PageHeader } from '@/components/ui';

import { deactivateAvailabilityAction, deleteAvailabilityAction } from './actions';
import { AvailabilityEmpty } from './availability-empty';
import { AvailabilityFilters } from './availability-filters';
import { AvailabilityWeekView } from './availability-week-view';
import { SlotDeleteDialog } from './slot-delete.dialog';
import { SlotEditDialog } from './slot-edit.dialog';

import type { DoctorNameMap, DoctorOption } from './availability.types';

type AvailabilityScreenProps = {
  blocks: AvailabilityDto[];
  /** The doctors, fed to the filter's doctor Select. */
  doctorOptions: DoctorOption[];
  /** Id → name, so each block in the week shows its doctor by name without a second query. */
  doctorNames: DoctorNameMap;
  /** True when any filter is applied, so the empty state can tell "none yet" from "none match". */
  filtered: boolean;
};

/*
  The one client component on this screen. The week and its dialogs share which block is selected
  and whether an action is in flight, so splitting that state across siblings would only mean
  lifting it back up again.

  Deactivate and reactivate fire straight from a block's menu — a reactivation can still clash, so
  its refusal surfaces as an error toast — while delete, the one irreversible action, asks first
  through `SlotDeleteDialog`. Every mutation ends in `router.refresh()`: the week is
  server-rendered, so re-running the server component is what makes the change appear, and it
  re-applies the current URL filters for free.
*/
export function AvailabilityScreen({ blocks, doctorOptions, doctorNames, filtered }: AvailabilityScreenProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();

  const [editing, setEditing] = useState<AvailabilityDto | null>(null);
  const [deleting, setDeleting] = useState<AvailabilityDto | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleEdit = (block: AvailabilityDto): void => {
    setEditing(block);
  };

  const handleUpdated = (): void => {
    setEditing(null);
    toast.success('Availability updated.');
    router.refresh();
  };

  const handleDeactivate = (block: AvailabilityDto): void => {
    const isActive = !block.isActive;

    startWorking(async () => {
      const result = await deactivateAvailabilityAction({ availabilityId: block.availabilityId, isActive });

      if (!isSuccess(result)) {
        // Reactivating re-checks the clashes and can hit both at once (doctor busy AND room busy);
        // show every reason, the way the publish and edit forms do, not just the first.
        const message = result.errors.map(error => error.error).join(' ') || 'Something went wrong. Try again.';
        toast.error(message);

        return;
      }

      toast.success(isActive ? 'Availability reactivated.' : 'Availability deactivated.');
      router.refresh();
    });
  };

  const handleDelete = (block: AvailabilityDto): void => {
    setDeleteError(null);
    setDeleting(block);
  };

  const handleDeleteConfirm = (): void => {
    if (!deleting) {
      return;
    }

    const target = deleting;

    startWorking(async () => {
      const result = await deleteAvailabilityAction({ availabilityId: target.availabilityId });

      if (!isSuccess(result)) {
        setDeleteError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setDeleting(null);
      toast.success('Availability deleted.');
      router.refresh();
    });
  };

  const handleEditOpenChange = (open: boolean): void => {
    if (!open) {
      setEditing(null);
    }
  };

  const handleDeletingOpenChange = (open: boolean): void => {
    if (!open) {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Availability"
        description="Publish when each doctor sits, in which room, and how long each patient gets."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_AVAILABILITY_NEW.HREF} />}>
            <Plus className="size-4" />
            Publish availability
          </Button>
        }
      />

      <AvailabilityFilters doctorOptions={doctorOptions} />

      {blocks.length === 0 ? (
        <AvailabilityEmpty filtered={filtered} />
      ) : (
        <AvailabilityWeekView
          blocks={blocks}
          doctorNames={doctorNames}
          readOnly={false}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
        />
      )}

      {editing && <SlotEditDialog key={editing.availabilityId} block={editing} onUpdated={handleUpdated} onOpenChange={handleEditOpenChange} />}

      <SlotDeleteDialog
        block={deleting}
        isWorking={isWorking}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeletingOpenChange}
      />
    </div>
  );
}
