'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { UserDto } from '@/types';

import { isSuccess } from '@/lib/result';
import { UserUpdateInput, UserUpdateOutput, UserUpdateSchema } from '@/lib/schemas';
import { resolveRoleLabel } from '@/lib/utils';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormMessage,
  Input,
  Label,
} from '@/components/ui';

import { updateUserAction } from './actions';

type UserEditDialogProps = {
  user: UserDto;
  onUpdated: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Mounted only while a row is selected, and keyed on that row's id by the parent. That is
  what fills the form: `defaultValues` is read once per mount, so a fresh mount per row
  replaces the effect that would otherwise copy the user in — and clears a stale error from
  the previous attempt for free.

  The role is shown but not editable: a role is set at creation and never moved. `UserService`
  refuses a change regardless of what the form sends, so this is a courtesy, not the control.
*/
export function UserEditDialog({ user, onUpdated, onOpenChange }: UserEditDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateInput, undefined, UserUpdateOutput>({
    resolver: zodResolver(UserUpdateSchema),
    defaultValues: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
    },
  });

  const handleFormSubmit = async (values: UserUpdateOutput): Promise<void> => {
    setFormError(null);

    const result = await updateUserAction(values);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>Correct the name, email or phone. The role is set when the account is created and cannot be changed.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          {formError && (
            <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </p>
          )}

          <input type="hidden" {...register('userId')} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Full name</Label>
            <Input id="edit-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
            {errors.name && <FormMessage>Enter a name of up to 120 characters.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-email">Email address</Label>
            <Input id="edit-email" type="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register('email')} />
            {errors.email && <FormMessage>Enter a valid email address.</FormMessage>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-role">Role</Label>
            {/* Locked on purpose — display only. */}
            <Input id="edit-role" value={resolveRoleLabel(user.role)} readOnly disabled />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-phone">
              Phone <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input id="edit-phone" type="tel" placeholder="01712345678" aria-invalid={Boolean(errors.phone)} {...register('phone')} />
            {errors.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
          </div>

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
