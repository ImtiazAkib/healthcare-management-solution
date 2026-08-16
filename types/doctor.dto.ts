import { toId } from '@/lib/utils';

import type { DoctorEntity } from '@/models/doctor.model';

export type DoctorDto = {
  doctorId: string;
  userId: string;
  departmentId: string;
  specialization: string;
  designation?: string | null;
  registrationNo: string;
  /** Integer minor units, exactly as stored. Formatting is the caller's job, once, at the edge. */
  consultationFee: number;
  roomNo?: string | null;
  biography?: string | null;
  isAcceptingPatients: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored doctor to its DTO.
 *
 * The doctor's name and contact details are not here: they belong to the account, and the
 * caller that needs both maps both. Copying them in would mean two places to keep a renamed
 * doctor correct.
 *
 * @param entity - Stored doctor.
 *
 * @returns Instance of DoctorDto.
 */
export function doctorFromEntity(entity: DoctorEntity): DoctorDto {
  return {
    doctorId: toId(entity._id),
    userId: toId(entity.user),
    departmentId: toId(entity.department),
    specialization: entity.specialization,
    designation: entity.designation ?? null,
    registrationNo: entity.registrationNo,
    consultationFee: entity.consultationFee,
    roomNo: entity.roomNo ?? null,
    biography: entity.biography ?? null,
    isAcceptingPatients: entity.isAcceptingPatients,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
