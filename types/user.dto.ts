import { toId } from '@/lib/utils';

import { Gender } from './gender';
import { UserRole } from './user-role';

import type { UserEntity } from '@/models/user.model';

/**
 * A user as every screen and API response sees one.
 * Deliberately has no `password` field — see the mapper.
 */
export type UserDto = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isApproved: boolean;
  isActive: boolean;
  phone?: string | null;
  gender?: Gender | null;
  /** ISO date. Serialized here so a client never re-formats a `Date` in its own timezone. */
  dateOfBirth?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored user to its DTO.
 *
 * This is the only route a user takes to the UI. Because the mapper names every field
 * explicitly, `password`, `_id` and `__v` cannot leak by being forgotten — a new sensitive
 * column is invisible here until someone deliberately adds it.
 *
 * @param entity - Stored user.
 *
 * @returns Instance of UserDto.
 */
export function userFromEntity(entity: UserEntity): UserDto {
  return {
    userId: toId(entity._id),
    name: entity.name,
    email: entity.email,
    role: entity.role,
    isEmailVerified: entity.isEmailVerified,
    isApproved: entity.isApproved,
    isActive: entity.isActive,
    phone: entity.phone ?? null,
    gender: entity.gender ?? null,
    dateOfBirth: entity.dateOfBirth ? entity.dateOfBirth.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
