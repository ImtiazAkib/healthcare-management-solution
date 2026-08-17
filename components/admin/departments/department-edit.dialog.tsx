'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { DepartmentDto } from '@/types';

import { isSuccess } from '@/lib/result';
import { DepartmentCreateInput, DepartmentCreateOutput, DepartmentCreateSchema } from '@/lib/schemas';

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';

import { updateDepartmentAction } from './actions';
import { DepartmentFields } from './department-fields';

import type { DepartmentHeadOption } from './departments.types';

type DepartmentEditDialogProps = {
  department: DepartmentDto;
  headOptions: DepartmentHeadOption[];
  onUpdated: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Mounted only while a row is selected, and keyed on that row's id by the parent. That is what
  fills the form: `defaultValues` is read once per mount, so a fresh mount per row replaces the
  effect that would otherwise copy the department in — and clears a stale error from the
  previous attempt for free.

  The form is typed to the create shape so it can share `DepartmentFields` with the create page.
  The `departmentId` the update needs is not a field the user edits, so it is held from the
  `department` prop and merged in on submit rather than carried through the form.
*/
export function DepartmentEditDialog({ department, headOptions, onUpdated, onOpenChange }: DepartmentEditDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentCreateInput, undefined, DepartmentCreateOutput>({
    resolver: zodResolver(DepartmentCreateSchema),
    defaultValues: {
      name: department.name,
      code: department.code,
      description: department.description ?? '',
      headDoctorId: department.headDoctorId ?? '',
    },
  });

  const handleFormSubmit = async (values: DepartmentCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await updateDepartmentAction({ ...values, departmentId: department.departmentId });

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
          <DialogTitle>Edit department</DialogTitle>
          <DialogDescription>Correct the name, code, description or the doctor who heads this department.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </p>
          )}

          <DepartmentFields idPrefix="edit" register={register} control={control} errors={errors} headOptions={headOptions} />

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
