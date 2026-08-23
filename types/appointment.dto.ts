import { toId } from '@/lib/utils';

import { AppointmentStatus } from './appointment-status';
import { TriagePriority } from './triage-priority';
import { Vitals } from './vitals';

import type { AppointmentEntity } from '@/models/appointment.model';

export type AppointmentDto = {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  tokenNo?: number | null;
  status: AppointmentStatus;
  triagePriority: TriagePriority;
  triagedById?: string | null;
  triagedAt?: string | null;
  reason?: string | null;
  vitals?: Vitals | null;
  bookedById: string;
  checkedInAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  cancelledReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored appointment to its DTO.
 *
 * The vitals ride along because every screen that shows an appointment in progress wants
 * them, and they belong to this document rather than to the encounter — a nurse records them
 * at check-in, before a doctor has opened anything.
 *
 * @param entity - Stored appointment.
 *
 * @returns Instance of AppointmentDto.
 */
export function appointmentFromEntity(entity: AppointmentEntity): AppointmentDto {
  return {
    appointmentId: toId(entity._id),
    patientId: toId(entity.patient),
    doctorId: toId(entity.doctor),
    departmentId: toId(entity.department),
    date: entity.date,
    startTime: entity.startTime,
    endTime: entity.endTime,
    tokenNo: entity.tokenNo ?? null,
    status: entity.status,
    triagePriority: entity.triagePriority,
    triagedById: entity.triagedBy ? toId(entity.triagedBy) : null,
    triagedAt: entity.triagedAt ? entity.triagedAt.toISOString() : null,
    reason: entity.reason ?? null,
    vitals: entity.vitals
      ? {
          systolic: entity.vitals.systolic ?? null,
          diastolic: entity.vitals.diastolic ?? null,
          pulse: entity.vitals.pulse ?? null,
          temperature: entity.vitals.temperature ?? null,
          respiratoryRate: entity.vitals.respiratoryRate ?? null,
          oxygenSaturation: entity.vitals.oxygenSaturation ?? null,
          weight: entity.vitals.weight ?? null,
          height: entity.vitals.height ?? null,
          recordedBy: toId(entity.vitals.recordedBy),
          recordedAt: entity.vitals.recordedAt.toISOString(),
        }
      : null,
    bookedById: toId(entity.bookedBy),
    checkedInAt: entity.checkedInAt ? entity.checkedInAt.toISOString() : null,
    completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
    cancelledAt: entity.cancelledAt ? entity.cancelledAt.toISOString() : null,
    cancelledById: entity.cancelledBy ? toId(entity.cancelledBy) : null,
    cancelledReason: entity.cancelledReason ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
