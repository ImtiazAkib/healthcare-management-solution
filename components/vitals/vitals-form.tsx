'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { BMI_CATEGORY_LABELS } from '@/constants';

import { isSuccess } from '@/lib/result';
import { VitalsRecordInput, VitalsRecordOutput, VitalsRecordSchema } from '@/lib/schemas';
import { bmiCategory, computeBmi } from '@/lib/utils';

import { Button } from '@/components/ui';

import { recordVitalsAction } from './actions';
import { VitalsFields, readingToNumber } from './vitals-fields';

import type { VitalsFormProps } from './vitals.types';

/*
  The write side of the vitals a nurse takes at check-in — the counterpart to the read-only panel a
  doctor sees later. Every reading is optional: a box left blank means "not taken", which the schema
  keeps distinct from zero. The readings seed from whatever was recorded before, so re-opening the
  screen edits the existing set rather than starting from empty.

  BMI is shown live from weight and height as they are typed — a label beside the readings, not a
  stored field. The service is the authority on the write; a well-formed submit can still come back
  refused, and the banner carries its reason.
*/
export function VitalsForm({ appointmentId, vitals }: VitalsFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VitalsRecordInput, undefined, VitalsRecordOutput>({
    resolver: zodResolver(VitalsRecordSchema),
    defaultValues: {
      appointmentId,
      systolic: vitals?.systolic ?? '',
      diastolic: vitals?.diastolic ?? '',
      pulse: vitals?.pulse ?? '',
      temperature: vitals?.temperature ?? '',
      respiratoryRate: vitals?.respiratoryRate ?? '',
      oxygenSaturation: vitals?.oxygenSaturation ?? '',
      weight: vitals?.weight ?? '',
      height: vitals?.height ?? '',
    },
  });

  // Registered so the schema sees it; no visible input carries the id the vitals are recorded against.
  register('appointmentId');

  const [weightValue, heightValue] = useWatch({ control, name: ['weight', 'height'] });
  const bmi = computeBmi(readingToNumber(weightValue), readingToNumber(heightValue));
  const bmiBand = bmi === null ? null : bmiCategory(bmi);

  const handleFormSubmit = async (values: VitalsRecordOutput): Promise<void> => {
    setFormError(null);

    const result = await recordVitalsAction(values);

    if (isSuccess(result)) {
      toast.success('Vitals recorded.');
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <VitalsFields register={register} errors={errors} control={control} />

      <div className="border-border flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        {bmi !== null && bmiBand ? (
          <p className="text-muted-foreground text-sm">
            BMI <span className="text-foreground font-medium">{bmi}</span> · {BMI_CATEGORY_LABELS[bmiBand]}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">Enter weight and height to see BMI.</p>
        )}

        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save vitals'}
        </Button>
      </div>
    </form>
  );
}
