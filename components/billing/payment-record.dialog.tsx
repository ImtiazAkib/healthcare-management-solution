'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { APP_DATA, PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from '@/constants';
import { InvoiceDto } from '@/types';

import { isSuccess } from '@/lib/result';
import { PaymentRecordInput, PaymentRecordOutput, PaymentRecordSchema } from '@/lib/schemas';
import { formatMoney } from '@/lib/utils';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

import { recordPaymentAction } from './actions';

type PaymentRecordDialogProps = {
  invoice: InvoiceDto;
};

/*
  Recording a payment taken at the counter. Its own trigger and open state, so a detail page drops it
  in as one control. The amount box seeds with the outstanding balance — the common case is settling
  the whole bill — but stays editable for a part payment; the service is what checks the amount
  against the balance, so an over-payment comes back refused with a reason in the banner.

  The stored balance is integer minor units; `formatMoney` seeds the box in major units, and the
  schema converts whatever is submitted back to minor units at its edge.
*/
export function PaymentRecordDialog({ invoice }: PaymentRecordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PaymentRecordInput, undefined, PaymentRecordOutput>({
    resolver: zodResolver(PaymentRecordSchema),
    defaultValues: {
      invoiceId: invoice.invoiceId,
      amountMinorUnits: formatMoney(invoice.balanceMinorUnits),
      method: PAYMENT_METHODS.CASH,
      reference: '',
    },
  });

  const handleFormSubmit = async (values: PaymentRecordOutput): Promise<void> => {
    setFormError(null);

    const result = await recordPaymentAction(values);

    if (isSuccess(result)) {
      setOpen(false);
      toast.success('Payment recorded.');
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
      <Button type="button" variant="default" onClick={handleTriggerClick}>
        <CreditCard className="size-4" />
        Record payment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Take a payment at the counter against this invoice. The outstanding balance is {APP_DATA.CURRENCY.SYMBOL}
              {formatMoney(invoice.balanceMinorUnits)}.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
            {formError && (
              <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
                {formError}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-amount">Amount ({APP_DATA.CURRENCY.SYMBOL})</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={Boolean(errors.amountMinorUnits)}
                {...register('amountMinorUnits')}
              />
              {errors.amountMinorUnits && <FormMessage>Enter the amount taken.</FormMessage>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-method">Method</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select items={PAYMENT_METHOD_LABELS} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="payment-method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.method && <FormMessage>Choose how the payment was taken.</FormMessage>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment-reference">
                Reference <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="payment-reference"
                placeholder="Receipt or transaction number"
                aria-invalid={Boolean(errors.reference)}
                {...register('reference')}
              />
              {errors.reference && <FormMessage>Keep the reference under 120 characters.</FormMessage>}
            </div>

            <DialogFooter className="-mx-4 -mb-4">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
                Cancel
              </Button>

              <Button type="submit" variant="default" disabled={isSubmitting}>
                {isSubmitting ? 'Recording…' : 'Record payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
