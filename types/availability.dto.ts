import { toId } from '@/lib/utils';

import { DayOfWeek } from './day-of-week';

import type { AvailabilityEntity } from '@/models/availability.model';

export type AvailabilityDto = {
  availabilityId: string;
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  room?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored availability block to its DTO.
 *
 * The times stay strings, exactly as stored. They are already in the form the UI renders and
 * the overlap test compares — converting them to `Date` here and back in the component is
 * two chances to acquire a timezone.
 *
 * @param entity - Stored availability block.
 *
 * @returns Instance of AvailabilityDto.
 */
export function availabilityFromEntity(entity: AvailabilityEntity): AvailabilityDto {
  return {
    availabilityId: toId(entity._id),
    doctorId: toId(entity.doctor),
    dayOfWeek: entity.dayOfWeek,
    startTime: entity.startTime,
    endTime: entity.endTime,
    slotMinutes: entity.slotMinutes,
    room: entity.room ?? null,
    effectiveFrom: entity.effectiveFrom,
    effectiveTo: entity.effectiveTo ?? null,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
