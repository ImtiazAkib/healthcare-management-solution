'use client';

import { Plus, X } from 'lucide-react';
import { Controller, useFieldArray } from 'react-hook-form';

import { APP_DATA } from '@/constants';

import type { InvoiceCreateInput, InvoiceCreateOutput } from '@/lib/schemas';
import { formatMoney } from '@/lib/utils';

import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import type { ServiceItemOption } from './billing.types';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

type InvoiceLineFieldsProps = {
  // The full three-generic control, so it matches the parent's `useForm<Input, undefined, Output>`.
  control: Control<InvoiceCreateInput, undefined, InvoiceCreateOutput>;
  register: UseFormRegister<InvoiceCreateInput>;
  errors: FieldErrors<InvoiceCreateInput>;
  services: ServiceItemOption[];
};

/*
  The lines of an invoice — a repeatable list, one catalogue service and a quantity per row.

  Unlike the prescription and diagnosis lists, these rows are objects the schema submits directly, so
  they ride in react-hook-form's own field array rather than in owned state: `useFieldArray` is built
  for exactly this — an array of `{ serviceItemId, quantity }` — and keeps the values, the validation
  and the submit in one place. At least one row is always present; the remove control is disabled on
  the last one rather than dropping it, so there is always somewhere to pick a service.

  A row submits only the id and the quantity — never a price or a line total. The price shown beside
  each service is a reading aid; the server prices every line from the catalogue when it raises the bill.
*/
export function InvoiceLineFields({ control, register, errors, services }: InvoiceLineFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  // The picker's option labels: code, name and the current catalogue price, so the person billing sees
  // what a line will cost before the server totals it.
  const serviceItems: Record<string, string> = Object.fromEntries(
    services.map(service => [
      service.serviceItemId,
      `${service.code} · ${service.name} — ${APP_DATA.CURRENCY.SYMBOL}${formatMoney(service.priceMinorUnits)}`,
    ])
  );

  const handleAddClick = (): void => {
    append({ serviceItemId: '', quantity: 1 });
  };

  const handleRemoveClick = (index: number): void => {
    remove(index);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>Services</Label>

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const lineErrors = errors.lines?.[index];

          return (
            <div key={field.id} className="border-border flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Controller
                    control={control}
                    name={`lines.${index}.serviceItemId`}
                    render={({ field: selectField }) => (
                      <Select items={serviceItems} value={selectField.value} onValueChange={selectField.onChange}>
                        <SelectTrigger aria-label="Service" aria-invalid={Boolean(lineErrors?.serviceItemId)} className="w-full">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(serviceItems).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {lineErrors?.serviceItemId && <FormMessage>Choose a service for this line.</FormMessage>}
                </div>

                <div className="flex w-24 flex-col gap-1.5 sm:w-28">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    aria-label="Quantity"
                    aria-invalid={Boolean(lineErrors?.quantity)}
                    {...register(`lines.${index}.quantity`)}
                  />
                  {lineErrors?.quantity && <FormMessage>At least 1.</FormMessage>}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove line"
                  className="shrink-0"
                  disabled={fields.length === 1}
                  onClick={() => handleRemoveClick(index)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* The array's own "at least one line" rule surfaces here — an invoice with no service is refused. */}
      {errors.lines?.root && <FormMessage>Add at least one service.</FormMessage>}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddClick}>
        <Plus className="size-4" />
        Add service
      </Button>
    </div>
  );
}
