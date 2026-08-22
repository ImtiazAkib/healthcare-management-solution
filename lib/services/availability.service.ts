import { Availability } from '@/models/availability.model';
import { Doctor } from '@/models/doctor.model';
import { User } from '@/models/user.model';
import { AvailabilityDto, DayOfWeek, availabilityFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { AVAILABILITY_STATUS_FILTERS, DAY_OF_WEEK_LABELS } from '@/constants/schedule.const';
import { FILTER_ALL } from '@/constants/users.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import {
  EmptyResult,
  ErrorDto,
  ListResult,
  SingleResult,
  createError,
  emptyFailureWithError,
  emptySuccess,
  listFailure,
  listSuccess,
  singleFailure,
  singleFailureWithErrors,
  singleSuccess,
} from '@/lib/result';
import type { AvailabilityCreateOutput, AvailabilityFiltersOutput, AvailabilityUpdateOutput } from '@/lib/schemas';
import { dateRangesOverlap, timeRangesOverlap, toId } from '@/lib/utils';

import type { AvailabilityAttributes, AvailabilityEntity } from '@/models/availability.model';
import type { DoctorEntity } from '@/models/doctor.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter, UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('availability.service');

const DATABASE = CODES.DATABASE.AVAILABILITY;
const VALIDATION = CODES.VALIDATION.AVAILABILITY;
const BUSINESS = CODES.BUSINESS.AVAILABILITY;

/*
  When each doctor sits, in which room, for how long a slot.

  Two clashes are refused, both here, because a Server Action is a public endpoint a client-side
  check cannot vouch for: **a doctor cannot be in two places at once**, and **a room cannot hold
  two doctors at once**. Both are reported together so moving a block is not a guessing game, and
  both name what they collide with rather than stating a rule.

  A clash is an overlap on three axes at once — the same weekday, overlapping times, and
  overlapping effective windows. Two blocks on the same Tuesday hour in windows that never ran at
  once (last spring, this autumn) are not a clash. The overlap itself is decided in code on the
  zero-padded strings, exact and timezone-free.
*/
type ConflictCandidate = {
  availabilityId?: string;
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  effectiveFrom: string;
  effectiveTo?: string;
};

export class AvailabilityService {
  /**
   * List blocks for the admin week, narrowed by doctor, day and status.
   *
   * @param filters - Doctor, day and status, already validated.
   *
   * @returns Every matching block as a DTO.
   */
  public async list(filters: AvailabilityFiltersOutput): Promise<ListResult<AvailabilityDto>> {
    try {
      await connectToDatabase();

      const conditions: QueryFilter<AvailabilityAttributes> = {};

      if (filters.doctorId !== FILTER_ALL) {
        conditions.doctor = filters.doctorId;
      }

      if (filters.dayOfWeek !== FILTER_ALL) {
        conditions.dayOfWeek = filters.dayOfWeek;
      }

      if (filters.status === AVAILABILITY_STATUS_FILTERS.ACTIVE) {
        conditions.isActive = true;
      }

      if (filters.status === AVAILABILITY_STATUS_FILTERS.INACTIVE) {
        conditions.isActive = false;
      }

      const blocks = await Availability.find(conditions).sort({ startTime: 1 }).lean<AvailabilityEntity[]>();

      return listSuccess(blocks.map(availabilityFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing availability failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * A single doctor's live blocks, for their own read-only week.
   *
   * @param doctorId - The doctor whose week to read.
   *
   * @returns The doctor's active blocks.
   */
  public async listForDoctor(doctorId: string): Promise<ListResult<AvailabilityDto>> {
    try {
      await connectToDatabase();

      const blocks = await Availability.find({ doctor: doctorId, isActive: true }).sort({ startTime: 1 }).lean<AvailabilityEntity[]>();

      return listSuccess(blocks.map(availabilityFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing a doctor availability failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * Publish a block, after refusing the doctor and room clashes it would cause.
   *
   * @param input - Validated create input.
   *
   * @returns The created block, or a failure naming every clash.
   */
  public async create(input: AvailabilityCreateOutput): Promise<SingleResult<AvailabilityDto>> {
    try {
      await connectToDatabase();

      const doctorExists = await Doctor.exists({ _id: input.doctorId });

      if (!doctorExists) {
        return singleFailure(createError(VALIDATION.DOCTOR_NOT_FOUND.CODE, VALIDATION.DOCTOR_NOT_FOUND.MESSAGE, 'doctorId'));
      }

      const conflicts = await this.findConflicts({
        doctorId: input.doctorId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        room: this.optionalText(input.room),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: this.optionalText(input.effectiveTo),
      });

      if (conflicts.length > 0) {
        return singleFailureWithErrors(conflicts);
      }

      const created = await Availability.create({
        doctor: input.doctorId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotMinutes: input.slotMinutes,
        room: this.optionalText(input.room),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: this.optionalText(input.effectiveTo),
      });

      return singleSuccess(availabilityFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Creating an availability block failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a block. The doctor does not move — a block belongs to the doctor it was published for —
   * so the clash checks run against the block's own doctor and the edited times.
   *
   * @param input - Validated update input.
   *
   * @returns The updated block, or a failure.
   */
  public async update(input: AvailabilityUpdateOutput): Promise<SingleResult<AvailabilityDto>> {
    try {
      await connectToDatabase();

      const target = await Availability.findById(input.availabilityId).lean<AvailabilityEntity | null>();

      if (!target) {
        return this.notFound();
      }

      const conflicts = await this.findConflicts({
        availabilityId: toId(target._id),
        doctorId: toId(target.doctor),
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        room: this.optionalText(input.room),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: this.optionalText(input.effectiveTo),
      });

      if (conflicts.length > 0) {
        return singleFailureWithErrors(conflicts);
      }

      const updated = await Availability.findByIdAndUpdate(
        input.availabilityId,
        this.toUpdateDocument({
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          slotMinutes: input.slotMinutes,
          room: this.optionalText(input.room),
          effectiveFrom: input.effectiveFrom,
          effectiveTo: this.optionalText(input.effectiveTo),
        }),
        { returnDocument: 'after' }
      ).lean<AvailabilityEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(availabilityFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Updating an availability block failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Switch a block on or off. Reactivating re-checks the clashes, because a block that was safe
   * when it was retired can collide with one published in the meantime.
   *
   * @param input - Validated activation input.
   *
   * @returns The updated block, or a failure.
   */
  public async setActive(input: { availabilityId: string; isActive: boolean }): Promise<SingleResult<AvailabilityDto>> {
    try {
      await connectToDatabase();

      const target = await Availability.findById(input.availabilityId).lean<AvailabilityEntity | null>();

      if (!target) {
        return this.notFound();
      }

      if (input.isActive) {
        const conflicts = await this.findConflicts({
          availabilityId: toId(target._id),
          doctorId: toId(target.doctor),
          dayOfWeek: target.dayOfWeek,
          startTime: target.startTime,
          endTime: target.endTime,
          room: target.room,
          effectiveFrom: target.effectiveFrom,
          effectiveTo: target.effectiveTo,
        });

        if (conflicts.length > 0) {
          return singleFailureWithErrors(conflicts);
        }
      }

      const updated = await Availability.findByIdAndUpdate(
        input.availabilityId,
        { isActive: input.isActive },
        { returnDocument: 'after' }
      ).lean<AvailabilityEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(availabilityFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Changing an availability state failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Delete a block.
   *
   * Nothing references a block yet — step 9's appointments snapshot the time they were booked at
   * rather than pointing here — so a delete is clean today. When appointments land, a booked
   * block is retired (deactivated) instead, and the guard for that belongs here beside them.
   *
   * @param availabilityId - The block to delete.
   *
   * @returns Empty success, or a failure.
   */
  public async delete(availabilityId: string): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const target = await Availability.findById(availabilityId).lean<AvailabilityEntity | null>();

      if (!target) {
        return emptyFailureWithError(createError(VALIDATION.AVAILABILITY_NOT_FOUND.CODE, VALIDATION.AVAILABILITY_NOT_FOUND.MESSAGE));
      }

      await Availability.findByIdAndDelete(availabilityId);

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Deleting an availability block failed');

      return emptyFailureWithError(createError(DATABASE.DELETE_FAILED.CODE, DATABASE.DELETE_FAILED.MESSAGE));
    }
  }

  /**
   * The two clashes a block can have — the doctor is already sitting, or the room is already
   * taken by another doctor — reported together, each naming the block it hit.
   *
   * Candidates are narrowed in the query to the same weekday, the live blocks, and not the block
   * being moved; the time-and-window overlap is decided in code. A room clash excludes the
   * candidate's own doctor, so a doctor overlapping their own block in the same room is reported
   * once, as the doctor clash it is.
   *
   * @param candidate - The block being claimed.
   *
   * @returns One error per clash, empty when the block is free.
   */
  private async findConflicts(candidate: ConflictCandidate): Promise<ErrorDto[]> {
    const base: QueryFilter<AvailabilityAttributes> = { dayOfWeek: candidate.dayOfWeek, isActive: true };

    if (candidate.availabilityId) {
      base._id = { $ne: candidate.availabilityId };
    }

    const [doctorBlocks, roomBlocks] = await Promise.all([
      Availability.find({ ...base, doctor: candidate.doctorId }).lean<AvailabilityEntity[]>(),
      candidate.room
        ? Availability.find({ ...base, room: candidate.room, doctor: { $ne: candidate.doctorId } }).lean<AvailabilityEntity[]>()
        : Promise.resolve<AvailabilityEntity[]>([]),
    ]);

    const overlaps = (block: AvailabilityEntity): boolean =>
      timeRangesOverlap(candidate.startTime, candidate.endTime, block.startTime, block.endTime) &&
      dateRangesOverlap(candidate.effectiveFrom, candidate.effectiveTo, block.effectiveFrom, block.effectiveTo);

    const errors: ErrorDto[] = [];

    const doctorClash = doctorBlocks.find(overlaps);
    if (doctorClash) {
      const when = `${DAY_OF_WEEK_LABELS[doctorClash.dayOfWeek]} ${doctorClash.startTime}–${doctorClash.endTime}`;
      errors.push(createError(BUSINESS.DOCTOR_BUSY.CODE, `This doctor already sits ${when}.`, 'startTime'));
    }

    const roomClash = roomBlocks.find(overlaps);
    if (roomClash && candidate.room) {
      const otherName = await this.resolveDoctorName(roomClash.doctor);
      const by = otherName ? ` by ${otherName}` : '';
      const when = `${DAY_OF_WEEK_LABELS[roomClash.dayOfWeek]} ${roomClash.startTime}–${roomClash.endTime}`;
      errors.push(createError(BUSINESS.ROOM_BUSY.CODE, `${candidate.room} is already taken ${when}${by}.`, 'room'));
    }

    return errors;
  }

  /**
   * The account name behind a doctor record, for naming a room clash. Best-effort — a missing
   * record or account just leaves the clash unnamed rather than failing the check.
   *
   * @param doctorId - The doctor to name.
   *
   * @returns The name, or null.
   */
  private async resolveDoctorName(doctorId: AvailabilityEntity['doctor']): Promise<string | null> {
    const doctor = await Doctor.findById(doctorId).select('user').lean<Pick<DoctorEntity, 'user'> | null>();

    if (!doctor) {
      return null;
    }

    const account = await User.findById(doctor.user).select('name').lean<Pick<UserEntity, 'name'> | null>();

    return account?.name ?? null;
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  /**
   * Present values written with `$set`, absent ones cleared with `$unset` — so emptying the room
   * or the effective-to date removes the field rather than being dropped as an `undefined` key.
   *
   * @param fields - The values to write, `undefined` meaning "no longer set".
   *
   * @returns An update document that both writes and clears.
   */
  private toUpdateDocument(fields: Record<string, unknown>): UpdateQuery<AvailabilityAttributes> {
    const assigned: Record<string, unknown> = {};
    const cleared: Record<string, ''> = {};

    Object.entries(fields).forEach(([field, value]) => {
      if (value === undefined) {
        cleared[field] = '';

        return;
      }

      assigned[field] = value;
    });

    return Object.keys(cleared).length > 0 ? { $set: assigned, $unset: cleared } : { $set: assigned };
  }

  private notFound(): SingleResult<AvailabilityDto> {
    return singleFailure(createError(VALIDATION.AVAILABILITY_NOT_FOUND.CODE, VALIDATION.AVAILABILITY_NOT_FOUND.MESSAGE));
  }
}
