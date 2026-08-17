'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ServiceItemDto } from '@/types';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';

import { Button, PageHeader } from '@/components/ui';

import { deactivateServiceAction, deleteServiceAction } from './actions';
import { ServiceConfirmDialog } from './service-confirm.dialog';
import { ServiceEditDialog } from './service-edit.dialog';
import { ServicesEmpty } from './services-empty';
import { ServicesFilters } from './services-filters';
import { ServicesTable } from './services-table';

type ServicesScreenProps = {
  services: ServiceItemDto[];
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
export function ServicesScreen({ services, filtered }: ServicesScreenProps) {
  const router = useRouter();
  const [isWorking, startWorking] = useTransition();

  const [editing, setEditing] = useState<ServiceItemDto | null>(null);
  const [activating, setActivating] = useState<ServiceItemDto | null>(null);
  const [deleting, setDeleting] = useState<ServiceItemDto | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleEdit = (service: ServiceItemDto): void => {
    setEditing(service);
  };

  const handleUpdated = (): void => {
    setEditing(null);
    toast.success('Service updated.');
    router.refresh();
  };

  const handleActivation = (service: ServiceItemDto): void => {
    setConfirmError(null);
    setActivating(service);
  };

  const handleDelete = (service: ServiceItemDto): void => {
    setConfirmError(null);
    setDeleting(service);
  };

  const handleActivationConfirm = (): void => {
    if (!activating) {
      return;
    }

    const target = activating;
    const isActive = !target.isActive;

    startWorking(async () => {
      const result = await deactivateServiceAction({ serviceItemId: target.serviceItemId, isActive });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setActivating(null);
      toast.success(isActive ? 'Service reactivated.' : 'Service deactivated.');
      router.refresh();
    });
  };

  const handleDeleteConfirm = (): void => {
    if (!deleting) {
      return;
    }

    const target = deleting;

    startWorking(async () => {
      const result = await deleteServiceAction({ serviceItemId: target.serviceItemId });

      if (!isSuccess(result)) {
        setConfirmError(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      setDeleting(null);
      toast.success('Service deleted.');
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
        title="Service catalogue"
        description="The priced services the hospital offers — consultations, lab tests, procedures and more — that billing draws on."
        actions={
          <Button variant="default" nativeButton={false} render={<Link href={ROUTES.ADMIN_SERVICES_NEW.HREF} />}>
            <Plus className="size-4" />
            Add service
          </Button>
        }
      />

      <ServicesFilters />

      {services.length === 0 ? (
        <ServicesEmpty filtered={filtered} />
      ) : (
        <ServicesTable services={services} onEdit={handleEdit} onActivation={handleActivation} onDelete={handleDelete} />
      )}

      {editing && <ServiceEditDialog key={editing.serviceItemId} service={editing} onUpdated={handleUpdated} onOpenChange={handleEditOpenChange} />}

      <ServiceConfirmDialog
        service={activating}
        title={activating?.isActive ? 'Deactivate this service' : 'Reactivate this service'}
        description={
          activating?.isActive
            ? 'The service will be removed from every picker. Invoices already raised keep the price they billed.'
            : 'The service will be offered again.'
        }
        confirmLabel={activating?.isActive ? 'Deactivate' : 'Reactivate'}
        isWorking={isWorking}
        error={confirmError}
        onConfirm={handleActivationConfirm}
        onOpenChange={handleActivatingOpenChange}
      />

      <ServiceConfirmDialog
        service={deleting}
        title="Delete this service"
        description="This permanently removes the service. It cannot be undone — deactivate instead to keep it off new pickers while older records still resolve it."
        confirmLabel="Delete service"
        isWorking={isWorking}
        error={confirmError}
        destructive
        onConfirm={handleDeleteConfirm}
        onOpenChange={handleDeletingOpenChange}
      />
    </div>
  );
}
