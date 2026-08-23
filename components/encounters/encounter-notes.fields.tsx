'use client';

import type { EncounterUpdateInput } from '@/lib/schemas';

import { FormMessage, Input, Label, Textarea } from '@/components/ui';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';

type EncounterNotesFieldsProps = {
  register: UseFormRegister<EncounterUpdateInput>;
  errors: FieldErrors<EncounterUpdateInput>;
};

/*
  The free-text of the consultation: the complaint the visit opened on, what the examination found,
  the plan, and an optional follow-up date. Wired to the parent form's `register` so the schema
  validates them and the same form submits them; the diagnoses sit in their own repeatable list
  beside these.
*/
export function EncounterNotesFields({ register, errors }: EncounterNotesFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="encounter-chief-complaint">Chief complaint</Label>
        <Textarea id="encounter-chief-complaint" rows={2} aria-invalid={Boolean(errors.chiefComplaint)} {...register('chiefComplaint')} />
        {errors.chiefComplaint && <FormMessage>Keep the complaint under 500 characters.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="encounter-examination">Examination</Label>
        <Textarea id="encounter-examination" rows={4} aria-invalid={Boolean(errors.examination)} {...register('examination')} />
        {errors.examination && <FormMessage>Examination notes are too long.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="encounter-treatment-notes">Treatment notes</Label>
        <Textarea id="encounter-treatment-notes" rows={4} aria-invalid={Boolean(errors.treatmentNotes)} {...register('treatmentNotes')} />
        {errors.treatmentNotes && <FormMessage>Treatment notes are too long.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="encounter-follow-up">
          Follow-up date <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id="encounter-follow-up" type="date" aria-invalid={Boolean(errors.followUpDate)} {...register('followUpDate')} />
        {errors.followUpDate && <FormMessage>Use a date such as 2026-08-23.</FormMessage>}
      </div>
    </div>
  );
}
