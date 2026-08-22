import type { ReactNode } from 'react';

import type { DoctorOption, QueueEntry } from '@/lib/services';

/**
 * The queue and waiting-room row shape, and the doctor a nurse can pick, re-exported under the
 * feature so its components share one name for each rather than reaching into the service layer.
 */
export type { DoctorOption, QueueEntry } from '@/lib/services';

/** Whose queue this is. A doctor works their own list; a nurse watches a doctor they pick. */
export type QueueRole = 'doctor' | 'nurse';

export type QueueScreenProps = {
  /** The live queue — checked-in patients, most urgent first, then by token. */
  entries: QueueEntry[];
  /** The nurse's waiting room — booked patients not yet checked in. Absent for a doctor. */
  waiting?: QueueEntry[];
  role: QueueRole;
  /** The nurse's doctor picker, rendered on the server and slotted in. Absent for a doctor. */
  doctorPicker?: ReactNode;
};

export type QueueRowProps = {
  entry: QueueEntry;
  role: QueueRole;
  /** True while any action is in flight, so every row's buttons disable together. */
  isWorking: boolean;
  onStart: (entry: QueueEntry) => void;
  onComplete: (entry: QueueEntry) => void;
};

/*
  The buttons for one row, split by where the row sits. A live-queue row is the doctor's to move
  through consultation; a waiting-room row is the nurse's to admit or write off. The discriminant
  keeps each context to exactly the callbacks it can fire.
*/
export type QueueActionsProps =
  | {
      context: 'queue';
      entry: QueueEntry;
      role: QueueRole;
      isWorking: boolean;
      onStart: (entry: QueueEntry) => void;
      onComplete: (entry: QueueEntry) => void;
    }
  | {
      context: 'waiting';
      entry: QueueEntry;
      isWorking: boolean;
      onCheckIn: (entry: QueueEntry) => void;
      onNoShow: (entry: QueueEntry) => void;
    };

export type NurseQueueDoctorFilterProps = {
  doctorOptions: DoctorOption[];
  /** The doctor currently in view — the validated `?doctorId`, or the first when none was chosen. */
  value: string;
};
