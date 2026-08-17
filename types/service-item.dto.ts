import { toId } from '@/lib/utils';

import type { ServiceCategory } from './service-category';
import type { ServiceItemEntity } from '@/models/service-item.model';

export type ServiceItemDto = {
  serviceItemId: string;
  code: string;
  name: string;
  category: ServiceCategory;
  description?: string | null;
  /** Integer minor units, exactly as stored. Formatting is the caller's job, once, at the edge. */
  priceMinorUnits: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored service to its DTO.
 *
 * @param entity - Stored service.
 *
 * @returns Instance of ServiceItemDto.
 */
export function serviceItemFromEntity(entity: ServiceItemEntity): ServiceItemDto {
  return {
    serviceItemId: toId(entity._id),
    code: entity.code,
    name: entity.name,
    category: entity.category,
    description: entity.description ?? null,
    priceMinorUnits: entity.priceMinorUnits,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
