'use server';

import { USER_ROLES } from '@/constants';
import { AppointmentDto } from '@/types';

import { gateRoles } from '@/lib/auth';
import { ListResult, SingleResult, listFailureWithErrors, singleFailureWithErrors } from '@/lib/result';
import { AppointmentSelfBookSchema } from '@/lib/schemas';
import { BookableSlot, PatientPortalService } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const portalService = new PatientPortalService();

/*
  The patient's own two writes over the portal. Both gate to the patient role and take the acting
  account from the session — a patient books their own visit, and the patient the booking is for is
  never a value the request carries.
*/

/**
 * Book an appointment for the signed-in patient. The patient is pinned from the session.
 *
 * @param values - Raw form values, validated here (no patient id — the portal supplies it).
 *
 * @returns The booked appointment, or a failure carrying the reason.
 */
export async function bookOwnAppointmentAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateRoles<AppointmentDto>([USER_ROLES.PATIENT]);

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentSelfBookSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return portalService.bookForSelf(validation.data, gate.requester);
}

/**
 * The free slots for a doctor on a date, for the patient's own slot picker.
 *
 * @param doctorId - The doctor.
 * @param date - The day.
 *
 * @returns The bookable slots, or a failure.
 */
export async function patientAvailableSlotsAction(doctorId: string, date: string): Promise<ListResult<BookableSlot>> {
  const gate = await gateRoles<BookableSlot>([USER_ROLES.PATIENT]);

  if (!gate.allowed) {
    return listFailureWithErrors(gate.refusal.errors);
  }

  return portalService.computeSlotsForSelf(doctorId, date);
}
