import { toId } from '@/lib/utils';

import { EncounterStatus } from './encounter-status';

import type { EncounterEntity } from '@/models/encounter.model';

export type EncounterDto = {
  encounterId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  chiefComplaint?: string | null;
  examination?: string | null;
  diagnoses: { description: string; code?: string | null }[];
  treatmentNotes?: string | null;
  followUpDate?: string | null;
  status: EncounterStatus;
  completedAt?: string | null;
  addenda: { note: string; addedBy: string; addedAt: string }[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored encounter to its DTO.
 *
 * The addenda come across in full. They are the record of every correction made after the
 * encounter was closed, and hiding them would defeat the reason they exist instead of an
 * edit.
 *
 * @param entity - Stored encounter.
 *
 * @returns Instance of EncounterDto.
 */
export function encounterFromEntity(entity: EncounterEntity): EncounterDto {
  return {
    encounterId: toId(entity._id),
    appointmentId: toId(entity.appointment),
    patientId: toId(entity.patient),
    doctorId: toId(entity.doctor),
    chiefComplaint: entity.chiefComplaint ?? null,
    examination: entity.examination ?? null,
    diagnoses: entity.diagnoses.map(x => ({ description: x.description, code: x.code ?? null })),
    treatmentNotes: entity.treatmentNotes ?? null,
    followUpDate: entity.followUpDate ?? null,
    status: entity.status,
    completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
    addenda: entity.addenda.map(x => ({ note: x.note, addedBy: toId(x.addedBy), addedAt: x.addedAt.toISOString() })),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
