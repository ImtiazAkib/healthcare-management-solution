'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { PatientDetailDto } from '@/types';

import { isSuccess } from '@/lib/result';
import { PatientUpdateInput, PatientUpdateOutput, PatientUpdateSchema } from '@/lib/schemas';

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
  Textarea,
} from '@/components/ui';

import { updatePatientAction } from './actions';
import { PatientClinicalEntries } from './patient-clinical-entries';
import { BLOOD_GROUP_ITEMS } from './patients.types';

type PatientEditDialogProps = {
  patient: PatientDetailDto;
  onUpdated: () => void;
  onOpenChange: (open: boolean) => void;
};

/*
  Edits the clinical record only — blood group, allergies, conditions, the emergency contact and
  the address. The name, email and record number are the account's or the registry's, not an edit
  a clinical screen makes.

  Mounted only while open and keyed on the patient id by the parent, so `defaultValues` and the
  entry-list state fill once per mount. The id rides in a hidden field; the server action
  re-validates the whole object against `PatientUpdateSchema`.
*/
export function PatientEditDialog({ patient, onUpdated, onOpenChange }: PatientEditDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[]>(patient.allergies);
  const [chronicConditions, setChronicConditions] = useState<string[]>(patient.chronicConditions);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PatientUpdateInput, undefined, PatientUpdateOutput>({
    resolver: zodResolver(PatientUpdateSchema),
    defaultValues: {
      patientId: patient.patientId,
      bloodGroup: patient.bloodGroup ?? '',
      address: patient.address ?? '',
      emergencyContact: patient.emergencyContact ?? { name: '', relation: '', phone: '' },
    },
  });

  const handleFormSubmit = async (values: PatientUpdateOutput): Promise<void> => {
    setFormError(null);

    const result = await updatePatientAction({ ...values, allergies, chronicConditions });

    if (isSuccess(result)) {
      onUpdated();

      return;
    }

    setFormError(result.errors[0]?.error ?? 'Something went wrong. Try again.');
  };

  const handleCancelClick = (): void => {
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit clinical record</DialogTitle>
          <DialogDescription>
            Blood group, allergies, conditions, the emergency contact and the address. The name and record number are fixed.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto">
          {formError && (
            <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {formError}
            </p>
          )}

          <input type="hidden" {...register('patientId')} />

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label htmlFor="edit-blood-group">Blood group</Label>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <Select items={BLOOD_GROUP_ITEMS} value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-blood-group" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOOD_GROUP_ITEMS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <PatientClinicalEntries
            label="Allergies"
            entries={allergies}
            onEntriesChange={setAllergies}
            placeholder="e.g. penicillin (rash, 2019)"
            addLabel="Add allergy"
            idPrefix="edit-allergy"
          />

          <PatientClinicalEntries
            label="Chronic conditions"
            entries={chronicConditions}
            onEntriesChange={setChronicConditions}
            placeholder="e.g. type 2 diabetes"
            addLabel="Add condition"
            idPrefix="edit-condition"
          />

          <fieldset className="flex flex-col gap-4">
            <legend className="text-foreground text-sm font-medium">
              Emergency contact <span className="text-muted-foreground text-xs font-normal">(fill all three or leave blank)</span>
            </legend>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-contact-name">Name</Label>
              <Input id="edit-contact-name" aria-invalid={Boolean(errors.emergencyContact?.name)} {...register('emergencyContact.name')} />
              {errors.emergencyContact?.name && <FormMessage>Give the contact a name.</FormMessage>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-contact-relation">Relationship</Label>
              <Input
                id="edit-contact-relation"
                placeholder="e.g. spouse"
                aria-invalid={Boolean(errors.emergencyContact?.relation)}
                {...register('emergencyContact.relation')}
              />
              {errors.emergencyContact?.relation && <FormMessage>How are they related?</FormMessage>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-contact-phone">Phone</Label>
              <Input
                id="edit-contact-phone"
                type="tel"
                placeholder="01712345678"
                aria-invalid={Boolean(errors.emergencyContact?.phone)}
                {...register('emergencyContact.phone')}
              />
              {errors.emergencyContact?.phone && <FormMessage>Enter a valid Bangladesh mobile number.</FormMessage>}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-address">Address</Label>
            <Textarea id="edit-address" rows={2} aria-invalid={Boolean(errors.address)} {...register('address')} />
            {errors.address && <FormMessage>Keep the address under 250 characters.</FormMessage>}
          </div>

          <DialogFooter className="-mx-4 -mb-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancelClick}>
              Cancel
            </Button>

            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
