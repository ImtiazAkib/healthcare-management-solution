'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { DepartmentDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, PageHeader } from '@/components/ui';

import { deactivateDepartmentAction, deleteDepartmentAction } from './actions';
import { DepartmentConfirmDialog } from './department-confirm.dialog';
import { DepartmentEditDialog } from './department-edit.dialog';
import { DepartmentsEmpty } from './departments-empty';
import { DepartmentsFilters } from './departments-filters';
import { DepartmentsTable } from './departments-table';

import type { DepartmentHeadOption, HeadDoctorNameMap } from './departments.types';

type DepartmentsScreenProps = {
  departments: DepartmentDto[];
  /** The assignable doctors, fed to the edit dialog's head Select. */
  headOptions: DepartmentHeadOption[];
  /** Id → name for the table, so a department's head shows by name without a second query. */
  headNames: HeadDoctorNameMap;
  /** True when any filter is applied, so the empty state can tell "none yet" from "none match". */
  filtered: boolean;
};

/*
  The one client component on this screen. The table and its dialogs share which row is
  selected and whether an action is in flight, so splitting that state across siblings would
  only mean lifting it back up again.

  Every mutation ends in `router.refresh()`: the list is server-rendered, so re-running the
  server component is what makes the change appear — and it re-applies the current URL filters
  for free.
*/
export function DepartmentsScreen({ departments, headOptions, headNames, filtered }: DepartmentsScreenProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();

  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [activating, setActivating] = useState<DepartmentDto | null>(null);
  const [deleting, setDeleting] = useState<DepartmentDto | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleEdit = (department: DepartmentDto): void => {
    setEditing(department);
  };

  const handleUpdated = (): void => {
    setEditing(null);
    toast.success('Department updated.');
    router.refresh();
  };

  const handleActivation = (department: DepartmentDto): void => {
    setConfirmError(null);
    setActivating(department);
  };

  const handleDelete = (department: DepartmentDto): void => {
    setConfirmError(null);
    setDeleting(department);
  };

  const handleActivationConfirm = (): void => {
    if (!activating) {
      return;
    }

    const target = activating;
    const isActive = !target.isActive;

    startWorking(async () => {
      const result = await deactivateDepartmentAction({ departmentId: target.departmentId, isActive });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setActivating(null);
      toast.success(isActive ? 'Department reactivated.' : 'Department deactivated.');
      router.refresh();
    });
  };

  const handleDeleteConfirm = (): void => {
    if (!deleting) {
      return;
    }

    const target = deleting;

    startWorking(async () => {
      const result = await deleteDepartmentAction({ departmentId: target.departmentId });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setDeleting(null);
      toast.success('Department deleted.');
      router.refresh();
    });
  };

  const handleEditOpenChange = (open: boolean): void => {
    if (!open) {
      setEditing(null);
    }
  };

  const handleActivatingOpenChange = (open: boolean): void => {
    if (!open) {
      setActivating(null);
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
        title="Departments"
        description="Create and organize the hospital's departments, and assign the doctor who heads each one."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_DEPARTMENTS_NEW.HREF} />}>
            <Plus className="size-4" />
            Add department
          </Button>
        }
      />

      <DepartmentsFilters />

      {departments.length === 0 ? (
        <DepartmentsEmpty filtered={filtered} />
      ) : (
        <DepartmentsTable
          departments={departments}
          headNames={headNames}
          onEdit={handleEdit}
          onActivation={handleActivation}
          onDelete={handleDelete}
        />
      )}

      {editing && (
        <DepartmentEditDialog
          key={editing.departmentId}
          department={editing}
          headOptions={headOptions}
          onUpdated={handleUpdated}
          onOpenChange={handleEditOpenChange}
        />
      )}

      <DepartmentConfirmDialog
        department={activating}
        title={activating?.isActive ? 'Deactivate this department' : 'Reactivate this department'}
        description={
          activating?.isActive
            ? 'The department will be hidden from every picker. Doctors and past appointments keep it.'
            : 'The department will be offered again.'
        }
        confirmLabel={activating?.isActive ? 'Deactivate' : 'Reactivate'}
        isWorking={isWorking}
        error={confirmError}
        onConfirm={handleActivationConfirm}
        onOpenChange={handleActivatingOpenChange}
      />

      <DepartmentConfirmDialog
        department={deleting}
        title="Delete this department"
        description="This permanently removes the department. It cannot be undone — deactivate instead if it may be referenced later."
        confirmLabel="Delete department"
        isWorking={isWorking}
        error={confirmError}
        destructive
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeletingOpenChange}
      />
    </div>
  );
}
