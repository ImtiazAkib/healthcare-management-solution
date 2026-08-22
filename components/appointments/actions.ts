'use server';

import { AppointmentDto } from '@/types';

import { gateAdminArea } from '@/lib/auth';
import { ListResult, SingleResult, listFailureWithErrors, singleFailureWithErrors } from '@/lib/result';
import { AppointmentCreateSchema, AppointmentRescheduleSchema, AppointmentStatusSchema } from '@/lib/schemas';
import { AppointmentService } from '@/lib/services';
import type { BookableSlot } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const appointmentService = new AppointmentService();

/**
 * Book an appointment at the counter.
 *
 * The admin books on the patient's behalf, so the requester's id is stamped as `bookedById`
 * rather than any id the browser sends. The service re-checks that the slot still exists in the
 * doctor's published hours and that nothing already holds it — a slot the picker offered can be
 * taken by another writer between reading it and booking it — so a well-formed request can still
 * come back refused.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The booked appointment, or a failure carrying the reason.
 */
export async function bookAppointmentAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateAdminArea<AppointmentDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentCreateSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return appointmentService.book(validation.data, gate.requester.userId);
}

/**
 * Move an appointment to a new time, and possibly a new doctor.
 *
 * The patient never changes — that would be giving somebody else's slot away — so the payload
 * carries no `patientId`. The new slot is re-checked against availability and the double-booking
 * index the same way a fresh booking is.
 *
 * @param values - Raw form values, validated here rather than trusted.
 *
 * @returns The rescheduled appointment, or a failure carrying the reason.
 */
export async function rescheduleAppointmentAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateAdminArea<AppointmentDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentRescheduleSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return appointmentService.reschedule(validation.data);
}

/**
 * Move an appointment along its lifecycle. The cancel dialog uses it with `status: 'cancelled'`
 * and a reason; which transitions are legal is the service's decision.
 *
 * The requester's id is recorded as the actor behind the change.
 *
 * @param values - Raw values carrying the appointment id, the new status and an optional reason.
 *
 * @returns The updated appointment, or a failure carrying the reason.
 */
export async function changeAppointmentStatusAction(values: unknown): Promise<SingleResult<AppointmentDto>> {
  const gate = await gateAdminArea<AppointmentDto>();

  if (!gate.allowed) {
    return gate.refusal;
  }

  const validation = AppointmentStatusSchema.safeParse(values);

  if (!validation.success) {
    return singleFailureWithErrors(mapZodErrorsToErrorDto(validation.error));
  }

  return appointmentService.changeStatus(validation.data, gate.requester.userId);
}

/**
 * The free slots a doctor has on a given day, for the slot picker.
 *
 * A typed read rather than a mutation: it only admits the caller to the area, then delegates. The
 * service tolerates a missing doctor or a bad date by returning an empty list, so the picker can
 * call it optimistically as the two fields are filled in.
 *
 * @param doctorId - The doctor whose hours are being read.
 * @param date - The calendar day, `YYYY-MM-DD`.
 * @param excludeAppointmentId - An appointment to ignore when counting taken slots, so a
 *                               reschedule sees its own current slot as free. Null when booking new.
 *
 * @returns The bookable slots, or a failure when the caller is refused the area.
 */
export async function availableSlotsAction(
  doctorId: string,
  date: string,
  excludeAppointmentId: string | null = null
): Promise<ListResult<BookableSlot>> {
  const gate = await gateAdminArea<BookableSlot>();

  if (!gate.allowed) {
    return listFailureWithErrors(gate.refusal.errors);
  }

  return appointmentService.computeAvailableSlots(doctorId, date, excludeAppointmentId);
}
