/**
 * A doctor an appointment can be booked against, as offered to the pickers.
 *
 * Re-exported under the feature so its components share one name for the option shape rather
 * than each reaching into the service layer for it.
 */
export type { DoctorOption } from '@/lib/services';

/**
 * A patient the counter can book for, as offered to the book form's picker.
 */
export type { PatientSummaryDto } from '@/types';

/**
 * An appointment row with the names the list shows.
 */
export type { AppointmentRow } from '@/lib/services';

/**
 * A slot the picker hands back when one is chosen: just the two times the booking needs. The
 * room the doctor sits in comes back with the slot but is not part of what a booking stores —
 * the appointment inherits the room from the availability block it lands in.
 */
export type SelectedSlot = {
  startTime: string;
  endTime: string;
};
