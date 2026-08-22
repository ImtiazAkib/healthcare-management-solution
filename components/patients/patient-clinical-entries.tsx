'use client';

import { Plus, X } from 'lucide-react';

import { Button, Input, Label } from '@/components/ui';

type PatientClinicalEntriesProps = {
  label: string;
  /** The current entries — a plain string list the parent owns; blanks are dropped on submit. */
  entries: string[];
  onEntriesChange: (next: string[]) => void;
  placeholder: string;
  addLabel: string;
  /** Disambiguates input ids between the two lists (allergies, conditions) on one form. */
  idPrefix: string;
};

/*
  A repeatable text list — one allergy or one condition per row, add and remove.

  Kept out of react-hook-form on purpose: RHF's `useFieldArray` is built around arrays of
  objects, and forcing a `string[]` through it fights the types the whole way. The parent holds
  the list in ordinary state and merges it into the payload at submit, where the schema drops the
  blank rows. Shared by the register form and the edit dialog, so the two behave the same.
*/
export function PatientClinicalEntries({ label, entries, onEntriesChange, placeholder, addLabel, idPrefix }: PatientClinicalEntriesProps) {
  const handleEntryChange = (index: number, value: string): void => {
    onEntriesChange(entries.map((entry, position) => (position === index ? value : entry)));
  };

  const handleRemoveClick = (index: number): void => {
    onEntriesChange(entries.filter((_, position) => position !== index));
  };

  const handleAddClick = (): void => {
    onEntriesChange([...entries, '']);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${idPrefix}-0`}>{label}</Label>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">None recorded.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            // Index key is safe here: the inputs are controlled, so the value always reflects state.
            <div key={index} className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-${index}`}
                value={entry}
                placeholder={placeholder}
                onChange={event => handleEntryChange(index, event.target.value)}
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove entry" onClick={() => handleRemoveClick(index)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddClick}>
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}
