import { toId } from '@/lib/utils';

import { Gender } from './gender';
import { UserRole } from './user-role';

import type { DoctorEntity } from '@/models/doctor.model';
import type { PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';

/** Who to call, as the profile screen shows it. */
export type ProfileEmergencyContactDto = {
  name: string;
  relation: string;
  phone: string;
};

/**
 * A person's own account as the profile screen sees it: the handful of things they may change,
 * the identity the hospital assigned that they may only read, and — for a patient — the contact
 * details that are theirs to keep current.
 *
 * Assembled from up to three records because the split runs deep: the account answers "who is
 * asking", the doctor and patient records answer "what are they here to do". The screen shows one
 * page; the DTO is where the three are joined, and where the fields that must never be editable
 * here (role, approval, record numbers) arrive already flattened to read-only strings.
 */
export type ProfileDto = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  phone: string | null;
  gender: Gender | null;
  /** ISO date. Serialized here so a client never re-formats a `Date` in its own timezone. */
  dateOfBirth: string | null;
  /**
   * A requested-but-unproven address, shown so the screen can say "confirmation pending to …". It is
   * never the address in force — sign-in still uses `email` — and never carries the token.
   */
  pendingEmail: string | null;
  /** The hospital's record of you, shown but not editable here. Patient carries one; doctor the other. */
  medicalRecordNo: string | null;
  registrationNo: string | null;
  /** A patient's own contact details. Absent (null) for a staff account, which has no patient record. */
  emergencyContact: ProfileEmergencyContactDto | null;
  address: string | null;
};

/**
 * Assemble a profile from the account and whichever professional records hang off it.
 *
 * Naming every field explicitly is the same guard the other mappers use: the password, the token
 * hashes and the raw ObjectIds cannot leak by being forgotten, because nothing reaches the DTO
 * unless it is written out here.
 *
 * @param user - The account (loaded with `+pendingEmail` so a pending change can be shown).
 * @param patient - The patient record, or null for a staff account.
 * @param doctor - The doctor record, or null for a non-doctor.
 *
 * @returns The assembled profile.
 */
export function profileFromParts(user: UserEntity, patient: PatientEntity | null, doctor: DoctorEntity | null): ProfileDto {
  return {
    userId: toId(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isApproved: user.isApproved,
    phone: user.phone ?? null,
    gender: user.gender ?? null,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    pendingEmail: user.pendingEmail ?? null,
    medicalRecordNo: patient?.medicalRecordNo ?? null,
    registrationNo: doctor?.registrationNo ?? null,
    emergencyContact: patient?.emergencyContact
      ? { name: patient.emergencyContact.name, relation: patient.emergencyContact.relation, phone: patient.emergencyContact.phone }
      : null,
    address: patient?.address ?? null,
  };
}
