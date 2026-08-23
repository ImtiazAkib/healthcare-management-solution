'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Ban } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { InvoiceDto } from '@/types';

import { isSuccess } from '@/lib/result';
import { InvoiceVoidInput, InvoiceVoidOutput, InvoiceVoidSchema } from '@/lib/schemas';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormMessage,
  Label,
  Textarea,
} from '@/components/ui';

import { voidInvoiceAction } from './actions';

type InvoiceVoidDialogProps = {
  invoice: InvoiceDto;
};

/*
  Voiding an invoice — a deliberate act, never a delete, so it keeps its history and must carry a
  reason. Its own trigger and open state, like the payment dialog, so a detail page drops it in. The
  reason is required by the schema; the service is the authority on whether a void is allowed at all
  (a fully paid bill is refunded, not voided), so a refusal comes back in the banner.
*/
export function InvoiceVoidDialog({ invoice }: InvoiceVoidDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceVoidInput, undefined, InvoiceVoidOutput>({
    resolver: zodResolver(InvoiceVoidSchema),
    defaultValues: {
      invoiceId: invoice.invoiceId,
      reason: '',
    },
  });

  const handleFormSubmit = async (values: InvoiceVoidOutput): Promise<void> => {
    setFormError(null);

    const result = await voidInvoiceAction(values);

    if (isSuccess(result)) {
      setOpen(false);
      toast.success('Invoice voided.');
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleTriggerClick = (): void => {
    setFormError(null);
    setOpen(true);
  };

  const handleCancelClick = (): void => {
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={handleTriggerClick}>
        <Ban className="size-4" />
        Void invoice
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void this invoice</DialogTitle>
            <DialogDescription>
              The bill is cancelled but kept, with the reason on its record. This cannot be undone — raise a fresh invoice if one is still owed.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
                {formError}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="void-reason">Reason</Label>
              <Textarea
                id="void-reason"
                rows={3}
                placeholder="Why this invoice is being voided"
                aria-invalid={Boolean(errors.reason)}
                {...register('reason')}
              />
              {errors.reason && <FormMessage>Give a reason for the void.</FormMessage>}
            </div>

            <DialogFooter className="-mx-4 -mb-4">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
                Cancel
              </Button>

              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? 'Voiding…' : 'Void invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
