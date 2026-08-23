'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { isSuccess } from '@/lib/result';
import { ProfileContactInput, ProfileContactOutput, ProfileContactSchema } from '@/lib/schemas';

import { updateContactAction } from '@/components/profile/actions';
import { Button, FormMessage, Input, Label, Textarea } from '@/components/ui';

import type { ProfileProps } from './profile.types';

/*
  A patient's own contact details: who to call in an emergency, and where they live. Rendered only for
  a patient, because these hang off the patient record a staff account does not have.

  The emergency contact is all-or-nothing — the stored sub-document needs a name, a relation and a
  phone together — so the schema insists on the three as a set and reports the gap on whichever box is
  still empty. Nothing clinical is here on purpose: a patient-supplied allergy overwriting a
  clinician's is a safety problem, so allergies and conditions are not reachable from this form.
*/
export function ProfileEmergencyContactForm({ profile }: ProfileProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileContactInput, undefined, ProfileContactOutput>({
    resolver: zodResolver(ProfileContactSchema),
    defaultValues: {
      emergencyName: profile.emergencyContact?.name ?? '',
      emergencyRelation: profile.emergencyContact?.relation ?? '',
      emergencyPhone: profile.emergencyContact?.phone ?? '',
      address: profile.address ?? '',
    },
  });

  const handleFormSubmit = async (values: ProfileContactOutput): Promise<void> => {
    setFormError(null);

    const result = await updateContactAction(values);

    if (isSuccess(result) && result.result) {
      toast.success('Contact details saved.');
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
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
          <Label htmlFor="emergency-name">
            Contact name <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input id="emergency-name" aria-invalid={Boolean(errors.emergencyName)} {...register('emergencyName')} />
          {errors.emergencyName && <FormMessage>Enter the contact name, or clear all three boxes.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="emergency-relation">
            Relation <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="emergency-relation"
            placeholder="Spouse, parent, sibling…"
            aria-invalid={Boolean(errors.emergencyRelation)}
            {...register('emergencyRelation')}
          />
          {errors.emergencyRelation && <FormMessage>Enter how they are related, or clear all three boxes.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2 sm:max-w-xs">
          <Label htmlFor="emergency-phone">
            Contact phone <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="emergency-phone"
            type="tel"
            placeholder="01712345678"
            aria-invalid={Boolean(errors.emergencyPhone)}
            {...register('emergencyPhone')}
          />
          {errors.emergencyPhone && <FormMessage>Enter a contact phone, or clear all three boxes.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="patient-address">
            Address <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Textarea id="patient-address" rows={3} aria-invalid={Boolean(errors.address)} {...register('address')} />
          {errors.address && <FormMessage>Keep the address shorter.</FormMessage>}
        </div>
      </div>

      <div className="border-border flex border-t pt-5 sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save contact details'}
        </Button>
      </div>
    </form>
  );
}
