'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { UserDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { PageHeader } from '@/components/ui';
import { Button } from '@/components/ui';

import { approveUserAction, deactivateUserAction, deleteUserAction } from './actions';
import { UserConfirmDialog } from './user-confirm.dialog';
import { UserEditDialog } from './user-edit.dialog';
import { UsersEmpty } from './users-empty';
import { UsersFilters } from './users-filters';
import { UsersTable } from './users-table';

import type { UsersViewer } from './users.types';

type UsersScreenProps = {
  users: UserDto[];
  viewer: UsersViewer;
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
export function UsersScreen({ users, viewer, filtered }: UsersScreenProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();

  const [editing, setEditing] = useState<UserDto | null>(null);
  const [approving, setApproving] = useState<UserDto | null>(null);
  const [activating, setActivating] = useState<UserDto | null>(null);
  const [deleting, setDeleting] = useState<UserDto | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleEdit = (user: UserDto): void => {
    setEditing(user);
  };

  const handleUpdated = (): void => {
    setEditing(null);
    toast.success('Account updated.');
    router.refresh();
  };

  const handleApproval = (user: UserDto): void => {
    setConfirmError(null);
    setApproving(user);
  };

  const handleActivation = (user: UserDto): void => {
    setConfirmError(null);
    setActivating(user);
  };

  const handleDelete = (user: UserDto): void => {
    setConfirmError(null);
    setDeleting(user);
  };

  const handleApprovalConfirm = (): void => {
    if (!approving) {
      return;
    }

    const target = approving;
    const isApproved = !target.isApproved;

    startWorking(async () => {
      const result = await approveUserAction({ userId: target.userId, isApproved });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setApproving(null);
      toast.success(isApproved ? 'Account approved.' : 'Approval revoked.');
      router.refresh();
    });
  };

  const handleActivationConfirm = (): void => {
    if (!activating) {
      return;
    }

    const target = activating;
    const isActive = !target.isActive;

    startWorking(async () => {
      const result = await deactivateUserAction({ userId: target.userId, isActive });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setActivating(null);
      toast.success(isActive ? 'Account reactivated.' : 'Account deactivated.');
      router.refresh();
    });
  };

  const handleDeleteConfirm = (): void => {
    if (!deleting) {
      return;
    }

    const target = deleting;

    startWorking(async () => {
      const result = await deleteUserAction({ userId: target.userId });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setDeleting(null);
      toast.success('Account deleted.');
      router.refresh();
    });
  };

  const handleEditOpenChange = (open: boolean): void => {
    if (!open) {
      setEditing(null);
    }
  };

  const handleApprovingOpenChange = (open: boolean): void => {
    if (!open) {
      setApproving(null);
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
        title="Staff accounts"
        description="Create, approve, edit and deactivate the doctor, nurse, lab and administrator accounts. Patients are registered separately."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_USERS_NEW.HREF} />}>
            <UserPlus className="size-4" />
            Add account
          </Button>
        }
      />

      <UsersFilters />

      {users.length === 0 ? (
        <UsersEmpty filtered={filtered} />
      ) : (
        <UsersTable
          users={users}
          viewer={viewer}
          onEdit={handleEdit}
          onApproval={handleApproval}
          onActivation={handleActivation}
          onDelete={handleDelete}
        />
      )}

      {editing && <UserEditDialog key={editing.userId} user={editing} onUpdated={handleUpdated} onOpenChange={handleEditOpenChange} />}

      <UserConfirmDialog
        user={approving}
        title={approving?.isApproved ? 'Revoke approval' : 'Approve this account'}
        description={
          approving?.isApproved
            ? 'The account will no longer be able to sign in until it is approved again.'
            : 'The account will be able to sign in once approved.'
        }
        confirmLabel={approving?.isApproved ? 'Revoke approval' : 'Approve'}
        isWorking={isWorking}
        error={confirmError}
        onConfirm={handleApprovalConfirm}
        onOpenChange={handleApprovingOpenChange}
      />

      <UserConfirmDialog
        user={activating}
        title={activating?.isActive ? 'Deactivate this account' : 'Reactivate this account'}
        description={
          activating?.isActive
            ? 'The account will be refused at its next sign-in. Its history is kept, and it can be reactivated later.'
            : 'The account will be able to sign in again.'
        }
        confirmLabel={activating?.isActive ? 'Deactivate' : 'Reactivate'}
        isWorking={isWorking}
        error={confirmError}
        onConfirm={handleActivationConfirm}
        onOpenChange={handleActivatingOpenChange}
      />

      <UserConfirmDialog
        user={deleting}
        title="Delete this account"
        description="This permanently removes the account. It cannot be undone — deactivate instead if you may need the record later."
        confirmLabel="Delete account"
        isWorking={isWorking}
        error={confirmError}
        destructive
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeletingOpenChange}
      />
    </div>
  );
}
