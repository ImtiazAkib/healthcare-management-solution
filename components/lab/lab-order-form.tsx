'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { LAB_PRIORITIES, LAB_PRIORITY_LABELS } from '@/constants';

import { isSuccess } from '@/lib/result';

import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';

import { createLabOrderAction } from './actions';
import { LabTestFields } from './lab-test.fields';

import type { LabPriority, LabTestRow } from './lab.types';

type LabOrderFormProps = {
  encounterId: string;
  /** Called after a successful order — the panel uses it to close the hosting dialog. */
  onDone?: () => void;
};

const PRIORITY_ITEMS: Record<string, string> = LAB_PRIORITY_LABELS;

/** Narrow the Select's chosen value back to a priority without a cast; anything else falls back. */
function toPriority(value: unknown): LabPriority {
  const match = Object.values(LAB_PRIORITIES).find(priority => priority === value);

  return match ?? LAB_PRIORITIES.ROUTINE;
}

/*
  Ordering lab work from the doctor's own open encounter. The tests are a repeatable list the form
  holds in its own state and merges into the payload at submit; the schema validates every row, so a
  half-filled one is caught rather than silently ordered.

  The service is the authority: a well-formed submit can still come back refused — the encounter has
  closed, for one — and the banner carries the reason.
*/
export function LabOrderForm({ encounterId, onDone }: LabOrderFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tests, setTests] = useState<LabTestRow[]>([{ name: '', code: '' }]);
  const [priority, setPriority] = useState<LabPriority>(LAB_PRIORITIES.ROUTINE);
  const [notes, setNotes] = useState('');

  const handleNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setNotes(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const result = await createLabOrderAction({ encounterId, tests, priority, notes });

    setIsSubmitting(false);

    if (isSuccess(result)) {
      toast.success('Lab order placed.');
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

      <LabTestFields tests={tests} onTestsChange={setTests} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="lab-order-priority">Priority</Label>
        <Select items={PRIORITY_ITEMS} value={priority} onValueChange={value => setPriority(toPriority(value))}>
          <SelectTrigger id="lab-order-priority" className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="lab-order-notes">
          Notes <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id="lab-order-notes" rows={3} placeholder="Anything the lab should know" value={notes} onChange={handleNotesChange} />
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Order lab work'}
        </Button>
      </div>
    </form>
  );
}
