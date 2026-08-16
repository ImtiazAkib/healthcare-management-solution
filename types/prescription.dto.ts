import type { PrescriptionFrequency } from '@/constants/prescription.const';

import { toId } from '@/lib/utils';

import type { PrescriptionEntity } from '@/models/prescription.model';

export type PrescriptionItemDto = {
  drug: string;
  strength?: string | null;
  dose?: string | null;
  frequency: PrescriptionFrequency;
  duration?: string | null;
  instructions?: string | null;
};

export type PrescriptionDto = {
  prescriptionId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  items: PrescriptionItemDto[];
  advice?: string | null;
  issuedAt: string;
  supersededById?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored prescription to its DTO.
 *
 * `supersededById` is carried rather than hidden: a superseded prescription still renders on
 * the timeline, and the screen showing it needs to be able to say so.
 *
 * @param entity - Stored prescription.
 *
 * @returns Instance of PrescriptionDto.
 */
export function prescriptionFromEntity(entity: PrescriptionEntity): PrescriptionDto {
  return {
    prescriptionId: toId(entity._id),
    encounterId: toId(entity.encounter),
    patientId: toId(entity.patient),
    doctorId: toId(entity.doctor),
    items: entity.items.map(x => ({
      drug: x.drug,
      strength: x.strength ?? null,
      dose: x.dose ?? null,
      frequency: x.frequency,
      duration: x.duration ?? null,
      instructions: x.instructions ?? null,
    })),
    advice: entity.advice ?? null,
    issuedAt: entity.issuedAt.toISOString(),
    supersededById: entity.supersededBy ? toId(entity.supersededBy) : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
