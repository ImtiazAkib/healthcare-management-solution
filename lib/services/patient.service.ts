import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { PatientDetailDto, PatientSummaryDto, patientDetailFromEntities, patientSummaryFromEntities } from '@/types';

import { CODES } from '@/constants/codes.const';
import { USER_ROLES } from '@/constants/roles.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { ListResult, SingleResult, createError, listFailure, listSuccessWithInfo, singleFailure, singleSuccess } from '@/lib/result';
import type { PatientFiltersOutput, PatientRegisterOutput, PatientUpdateOutput } from '@/lib/schemas';
import { escapeRegExp, toId } from '@/lib/utils';

import { issueMedicalRecordNo } from './record-number.issuer';

import type { PatientAttributes, PatientEntity } from '@/models/patient.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter, UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('patient.service');

const DATABASE = CODES.DATABASE.PATIENTS;
const VALIDATION = CODES.VALIDATION.PATIENTS;

/*
  A registry is search-first, not a wall of every patient the hospital ever saw. The unfiltered
  list is capped and the search box is how staff reach a specific record.
*/
const REGISTRY_LIMIT = 50;

/*
  Reception registers a patient at the counter and the record hangs off an account the patient
  does not yet hold.

  Two things carry the weight, and both live here:

  - **The account is created without a password and unverified.** It cannot sign in until the
    patient claims it in step 15 — but it is approved and active, so claiming (proving the
    address and setting a password) is the only remaining gate. This is the normal case in a
    hospital, not an edge one, which is why `User.password` is optional in the first place.
  - **The record number is minted by the issuer**, from an atomic counter, and never supplied by
    a caller. The registration schema has no field for one.

  The read methods take a patient id and do not themselves ask who is asking — the route's guard
  decides that — so a doctor's, a nurse's and (in step 13) a patient's own view can reuse them.
*/
export class PatientService {
  /**
   * Register a patient: make the account, mint the record number, write the clinical record.
   *
   * The account is created first; if the record then fails to write, the account is removed
   * rather than left as an orphan that would refuse the same email on a retry. The minted number
   * may be skipped by such a failure, which is fine — a record number is an identifier, not a
   * contiguous tally.
   *
   * @param input - Validated registration input.
   *
   * @returns The new patient's summary (with the issued record number), or a failure.
   */
  public async register(input: PatientRegisterOutput): Promise<SingleResult<PatientSummaryDto>> {
    try {
      await connectToDatabase();

      const existing = await User.findOne({ email: input.email }).lean<UserEntity | null>();

      if (existing) {
        return singleFailure(createError(VALIDATION.EMAIL_ALREADY_USED.CODE, VALIDATION.EMAIL_ALREADY_USED.MESSAGE, 'email'));
      }

      // No password; unverified so it cannot sign in yet; approved and active so a later claim is
      // the only thing standing between the patient and their account. Role fixed here, not read.
      const account = await User.create({
        name: input.name,
        email: input.email,
        role: USER_ROLES.PATIENT,
        isEmailVerified: false,
        isApproved: true,
        isActive: true,
        phone: this.optionalText(input.phone),
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
      });

      try {
        const medicalRecordNo = await issueMedicalRecordNo();

        const patient = await Patient.create({
          user: account._id,
          medicalRecordNo,
          bloodGroup: input.bloodGroup,
          allergies: input.allergies ?? [],
          chronicConditions: input.chronicConditions ?? [],
          emergencyContact: input.emergencyContact,
          address: this.optionalText(input.address),
        });

        return singleSuccess(patientSummaryFromEntities(patient, account));
      } catch (recordError) {
        // Compensate for the account that was made but never completed into a patient.
        await User.findByIdAndDelete(account._id);
        throw recordError;
      }
    } catch (error) {
      log.error({ err: error }, 'Registering a patient failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * The registry list, newest first, narrowed by the search box.
   *
   * Search matches the record number, the phone and the name — the record number on the patient,
   * the other two on the account — and nothing clinical. It **never** matches a diagnosis or a
   * condition: a box that finds "everyone with a condition" is a different feature with a
   * different access rule, and it is not this one.
   *
   * The page is capped at `REGISTRY_LIMIT`, but the result carries the **total** matching count in
   * `resultInfo`, so the screen can say "showing 50 of 60" rather than silently hiding the other
   * ten — a search that quietly dropped an older namesake is how a duplicate record gets created.
   *
   * @param filters - The search text, already validated.
   *
   * @returns The matching patients as list-safe summaries, with the total match count.
   */
  public async list(filters: PatientFiltersOutput): Promise<ListResult<PatientSummaryDto>> {
    try {
      await connectToDatabase();

      let conditions: QueryFilter<PatientAttributes> = {};

      if (filters.query) {
        const pattern = new RegExp(escapeRegExp(filters.query), 'i');

        // Name and phone live on the account, so resolve the matching account ids first, then the
        // record number (on the patient) is matched alongside them.
        const matchingAccounts = await User.find({ role: USER_ROLES.PATIENT, $or: [{ name: pattern }, { phone: pattern }] })
          .select('_id')
          .lean<Pick<UserEntity, '_id'>[]>();

        conditions = { $or: [{ medicalRecordNo: pattern }, { user: { $in: matchingAccounts.map(account => account._id) } }] };
      }

      const totalCount = await Patient.countDocuments(conditions);

      const patients = await Patient.find(conditions).sort({ createdAt: -1 }).limit(REGISTRY_LIMIT).lean<PatientEntity[]>();

      if (patients.length === 0) {
        return listSuccessWithInfo([], 0, 0, REGISTRY_LIMIT, totalCount);
      }

      const accounts = await User.find({ _id: { $in: patients.map(patient => patient.user) } }).lean<UserEntity[]>();
      const accountById = new Map(accounts.map(account => [toId(account._id), account]));

      const summaries: PatientSummaryDto[] = [];
      for (const patient of patients) {
        const account = accountById.get(toId(patient.user));

        // Skip a record whose account has gone; the detail view would treat it as not found too.
        if (account) {
          summaries.push(patientSummaryFromEntities(patient, account));
        }
      }

      return listSuccessWithInfo(summaries, summaries.length, 0, REGISTRY_LIMIT, totalCount);
    } catch (error) {
      log.error({ err: error }, 'Listing patients failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One patient's whole record — clinical detail and the account's demographics.
   *
   * Reaching for this is a clinical access; from step 21a it is audited as one. The route that
   * calls it is what decides whether the caller may.
   *
   * @param patientId - The patient to read.
   *
   * @returns The full detail, or a failure.
   */
  public async getDetail(patientId: string): Promise<SingleResult<PatientDetailDto>> {
    try {
      await connectToDatabase();

      const patient = await Patient.findById(patientId).lean<PatientEntity | null>();

      if (!patient) {
        return this.notFound();
      }

      const account = await User.findById(patient.user).lean<UserEntity | null>();

      if (!account) {
        return this.notFound();
      }

      return singleSuccess(patientDetailFromEntities(patient, account));
    } catch (error) {
      log.error({ err: error }, 'Reading a patient failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a patient's clinical record.
   *
   * The account demographics (name, email) and the record number are not editable here: moving a
   * record to another account, or re-issuing the number every document references, are not edits.
   * This writes blood group, allergies, conditions, the emergency contact and the address.
   *
   * @param input - Validated update input.
   *
   * @returns The updated detail, or a failure.
   */
  public async update(input: PatientUpdateOutput): Promise<SingleResult<PatientDetailDto>> {
    try {
      await connectToDatabase();

      const target = await Patient.findById(input.patientId).lean<PatientEntity | null>();

      if (!target) {
        return this.notFound();
      }

      const updated = await Patient.findByIdAndUpdate(
        input.patientId,
        this.toUpdateDocument({
          bloodGroup: input.bloodGroup,
          allergies: input.allergies ?? [],
          chronicConditions: input.chronicConditions ?? [],
          emergencyContact: input.emergencyContact,
          address: this.optionalText(input.address),
        }),
        { returnDocument: 'after' }
      ).lean<PatientEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      const account = await User.findById(updated.user).lean<UserEntity | null>();

      if (!account) {
        return this.notFound();
      }

      return singleSuccess(patientDetailFromEntities(updated, account));
    } catch (error) {
      log.error({ err: error }, 'Updating a patient failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  /**
   * Present values written with `$set`, absent ones cleared with `$unset` — so clearing the
   * emergency contact, the blood group or the address removes the field rather than being dropped
   * as an `undefined` key. Arrays are always written, an empty one being the cleared state.
   *
   * @param fields - The values to write, `undefined` meaning "no longer set".
   *
   * @returns An update document that both writes and clears.
   */
  private toUpdateDocument(fields: Record<string, unknown>): UpdateQuery<PatientAttributes> {
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

  private notFound(): SingleResult<PatientDetailDto> {
    return singleFailure(createError(VALIDATION.PATIENT_NOT_FOUND.CODE, VALIDATION.PATIENT_NOT_FOUND.MESSAGE));
  }
}
