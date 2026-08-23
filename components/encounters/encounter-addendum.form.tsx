'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { isSuccess } from '@/lib/result';
import { EncounterAddendumInput, EncounterAddendumOutput, EncounterAddendumSchema } from '@/lib/schemas';

import { Button, FormMessage, Label, Textarea } from '@/components/ui';

import { addAddendumAction } from './actions';

type EncounterAddendumFormProps = {
  encounterId: string;
};

/*
  The one write a completed encounter allows. An addendum never replaces what was written — it is
  added, attributed and dated — so a correction after the visit is closed is honest about being a
  later note rather than a silent edit of the record.
*/
export function EncounterAddendumForm({ encounterId }: EncounterAddendumFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EncounterAddendumInput, undefined, EncounterAddendumOutput>({
    resolver: zodResolver(EncounterAddendumSchema),
    defaultValues: {
      encounterId,
      note: '',
    },
  });

  // Registered so the schema sees it; no visible input carries the id the addendum attaches to.
  register('encounterId');

  const handleFormSubmit = async (values: EncounterAddendumOutput): Promise<void> => {
    setFormError(null);

    const result = await addAddendumAction(values);

    if (isSuccess(result)) {
      toast.success('Addendum added.');
      reset({ encounterId, note: '' });
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-3">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="encounter-addendum">Add an addendum</Label>
        <Textarea
          id="encounter-addendum"
          rows={3}
          placeholder="A dated correction or note added after this encounter was completed."
          aria-invalid={Boolean(errors.note)}
          {...register('note')}
        />
        {errors.note && <FormMessage>Write the correction, under 2000 characters.</FormMessage>}
      </div>

      <div className="flex sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add addendum'}
        </Button>
      </div>
    </form>
  );
}
