'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { isSuccess } from '@/lib/result';

import { Button, Label, Textarea } from '@/components/ui';

import { issuePrescriptionAction, supersedePrescriptionAction } from './actions';
import { PrescriptionItemFields } from './prescription-item.fields';
import { DEFAULT_PRESCRIPTION_FREQUENCY } from './prescriptions.types';

import type { PrescriptionItemDto, PrescriptionItemRow } from './prescriptions.types';

type PrescriptionFormProps = {
  /** `issue` writes a new script; `replace` supersedes an existing one with a fresh one. */
  mode: 'issue' | 'replace';
  encounterId: string;
  /** The prescription being replaced. Required when `mode` is `replace`, ignored otherwise. */
  prescriptionId?: string;
  /** Seed rows for a replacement — the original's items, copied so they can be edited. */
  initialItems?: PrescriptionItemDto[];
  initialAdvice?: string;
  /** Called after a successful write — the panel uses it to close the hosting dialog. */
  onDone?: () => void;
};

/** Turn a stored item into an editable row: nulls become empty strings, frequency keeps its value. */
function toRow(item: PrescriptionItemDto): PrescriptionItemRow {
  return {
    drug: item.drug,
    strength: item.strength ?? '',
    dose: item.dose ?? '',
    frequency: item.frequency,
    duration: item.duration ?? '',
    instructions: item.instructions ?? '',
  };
}

/** A fresh, empty row — the drug blank, the frequency seeded to the first value. */
function blankRow(): PrescriptionItemRow {
  return { drug: '', strength: '', dose: '', frequency: DEFAULT_PRESCRIPTION_FREQUENCY, duration: '', instructions: '' };
}

/*
  Writing a prescription — the same form for issuing a new one and replacing an existing one, since
  both edit the same shape. The drug rows are a repeatable list the form holds in its own state and
  merges into the payload at submit; the schema validates every row, so a half-filled one is caught
  rather than silently issued.

  A prescription is immutable once issued, so a "change" is a new prescription that supersedes the
  old — which is why `replace` seeds the new form from the original's items and posts against the
  original's id. The service is the authority on both writes: a well-formed submit can still come
  back refused — the encounter has closed, the script was already replaced — and the banner carries
  the reason.
*/
export function PrescriptionForm({ mode, encounterId, prescriptionId, initialItems, initialAdvice, onDone }: PrescriptionFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<PrescriptionItemRow[]>(() => (initialItems && initialItems.length > 0 ? initialItems.map(toRow) : [blankRow()]));
  const [advice, setAdvice] = useState(initialAdvice ?? '');

  const handleAdviceChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setAdvice(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const result =
      mode === 'replace'
        ? await supersedePrescriptionAction({ prescriptionId, items, advice })
        : await issuePrescriptionAction({ encounterId, items, advice });

    setIsSubmitting(false);

    if (isSuccess(result)) {
      toast.success(mode === 'replace' ? 'Prescription replaced.' : 'Prescription issued.');
      router.refresh();
      onDone?.();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <PrescriptionItemFields items={items} onItemsChange={setItems} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="prescription-advice">
          Advice <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id="prescription-advice" rows={3} placeholder="General advice for the patient" value={advice} onChange={handleAdviceChange} />
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : mode === 'replace' ? 'Replace prescription' : 'Issue prescription'}
        </Button>
      </div>
    </form>
  );
}
