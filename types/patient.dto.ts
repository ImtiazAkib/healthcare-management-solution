import { toId } from '@/lib/utils';

import { BloodGroup } from './blood-group';
import { Gender } from './gender';

import type { PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';

/**
 * The full clinical record. Reaching for this is a **clinical access**, and from step 21a
 * it is audited as one.
 */
export type PatientDto = {
  patientId: string;
  userId: string;
  medicalRecordNo: string;
  bloodGroup?: BloodGroup | null;
  allergies: string[];
  chronicConditions: string[];
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  } | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Enough to identify a patient on a list, and nothing more.
 *
 * A queue row, a search result and an appointment line need a name, a record number and an
 * age. They do not need allergies, conditions or a home address — and a list screen is
 * exactly where a clinical record leaks by being convenient. This is the shape those
 * screens get; reaching for {@link PatientDto} instead has to be a deliberate act.
 */
export type PatientSummaryDto = {
  patientId: string;
  userId: string;
  medicalRecordNo: string;
  name: string;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  phone?: string | null;
};

/**
 * Map a stored patient to its full clinical DTO.
 *
 * @param entity - Stored patient.
 *
 * @returns Instance of PatientDto.
 */
export function patientFromEntity(entity: PatientEntity): PatientDto {
  return {
    patientId: toId(entity._id),
    userId: toId(entity.user),
    medicalRecordNo: entity.medicalRecordNo,
    bloodGroup: entity.bloodGroup ?? null,
    allergies: [...entity.allergies],
    chronicConditions: [...entity.chronicConditions],
    emergencyContact: entity.emergencyContact
      ? {
          name: entity.emergencyContact.name,
          relation: entity.emergencyContact.relation,
          phone: entity.emergencyContact.phone,
        }
      : null,
    address: entity.address ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * Map a patient and their account to the list-safe summary.
 *
 * Both entities are taken explicitly rather than reading a populated `user` off the
 * patient, so a caller that forgot to populate gets a type error instead of a row whose
 * name is silently an ObjectId.
 *
 * @param entity - Stored patient.
 * @param user - The account the patient record belongs to.
 *
 * @returns Instance of PatientSummaryDto.
 */
export function patientSummaryFromEntities(entity: PatientEntity, user: UserEntity): PatientSummaryDto {
  return {
    patientId: toId(entity._id),
    userId: toId(user._id),
    medicalRecordNo: entity.medicalRecordNo,
    name: user.name,
    gender: user.gender ?? null,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    phone: user.phone ?? null,
  };
}
