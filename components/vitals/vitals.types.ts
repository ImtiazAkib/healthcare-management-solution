import type { VitalsRecordInput } from '@/lib/schemas';

import type { VitalsReadingKey } from '@/constants';
import type { AppointmentDto, TriagePriority, Vitals } from '@/types';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';

/*
  One place for the shapes the vitals screen passes around. The domain types are re-exported from
  their homes so the components import them from here rather than reaching across the app, and the
  local prop types live beside them.
*/
export type { AppointmentDto, TriagePriority, Vitals, VitalsReadingKey };

/**
 * The reading inputs are wired to the parent form's `register`; `control` lets each banded reading
 * flag itself against its normal range as the value is typed, via a single `useWatch` the compiler
 * can memoize.
 */
export type VitalsFieldsProps = {
  register: UseFormRegister<VitalsRecordInput>;
  errors: FieldErrors<VitalsRecordInput>;
  control: Control<VitalsRecordInput>;
};

export type VitalsFormProps = {
  appointmentId: string;
  vitals: Vitals | null;
};

export type TriageControlProps = {
  appointmentId: string;
  priority: TriagePriority;
};

export type TriagePriorityBadgeProps = {
  priority: TriagePriority;
};

export type VitalsScreenProps = {
  appointment: AppointmentDto;
  patientName: string;
  medicalRecordNo: string;
};
