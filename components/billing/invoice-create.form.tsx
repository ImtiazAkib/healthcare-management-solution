'use client';

import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { APP_DATA, ROUTES } from '@/constants';

import { isSuccess } from '@/lib/result';
import { InvoiceCreateInput, InvoiceCreateOutput, InvoiceCreateSchema } from '@/lib/schemas';
import { formatMoney, toMinorUnits } from '@/lib/utils';

import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import { raiseInvoiceAction } from './actions';
import { InvoiceLineFields } from './invoice-line.fields';

import type { PatientOption, ServiceItemOption } from './billing.types';

type InvoiceCreateFormProps = {
  patients: PatientOption[];
  services: ServiceItemOption[];
};

/** The currency symbol prefixes every amount; formatting is the same helper everywhere. */
function money(minorUnits: number): string {
  return `${APP_DATA.CURRENCY.SYMBOL}${formatMoney(minorUnits)}`;
}

/** A typed major-unit box to minor units for the preview only — an unreadable one reads as zero. */
function previewMinor(value: string | undefined): number {
  if (!value || value.trim() === '') {
    return 0;
  }

  const minor = toMinorUnits(value);

  return Number.isFinite(minor) ? minor : 0;
}

/*
  Raising an invoice — a page of its own, so it is linkable and survives a refresh, with room the
  services list needs. The person picks a patient, adds catalogue services with quantities, and sets
  an optional discount and tax; the form submits only ids, quantities and those two figures.

  The totals box is a **preview**, computed in the browser from the catalogue prices for reassurance —
  it is never submitted and never trusted. The server re-prices every line from the catalogue and adds
  the bill up itself, so a well-formed submit can still come back with a slightly different total (a
  price changed between load and submit); the banner carries any refusal, and on success the new
  invoice's detail page is where its authoritative totals live.
*/
export function InvoiceCreateForm({ patients, services }: InvoiceCreateFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const hasPatients = patients.length > 0;
  const hasServices = services.length > 0;

  const patientItems: Record<string, string> = Object.fromEntries(
    patients.map(patient => [patient.patientId, `${patient.name} · MRN ${patient.medicalRecordNo}`])
  );

  // A price lookup for the live preview — the only place the browser touches a price at all.
  const priceById = useMemo(() => new Map(services.map(service => [service.serviceItemId, service.priceMinorUnits])), [services]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceCreateInput, undefined, InvoiceCreateOutput>({
    resolver: zodResolver(InvoiceCreateSchema),
    defaultValues: {
      patientId: '',
      encounterId: '',
      lines: [{ serviceItemId: '', quantity: 1 }],
      discountMinorUnits: '',
      taxMinorUnits: '',
    },
  });

  // Watched at the top level, never inside the row map, so the preview re-totals as any line changes.
  const lines = useWatch({ control, name: 'lines' });
  const discountInput = useWatch({ control, name: 'discountMinorUnits' });
  const taxInput = useWatch({ control, name: 'taxMinorUnits' });

  const subtotalMinor = (lines ?? []).reduce((sum, line) => {
    const price = priceById.get(line.serviceItemId) ?? 0;
    const quantity = Number(line.quantity);

    return sum + price * (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  const discountMinor = previewMinor(discountInput);
  const taxMinor = previewMinor(taxInput);
  const totalMinor = Math.max(0, subtotalMinor - discountMinor + taxMinor);

  const handleFormSubmit = async (values: InvoiceCreateOutput): Promise<void> => {
    setFormError(null);

    const result = await raiseInvoiceAction(values);

    if (isSuccess(result) && result.result) {
      toast.success('Invoice raised.');
      router.push(`/admin/invoices/${result.result.invoiceId}`);
      router.refresh();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    router.push(ROUTES.ADMIN_INVOICES.HREF);
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invoice-patient">Patient</Label>
          {hasPatients ? (
            <Controller
              control={control}
              name="patientId"
              render={({ field }) => (
                <Select items={patientItems} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invoice-patient" aria-invalid={Boolean(errors.patientId)} className="w-full">
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(patientItems).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
              No patients are registered yet — register a patient before raising a bill.
            </p>
          )}
          {errors.patientId && <FormMessage>Choose the patient this bill is for.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invoice-encounter">
            Encounter ID <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="invoice-encounter"
            placeholder="Link to a visit, if any"
            aria-invalid={Boolean(errors.encounterId)}
            {...register('encounterId')}
          />
          {errors.encounterId && <FormMessage>Enter a valid encounter ID, or leave it blank.</FormMessage>}
        </div>
      </div>

      {hasServices ? (
        <InvoiceLineFields control={control} register={register} errors={errors} services={services} />
      ) : (
        <p className="border-border text-muted-foreground rounded-md border border-dashed px-3 py-2 text-sm">
          No active services in the catalogue — add a service before raising a bill.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invoice-discount">
            Discount <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="invoice-discount"
            inputMode="decimal"
            placeholder="0.00"
            aria-invalid={Boolean(errors.discountMinorUnits)}
            {...register('discountMinorUnits')}
          />
          {errors.discountMinorUnits && <FormMessage>Enter a valid discount, or leave it blank.</FormMessage>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="invoice-tax">
            Tax <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="invoice-tax"
            inputMode="decimal"
            placeholder="0.00"
            aria-invalid={Boolean(errors.taxMinorUnits)}
            {...register('taxMinorUnits')}
          />
          {errors.taxMinorUnits && <FormMessage>Enter a valid tax amount, or leave it blank.</FormMessage>}
        </div>
      </div>

      {/* A reassurance, not a receipt: the server prices and totals the bill when it raises it. */}
      <div className="border-border bg-muted/40 flex flex-col gap-1.5 rounded-md border p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums">{money(subtotalMinor)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span className="tabular-nums">− {money(discountMinor)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span className="tabular-nums">+ {money(taxMinor)}</span>
        </div>
        <div className="border-border mt-1.5 flex items-center justify-between border-t pt-1.5 font-medium">
          <span>Estimated total</span>
          <span className="tabular-nums">{money(totalMinor)}</span>
        </div>
        <p className="text-muted-foreground text-xs">A preview from current prices — the final total is calculated when the invoice is raised.</p>
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
          Cancel
        </Button>

        <Button type="submit" variant="default" disabled={isSubmitting || !hasPatients || !hasServices}>
          {isSubmitting ? 'Raising…' : 'Raise invoice'}
        </Button>
      </div>
    </form>
  );
}
