'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { isSuccess } from '@/lib/result';
import { EncounterUpdateInput, EncounterUpdateOutput, EncounterUpdateSchema } from '@/lib/schemas';

import { Button } from '@/components/ui';

import { completeEncounterAction, updateEncounterAction } from './actions';
import { EncounterDiagnosisFields } from './encounter-diagnosis.fields';
import { EncounterNotesFields } from './encounter-notes.fields';

import type { DiagnosisRow, EncounterDetail } from './encounters.types';

type EncounterFormProps = {
  // The record view's shape — the form reads only its scalar fields and the diagnoses, never the addenda.
  encounter: EncounterDetail;
};

/*
  The editable consultation, shown only while the encounter is open. The four text fields ride
  react-hook-form against the update schema; the diagnoses are a repeatable list the form holds in
  its own state and merges into the payload at submit, where the schema drops the blank rows.

  Two writes leave here. **Save** keeps the encounter open and records what has been written so
  far — a consultation is written across a visit, not in one keystroke. **Complete** closes it: a
  completed encounter is a record, corrected afterwards by a dated addendum rather than an
  overwrite, so it asks first. The service is the authority on both — a well-formed submit can
  still come back refused, and the banner carries its reason.
*/
export function EncounterForm({ encounter }: EncounterFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>(() =>
    encounter.diagnoses.map(diagnosis => ({ description: diagnosis.description, code: diagnosis.code ?? '' }))
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EncounterUpdateInput, undefined, EncounterUpdateOutput>({
    resolver: zodResolver(EncounterUpdateSchema),
    defaultValues: {
      encounterId: encounter.encounterId,
      chiefComplaint: encounter.chiefComplaint ?? '',
      examination: encounter.examination ?? '',
      treatmentNotes: encounter.treatmentNotes ?? '',
      followUpDate: encounter.followUpDate ?? '',
    },
  });

  // Registered so the schema sees it; no visible input carries the id the update writes against.
  register('encounterId');

  const isWorking = isSubmitting || isCompleting;

  const handleFormSubmit = async (values: EncounterUpdateOutput): Promise<void> => {
    setFormError(null);

    const result = await updateEncounterAction({ ...values, diagnoses });

    if (isSuccess(result)) {
      toast.success('Encounter saved.');
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCompleteClick = async (): Promise<void> => {
    if (!window.confirm('Complete this encounter? Once completed it can only be corrected with an addendum.')) {
      return;
    }

    setFormError(null);
    setIsCompleting(true);

    const result = await completeEncounterAction({ encounterId: encounter.encounterId });

    setIsCompleting(false);

    if (isSuccess(result)) {
      toast.success('Encounter completed.');
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

      <EncounterNotesFields register={register} errors={errors} />

      <EncounterDiagnosisFields entries={diagnoses} onEntriesChange={setDiagnoses} />

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="submit" variant="outline" disabled={isWorking}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>

        <Button type="button" variant="default" disabled={isWorking} onClick={handleCompleteClick}>
          {isCompleting ? 'Completing…' : 'Complete encounter'}
        </Button>
      </div>
    </form>
  );
}
