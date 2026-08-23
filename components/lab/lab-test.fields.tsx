'use client';

import { Plus, X } from 'lucide-react';

import { Button, Input, Label } from '@/components/ui';

import type { LabTestRow } from './lab.types';

type LabTestFieldsProps = {
  /** The current rows — the parent owns them; every row is validated by the schema on submit. */
  tests: LabTestRow[];
  onTestsChange: (next: LabTestRow[]) => void;
};

/** A fresh, empty row — both parts blank. */
function blankRow(): LabTestRow {
  return { name: '', code: '' };
}

/*
  The tests of a lab order — a repeatable list, one test per row, add and remove.

  Kept out of react-hook-form on the same reasoning as the prescription's drugs: the parent holds
  the rows in ordinary state and merges them into the payload at submit, where the schema validates
  every one. At least one row is always present — removing the last re-seeds a blank one to keep
  typing into.
*/
export function LabTestFields({ tests, onTestsChange }: LabTestFieldsProps) {
  const handleNameChange = (index: number, value: string): void => {
    onTestsChange(tests.map((test, position) => (position === index ? { ...test, name: value } : test)));
  };

  const handleCodeChange = (index: number, value: string): void => {
    onTestsChange(tests.map((test, position) => (position === index ? { ...test, code: value } : test)));
  };

  const handleRemoveClick = (index: number): void => {
    // At least one row always remains — dropping the last leaves a blank to keep typing into.
    const remaining = tests.filter((_, position) => position !== index);

    onTestsChange(remaining.length > 0 ? remaining : [blankRow()]);
  };

  const handleAddClick = (): void => {
    onTestsChange([...tests, blankRow()]);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="lab-test-0">Tests</Label>

      <div className="flex flex-col gap-2">
        {tests.map((test, index) => (
          // Index key is safe here: the inputs are controlled, so the value always reflects state.
          <div key={index} className="flex items-start gap-2">
            <Input
              id={`lab-test-${index}`}
              value={test.name}
              placeholder="Test"
              aria-label="Test"
              className="flex-1"
              onChange={event => handleNameChange(index, event.target.value)}
            />
            <Input
              value={test.code}
              placeholder="Code"
              aria-label="Test code"
              className="w-28 font-mono uppercase sm:w-36"
              onChange={event => handleCodeChange(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove test"
              className="shrink-0"
              onClick={() => handleRemoveClick(index)}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleAddClick}>
        <Plus className="size-4" />
        Add test
      </Button>
    </div>
  );
}
