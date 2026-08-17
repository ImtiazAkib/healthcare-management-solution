'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { DepartmentCreateInput, DepartmentCreateOutput, DepartmentCreateSchema } from '@/lib/schemas';

import { Button } from '@/components/ui';

import { createDepartmentAction } from './actions';
import { DepartmentFields } from './department-fields';

import type { DepartmentHeadOption } from './departments.types';

type DepartmentCreateFormProps = {
  headOptions: DepartmentHeadOption[];
};

/*
  A page rather than a dialog: creating a department gets its own URL, which makes it linkable
  and survivable on a refresh, and gives the fields room a popup would not.
*/
export function DepartmentCreateForm({ headOptions }: DepartmentCreateFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentCreateInput, undefined, DepartmentCreateOutput>({
    resolver: zodResolver(DepartmentCreateSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      headDoctorId: '',
    },
  });

  const handleFormSubmit = async (values: DepartmentCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await createDepartmentAction(values);

    if (isSuccess(result)) {
      toast.success('Department created.');
      router.push(ROUTES.ADMIN_DEPARTMENTS.HREF);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_DEPARTMENTS.HREF);
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <DepartmentFields idPrefix="create" register={register} control={control} errors={errors} headOptions={headOptions} />

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create department'}
        </Button>
      </div>
    </form>
  );
}
