'use client';

import { Controller } from 'react-hook-form';

import type { DepartmentCreateInput } from '@/lib/schemas';

import { FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';

import type { DepartmentHeadOption } from './departments.types';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

/*
  The value the head Select carries when no doctor is assigned. The create and update schemas
  both accept `''` for `headDoctorId`, so the "unassigned" choice is a real, submittable value
  rather than a cleared field.
*/
const NO_HEAD_VALUE = '';
const NO_HEAD_LABEL = 'No head assigned';

type DepartmentFieldsProps = {
  /*
    Create and edit render identical fields, so they share this component. It is typed to the
    create shape — the edit dialog carries the `departmentId` outside the form and merges it in
    on submit, which is what lets one `Control` serve both without a cast.
  */
  register: UseFormRegister<DepartmentCreateInput>;
  control: Control<DepartmentCreateInput>;
  errors: FieldErrors<DepartmentCreateInput>;
  headOptions: DepartmentHeadOption[];
  /** Prefixes element ids so the page and the dialog can both mount these fields without a clash. */
  idPrefix: string;
};

export function DepartmentFields({ register, control, errors, headOptions, idPrefix }: DepartmentFieldsProps) {
  /*
    Always offer "No head assigned"; add a row per assignable doctor. When the list is empty the
    field still renders with only that first row — doctors are created in a later step, so an
    empty list is the expected early state rather than an error.
  */
  const headItems: Record<string, string> = { [NO_HEAD_VALUE]: NO_HEAD_LABEL };

  for (const option of headOptions) {
    headItems[option.doctorId] = `${option.name} · ${option.specialization}`;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Full name</Label>
        <Input id={`${idPrefix}-name`} aria-invalid={Boolean(errors.name)} {...register('name')} />
        {errors.name && <FormMessage>Enter a name of up to 120 characters.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-code`}>Code</Label>
        <Input id={`${idPrefix}-code`} autoCapitalize="characters" aria-invalid={Boolean(errors.code)} {...register('code')} />
        {errors.code ? (
          <FormMessage>Use 2–12 letters or digits, e.g. CARD.</FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">Short, e.g. CARD.</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>
          Description <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id={`${idPrefix}-description`} aria-invalid={Boolean(errors.description)} {...register('description')} />
        {errors.description && <FormMessage>Keep the description under 500 characters.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-head`}>
          Head doctor <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Controller
          control={control}
          name="headDoctorId"
          render={({ field }) => (
            <Select items={headItems} value={field.value ?? NO_HEAD_VALUE} onValueChange={field.onChange}>
              <SelectTrigger id={`${idPrefix}-head`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(headItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.headDoctorId && <FormMessage>Choose a doctor from the list, or leave it unassigned.</FormMessage>}
      </div>
    </div>
  );
}
