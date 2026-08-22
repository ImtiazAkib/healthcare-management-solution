import { Doctor } from '@/models/doctor.model';
import { User } from '@/models/user.model';
import { DoctorDto, doctorFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccess, singleFailure, singleSuccess } from '@/lib/result';
import { toId } from '@/lib/utils';

import type { DoctorEntity } from '@/models/doctor.model';
import type { UserEntity } from '@/models/user.model';

const log = createLoggerWithContext('doctor.service');

const DATABASE = CODES.DATABASE.COMMON;
const VALIDATION = CODES.VALIDATION.COMMON;

/** A doctor projected for a picker — the account name, not the whole record. */
export type DoctorOption = {
  doctorId: string;
  name: string;
  specialization: string;
};

/*
  A doctor's professional record lives on `Doctor`, apart from the account. This reads it: the
  list a picker offers, and the record behind a signed-in doctor. It creates nothing — doctor
  records are seeded until the profile flow that manages them lands, so today these both come
  back empty for a hospital that has not seeded any, which is the expected early state.
*/
export class DoctorService {
  /**
   * Every doctor, by name, for a picker.
   *
   * The record carries a specialization but not a name — that is the account's — so each record
   * is joined to its account. A record whose account has gone is skipped.
   *
   * @returns The doctors, by name.
   */
  public async listForSelection(): Promise<ListResult<DoctorOption>> {
    try {
      await connectToDatabase();

      const doctors = await Doctor.find().select('_id user specialization').lean<Pick<DoctorEntity, '_id' | 'user' | 'specialization'>[]>();

      if (doctors.length === 0) {
        return listSuccess([]);
      }

      const accounts = await User.find({ _id: { $in: doctors.map(doctor => doctor.user) } })
        .select('_id name')
        .lean<Pick<UserEntity, '_id' | 'name'>[]>();
      const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));

      const options: DoctorOption[] = [];
      for (const doctor of doctors) {
        const name = nameByUserId.get(toId(doctor.user));

        if (name) {
          options.push({ doctorId: toId(doctor._id), name, specialization: doctor.specialization });
        }
      }

      options.sort((first, second) => first.name.localeCompare(second.name));

      return listSuccess(options);
    } catch (error) {
      log.error({ err: error }, 'Listing doctors failed');

      return listFailure(createError(DATABASE.QUERY_FAILED.CODE, DATABASE.QUERY_FAILED.MESSAGE));
    }
  }

  /**
   * The doctor record behind an account, if there is one.
   *
   * A signed-in doctor's own screens resolve their record this way — from the session's user id,
   * never from a URL. A doctor account with no professional record yet is a "not found", which
   * the caller renders as an empty state rather than an error.
   *
   * @param userId - The account id.
   *
   * @returns The doctor record, or a failure.
   */
  public async findByUser(userId: string): Promise<SingleResult<DoctorDto>> {
    try {
      await connectToDatabase();

      const doctor = await Doctor.findOne({ user: userId }).lean<DoctorEntity | null>();

      if (!doctor) {
        return singleFailure(createError(VALIDATION.RESOURCE_NOT_FOUND.CODE, VALIDATION.RESOURCE_NOT_FOUND.MESSAGE));
      }

      return singleSuccess(doctorFromEntity(doctor));
    } catch (error) {
      log.error({ err: error }, 'Reading a doctor by account failed');

      return singleFailure(createError(DATABASE.QUERY_FAILED.CODE, DATABASE.QUERY_FAILED.MESSAGE));
    }
  }
}
