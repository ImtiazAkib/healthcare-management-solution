'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { USER_ROLES } from '@/constants/roles.const';
import { ROUTES } from '@/constants/routes.const';

import { isSuccess } from '@/lib/result';
import { UserCreateInput, UserCreateOutput, UserCreateSchema } from '@/lib/schemas';

import { Button, FormMessage, Input, Label, PasswordInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import { createUserAction } from './actions';

import type { UsersViewer } from './users.types';

type UserCreateFormProps = {
  viewer: UsersViewer;
};

/*
  A page rather than a dialog: creating an account gets its own URL, which makes it linkable
  and survivable on a refresh, and gives the fields room a popup would not.

  Who each creator may make: the super administrator creates administrators and only
  administrators; an ordinary administrator creates the clinical staff — doctor, nurse, lab.
  The patient and the super administrator are offered to nobody, and `UserService` refuses any
  request that steps outside this, so the single-option select a super administrator sees is a
  courtesy rather than the control.
*/
const STAFF_ROLE_ITEMS: Record<string, string> = {
  [USER_ROLES.DOCTOR]: 'Doctor',
  [USER_ROLES.NURSE]: 'Nurse',
  [USER_ROLES.LAB]: 'Diagnostic lab',
};

export function UserCreateForm({ viewer }: UserCreateFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const roleItems: Record<string, string> = viewer.isSuperAdmin ? { [USER_ROLES.ADMIN]: 'Administrator' } : STAFF_ROLE_ITEMS;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateInput, undefined, UserCreateOutput>({
    resolver: zodResolver(UserCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: viewer.isSuperAdmin ? USER_ROLES.ADMIN : USER_ROLES.DOCTOR,
      phone: '',
    },
  });

  const handleFormSubmit = async (values: UserCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await createUserAction(values);

    if (isSuccess(result)) {
      toast.success('Account created.');
      router.push(ROUTES.ADMIN_USERS.HREF);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_USERS.HREF);
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="create-name">Full name</Label>
          <Input id="create-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          {errors.name && <FormMessage>Enter a name of up to 120 characters.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="create-email">Email address</Label>
          <Input id="create-email" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register('email')} />
          {errors.email && <FormMessage>Enter a valid email address.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="create-password">Initial password</Label>
          <PasswordInput id="create-password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register('password')} />
          {errors.password && <FormMessage>Use at least 8 characters.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="create-role">Role</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select items={roleItems} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="create-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.role && <FormMessage>Choose a valid role.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="create-phone">
            Phone <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input id="create-phone" type="tel" placeholder="01712345678" aria-invalid={Boolean(errors.phone)} {...register('phone')} />
          {errors.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
        </div>
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
