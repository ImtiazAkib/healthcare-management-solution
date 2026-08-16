import { toId } from '@/lib/utils';

import type { DepartmentEntity } from '@/models/department.model';

export type DepartmentDto = {
  departmentId: string;
  name: string;
  code: string;
  description?: string | null;
  headDoctorId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored department to its DTO.
 *
 * @param entity - Stored department.
 *
 * @returns Instance of DepartmentDto.
 */
export function departmentFromEntity(entity: DepartmentEntity): DepartmentDto {
  return {
    departmentId: toId(entity._id),
    name: entity.name,
    code: entity.code,
    description: entity.description ?? null,
    headDoctorId: entity.headDoctor ? toId(entity.headDoctor) : null,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
