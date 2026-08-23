'use client';

import { Plus, X } from 'lucide-react';

import { PRESCRIPTION_FREQUENCIES, PRESCRIPTION_FREQUENCY_LABELS } from '@/constants';

import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

import { DEFAULT_PRESCRIPTION_FREQUENCY } from './prescriptions.types';

import type { PrescriptionFrequency, PrescriptionItemRow } from './prescriptions.types';

type PrescriptionItemFieldsProps = {
  /** The current rows — the parent owns them; every row is validated by the schema on submit. */
  items: PrescriptionItemRow[];
  onItemsChange: (next: PrescriptionItemRow[]) => void;
};

const FREQUENCY_ITEMS: Record<string, string> = PRESCRIPTION_FREQUENCY_LABELS;

/** A fresh, empty row — the drug blank, the frequency seeded to the first value. */
function blankRow(): PrescriptionItemRow {
  return { drug: '', strength: '', dose: '', frequency: DEFAULT_PRESCRIPTION_FREQUENCY, duration: '', instructions: '' };
}

/** Narrow the Select's chosen value back to a frequency without a cast; anything else falls back. */
function toFrequency(value: unknown): PrescriptionFrequency {
  const match = Object.values(PRESCRIPTION_FREQUENCIES).find(frequency => frequency === value);

  return match ?? DEFAULT_PRESCRIPTION_FREQUENCY;
}

/*
  The drugs of a prescription — a repeatable list, one drug per row, add and remove.

  Kept out of react-hook-form on the same reasoning as the encounter's diagnoses: RHF's
  `useFieldArray` fights a plain owned array the whole way. The parent holds the rows in ordinary
  state and merges them into the payload at submit. Unlike the diagnosis list, no row is dropped —
  a half-filled row is somebody who was interrupted, so the schema validates every one — which is
  why at least one row is always present: removing the last row re-seeds a blank one instead.
*/
export function PrescriptionItemFields({ items, onItemsChange }: PrescriptionItemFieldsProps) {
  const handleDrugChange = (index: number, value: string): void => {
    onItemsChange(items.map((item, position) => (position === index ? { ...item, drug: value } : item)));
  };

  const handleStrengthChange = (index: number, value: string): void => {
    onItemsChange(items.map((item, position) => (position === index ? { ...item, strength: value } : item)));
  };

  const handleDoseChange = (index: number, value: string): void => {
    onItemsChange(items.map((item, position) => (position === index ? { ...item, dose: value } : item)));
  };

  const handleFrequencyChange = (index: number, value: PrescriptionFrequency): void => {
    onItemsChange(items.map((item, position) => (position === index ? { ...item, frequency: value } : item)));
  };

  const handleDurationChange = (index: number, value: string): void => {
    onItemsChange(items.map((item, position) => (position === index ? { ...item, duration: value } : item)));
  };

  const handleInstructionsChange = (index: number, value: string): void => {
    onItemsChange(items.map((item, position) => (position === index ? { ...item, instructions: value } : item)));
  };

  const handleRemoveClick = (index: number): void => {
    // At least one row always remains — dropping the last leaves a blank to keep typing into.
    const remaining = items.filter((_, position) => position !== index);

    onItemsChange(remaining.length > 0 ? remaining : [blankRow()]);
  };

  const handleAddClick = (): void => {
    onItemsChange([...items, blankRow()]);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="prescription-drug-0">Drugs</Label>

      <div className="flex flex-col gap-4">
        {items.map((item, index) => (
          // Index key is safe here: the inputs are controlled, so the value always reflects state.
          <div key={index} className="border-border flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <Input
                id={`prescription-drug-${index}`}
                value={item.drug}
                placeholder="Drug"
                aria-label="Drug"
                className="flex-1"
                onChange={event => handleDrugChange(index, event.target.value)}
              />
              <Input
                value={item.strength}
                placeholder="Strength"
                aria-label="Strength"
                className="w-28 sm:w-36"
                onChange={event => handleStrengthChange(index, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove drug"
                className="shrink-0"
                onClick={() => handleRemoveClick(index)}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Input value={item.dose} placeholder="Dose" aria-label="Dose" onChange={event => handleDoseChange(index, event.target.value)} />

              <Select items={FREQUENCY_ITEMS} value={item.frequency} onValueChange={value => handleFrequencyChange(index, toFrequency(value))}>
                <SelectTrigger aria-label="Frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={item.duration}
                placeholder="Duration"
                aria-label="Duration"
                onChange={event => handleDurationChange(index, event.target.value)}
              />
            </div>

            <Input
              value={item.instructions}
              placeholder="Instructions (optional)"
              aria-label="Instructions"
              onChange={event => handleInstructionsChange(index, event.target.value)}
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddClick}>
        <Plus className="size-4" />
        Add drug
      </Button>
    </div>
  );
}
