import { Controller } from 'react-hook-form';

import { APP_DATA } from '@/constants/app-data.const';
import { SERVICE_CATEGORY_LABELS } from '@/constants/service.const';

import { FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@/components/ui';

import type { ServiceFieldsProps } from './services.types';

/*
  The five fields a service is made of, shared by the create page and the edit dialog because
  the two forms edit exactly the same shape — one component rather than two that would drift.

  `idPrefix` keeps the ids unique when both a page and a dialog can be mounted at once: `label`
  points its `htmlFor` at an id, and two `create-name`s on the page would tie a click on one
  label to the other's box.

  Category is a controlled `Select` — react-hook-form does not see a Base UI select's changes
  through `register`, so a `Controller` bridges it. The rest are plain registered inputs.
*/
const CATEGORY_ITEMS: Record<string, string> = SERVICE_CATEGORY_LABELS;

export function ServiceFields({ idPrefix, register, control, errors }: ServiceFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input id={`${idPrefix}-name`} aria-invalid={Boolean(errors.name)} {...register('name')} />
        {errors.name && <FormMessage>Enter a service name of up to 120 characters.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-code`}>Code</Label>
        <Input id={`${idPrefix}-code`} className="font-mono uppercase" aria-invalid={Boolean(errors.code)} {...register('code')} />
        {errors.code ? (
          <FormMessage>Use 2–16 letters or digits, e.g. CBC.</FormMessage>
        ) : (
          <p className="text-muted-foreground text-xs">Short, e.g. CBC. Stored upper-cased.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select items={CATEGORY_ITEMS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={`${idPrefix}-category`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.category && <FormMessage>Choose a valid category.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-price`}>Price</Label>
          <span className="text-muted-foreground text-xs">In {APP_DATA.CURRENCY.SYMBOL}</span>
        </div>
        <Input id={`${idPrefix}-price`} inputMode="decimal" placeholder="0.00" aria-invalid={Boolean(errors.price)} {...register('price')} />
        {errors.price && <FormMessage>Enter a valid price.</FormMessage>}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>
          Description <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id={`${idPrefix}-description`} rows={3} aria-invalid={Boolean(errors.description)} {...register('description')} />
        {errors.description && <FormMessage>Keep the description under 500 characters.</FormMessage>}
      </div>
    </div>
  );
}
