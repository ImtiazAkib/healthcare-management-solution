import type { UserRole } from './user-role';

/**
 * What the session token carries, and therefore what a guarded page knows without a
 * database round trip.
 *
 * **Nothing clinical belongs here.** No medical record number, no department, no patient
 * id — a token is a bearer credential that sits in a cookie for an hour, and anything
 * minted into it is disclosed to whoever holds it and goes stale the moment the record
 * changes. Identity and authorization only.
 *
 * An ordinary type rather than a module augmentation: there is no auth library to augment.
 */
export type SessionUser = {
  userId: string;
  role: UserRole;
  email: string;
  name: string;
  isApproved: boolean;
};
