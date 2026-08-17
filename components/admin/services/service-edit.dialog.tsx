'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ServiceItemDto } from '@/types';

import { isSuccess } from '@/lib/result';
import { ServiceItemCreateInput, ServiceItemCreateOutput, ServiceItemCreateSchema } from '@/lib/schemas';
import { formatMoney } from '@/lib/utils';

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';

import { updateServiceAction } from './actions';
import { ServiceFields } from './service-fields';

type ServiceEditDialogProps = {
  service: ServiceItemDto;
  onUpdated: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Mounted only while a row is selected, and keyed on that row's id by the parent. That is what
  fills the form: `defaultValues` is read once per mount, so a fresh mount per row replaces the
  effect that would otherwise copy the service in — and clears a stale error from the previous
  attempt for free.

  The five editable fields are the same as the create page's, so they share one component and
  this form is typed on the create input. The service's id is not a field a person edits, so it
  rides along from the row in a closure and is added to the payload at submit; the server action
  validates the whole thing against `ServiceItemUpdateSchema`.

  The stored price is integer minor units; `formatMoney` renders it back to the major-unit text
  the price box shows, and the schema turns whatever is submitted back into minor units.
*/
export function ServiceEditDialog({ service, onUpdated, onOpenChange }: ServiceEditDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceItemCreateInput, undefined, ServiceItemCreateOutput>({
    resolver: zodResolver(ServiceItemCreateSchema),
    defaultValues: {
      name: service.name,
      code: service.code,
      category: service.category,
      description: service.description ?? '',
      price: formatMoney(service.priceMinorUnits),
    },
  });

  const handleFormSubmit = async (values: ServiceItemCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await updateServiceAction({ ...values, serviceItemId: service.serviceItemId });

    if (isSuccess(result)) {
      onUpdated();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit service</DialogTitle>
          <DialogDescription>
            Correct the name, code, category, description or price. A new price applies from now on — invoices already raised keep the price they
            billed.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </p>
          )}

          <ServiceFields idPrefix="edit" register={register} control={control} errors={errors} />

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
              Cancel
            </Button>

            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
