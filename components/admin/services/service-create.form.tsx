'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ROUTES } from '@/constants/routes.const';
import { SERVICE_CATEGORIES } from '@/constants/service.const';

import { isSuccess } from '@/lib/result';
import { ServiceItemCreateInput, ServiceItemCreateOutput, ServiceItemCreateSchema } from '@/lib/schemas';

import { Button } from '@/components/ui';

import { createServiceAction } from './actions';
import { ServiceFields } from './service-fields';

/*
  A page rather than a dialog: adding a service gets its own URL, which makes it linkable and
  survivable on a refresh, and gives the fields room a popup would not.

  The `price` field is the string a person types (`'500.50'`); the schema turns it into an
  integer count of minor units, so nothing here converts it — the input hands the text straight
  to the resolver.
*/
export function ServiceCreateForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceItemCreateInput, undefined, ServiceItemCreateOutput>({
    resolver: zodResolver(ServiceItemCreateSchema),
    defaultValues: {
      name: '',
      code: '',
      category: SERVICE_CATEGORIES.CONSULTATION,
      description: '',
      price: '',
    },
  });

  const handleFormSubmit = async (values: ServiceItemCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await createServiceAction(values);

    if (isSuccess(result)) {
      toast.success('Service created.');
      router.push(ROUTES.ADMIN_SERVICES.HREF);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_SERVICES.HREF);
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <ServiceFields idPrefix="create" register={register} control={control} errors={errors} />

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add service'}
        </Button>
      </div>
    </form>
  );
}
