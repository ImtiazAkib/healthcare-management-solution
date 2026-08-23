'use client';

import { Plus, X } from 'lucide-react';

import { Button, Input, Label } from '@/components/ui';

import type { DiagnosisRow } from './encounters.types';

type EncounterDiagnosisFieldsProps = {
  /** The current rows — the parent owns them; blank rows are dropped by the schema on submit. */
  entries: DiagnosisRow[];
  onEntriesChange: (next: DiagnosisRow[]) => void;
};

/*
  A repeatable list of diagnoses — a description and an optional code per row, add and remove.

  Kept out of react-hook-form on the same reasoning as the patient registry's string lists: RHF's
  `useFieldArray` fights a plain owned array the whole way. The parent holds the rows in ordinary
  state and merges them into the payload at submit, where the schema drops the blank rows and
  refuses a code with no description. No coded vocabulary ships with this app, so the code is a
  free-text field beside the description rather than a lookup.
*/
export function EncounterDiagnosisFields({ entries, onEntriesChange }: EncounterDiagnosisFieldsProps) {
  const handleDescriptionChange = (index: number, value: string): void => {
    onEntriesChange(entries.map((entry, position) => (position === index ? { ...entry, description: value } : entry)));
  };

  const handleCodeChange = (index: number, value: string): void => {
    onEntriesChange(entries.map((entry, position) => (position === index ? { ...entry, code: value } : entry)));
  };

  const handleRemoveClick = (index: number): void => {
    onEntriesChange(entries.filter((_, position) => position !== index));
  };

  const handleAddClick = (): void => {
    onEntriesChange([...entries, { description: '', code: '' }]);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="diagnosis-description-0">Diagnoses</Label>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">None recorded.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            // Index key is safe here: the inputs are controlled, so the value always reflects state.
            <div key={index} className="flex items-start gap-2">
              <Input
                id={`diagnosis-description-${index}`}
                value={entry.description}
                placeholder="Diagnosis"
                aria-label="Diagnosis"
                className="flex-1"
                onChange={event => handleDescriptionChange(index, event.target.value)}
              />
              <Input
                id={`diagnosis-code-${index}`}
                value={entry.code}
                placeholder="Code (optional)"
                aria-label="Diagnosis code"
                className="w-28 sm:w-36"
                onChange={event => handleCodeChange(index, event.target.value)}
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove diagnosis" onClick={() => handleRemoveClick(index)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddClick}>
        <Plus className="size-4" />
        Add diagnosis
      </Button>
    </div>
  );
}
