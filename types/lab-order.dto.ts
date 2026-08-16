import { toId } from '@/lib/utils';

import { LabPriority, LabStatus } from './lab-status';

import type { LabOrderEntity } from '@/models/lab-order.model';

export type LabOrderDto = {
  labOrderId: string;
  encounterId: string;
  patientId: string;
  orderedById: string;
  tests: { name: string; code?: string | null }[];
  priority: LabPriority;
  status: LabStatus;
  notes?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored lab order to its DTO.
 *
 * @param entity - Stored lab order.
 *
 * @returns Instance of LabOrderDto.
 */
export function labOrderFromEntity(entity: LabOrderEntity): LabOrderDto {
  return {
    labOrderId: toId(entity._id),
    encounterId: toId(entity.encounter),
    patientId: toId(entity.patient),
    orderedById: toId(entity.orderedBy),
    tests: entity.tests.map(x => ({ name: x.name, code: x.code ?? null })),
    priority: entity.priority,
    status: entity.status,
    notes: entity.notes ?? null,
    cancelledAt: entity.cancelledAt ? entity.cancelledAt.toISOString() : null,
    cancelledReason: entity.cancelledReason ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
