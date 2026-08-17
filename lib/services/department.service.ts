import { Appointment } from '@/models/appointment.model';
import { Department } from '@/models/department.model';
import { Doctor } from '@/models/doctor.model';
import { User } from '@/models/user.model';
import { DepartmentDto, departmentFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { DEPARTMENT_STATUS_FILTERS } from '@/constants/directory.const';
import { USER_ROLES } from '@/constants/roles.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import {
  EmptyResult,
  ListResult,
  SingleResult,
  createError,
  emptyFailureWithError,
  emptySuccess,
  listFailure,
  listSuccess,
  singleFailure,
  singleSuccess,
} from '@/lib/result';
import type { DepartmentCreateOutput, DepartmentFiltersOutput, DepartmentUpdateOutput } from '@/lib/schemas';
import { escapeRegExp, toId } from '@/lib/utils';

import type { DepartmentAttributes, DepartmentEntity } from '@/models/department.model';
import type { DoctorEntity } from '@/models/doctor.model';
import type { UserEntity } from '@/models/user.model';
import type { QueryFilter, UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('department.service');

const DATABASE = CODES.DATABASE.DEPARTMENTS;
const VALIDATION = CODES.VALIDATION.DEPARTMENTS;
const BUSINESS = CODES.BUSINESS.DEPARTMENTS;

/** One assignable head, projected minimally for the picker — the account name, not the record. */
export type HeadDoctorOption = { doctorId: string; name: string; specialization: string };

/*
  Departments, and the priced services beside them, are the structures the rest of the app
  selects from. This service owns the department half.

  Two rules carry the weight, and both live here rather than in the screen, because a Server
  Action is a public endpoint the screen cannot vouch for:

  - A named head must be a real doctor whose account is active. `headDoctor` refs a Doctor, not
    a User — the head of cardiology is a doctor in that capacity — so the check resolves the
    record, then the account behind it. The assignment is optional; only a named one is checked.
  - Deactivate, never delete, anything still referenced. Doctors sit in a department and past
    appointments name it; both must keep rendering, so deletion is refused while either exists.
*/
export class DepartmentService {
  /**
   * List the departments, alphabetically, narrowed by the screen's filters.
   *
   * @param filters - Status and search text, already validated.
   *
   * @returns Every matching department as a DTO.
   */
  public async list(filters: DepartmentFiltersOutput): Promise<ListResult<DepartmentDto>> {
    try {
      await connectToDatabase();

      const departments = await Department.find(this.buildConditions(filters)).sort({ name: 1 }).lean<DepartmentEntity[]>();

      return listSuccess(departments.map(departmentFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing departments failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * The doctors a department may be led by — every doctor whose account is active.
   *
   * The head references a `Doctor` record, but the picker shows the person, so the record is
   * joined to the account for its name. A department that has no doctors yet simply offers an
   * empty list, and the head stays unassigned — which the field already allows.
   *
   * @returns The assignable heads, by name.
   */
  public async listAssignableHeadDoctors(): Promise<ListResult<HeadDoctorOption>> {
    try {
      await connectToDatabase();

      const doctors = await Doctor.find().select('_id user specialization').lean<Pick<DoctorEntity, '_id' | 'user' | 'specialization'>[]>();

      if (doctors.length === 0) {
        return listSuccess([]);
      }

      const accounts = await User.find({ _id: { $in: doctors.map(doctor => doctor.user) }, role: USER_ROLES.DOCTOR, isActive: true })
        .select('_id name')
        .lean<Pick<UserEntity, '_id' | 'name'>[]>();

      const nameByUserId = new Map(accounts.map(account => [toId(account._id), account.name]));

      const options: HeadDoctorOption[] = [];
      for (const doctor of doctors) {
        const name = nameByUserId.get(toId(doctor.user));

        // Skip a doctor whose account is deactivated or not a doctor — it may not lead a department.
        if (name) {
          options.push({ doctorId: toId(doctor._id), name, specialization: doctor.specialization });
        }
      }

      options.sort((first, second) => first.name.localeCompare(second.name));

      return listSuccess(options);
    } catch (error) {
      log.error({ err: error }, 'Listing assignable head doctors failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One department, by id.
   *
   * @param departmentId - The department to read.
   *
   * @returns The department, or a failure.
   */
  public async getById(departmentId: string): Promise<SingleResult<DepartmentDto>> {
    try {
      await connectToDatabase();

      const department = await Department.findById(departmentId).lean<DepartmentEntity | null>();

      if (!department) {
        return this.notFound();
      }

      return singleSuccess(departmentFromEntity(department));
    } catch (error) {
      log.error({ err: error }, 'Reading a department failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Create a department.
   *
   * @param input - Validated create input.
   *
   * @returns The created department, or a failure naming the field that refused it.
   */
  public async create(input: DepartmentCreateOutput): Promise<SingleResult<DepartmentDto>> {
    try {
      await connectToDatabase();

      const clash = await this.refuseClash(input.name, input.code, null);

      if (clash) {
        return clash;
      }

      const headDoctorId = this.optionalId(input.headDoctorId);
      const headRefusal = await this.refuseInvalidHeadDoctor(headDoctorId);

      if (headRefusal) {
        return headRefusal;
      }

      const created = await Department.create({
        name: input.name,
        code: input.code,
        description: this.optionalText(input.description),
        headDoctor: headDoctorId,
      });

      return singleSuccess(departmentFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Creating a department failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a department.
   *
   * @param input - Validated update input.
   *
   * @returns The updated department, or a failure.
   */
  public async update(input: DepartmentUpdateOutput): Promise<SingleResult<DepartmentDto>> {
    try {
      await connectToDatabase();

      const target = await Department.findById(input.departmentId).lean<DepartmentEntity | null>();

      if (!target) {
        return this.notFound();
      }

      const clash = await this.refuseClash(input.name, input.code, toId(target._id));

      if (clash) {
        return clash;
      }

      const headDoctorId = this.optionalId(input.headDoctorId);
      const currentHeadDoctorId = target.headDoctor ? toId(target.headDoctor) : undefined;

      /*
        Validate the head only when it is actually changing. A department keeps its head id even
        after that doctor's account is deactivated (nothing clears the reference), and the head
        is re-checked for an active account — so re-validating an unchanged head would block every
        edit of such a department. An admin fixing the description should not be stopped by a head
        they never touched; the stale head is preserved, and the table already shows it as "—".
      */
      if (headDoctorId !== currentHeadDoctorId) {
        const headRefusal = await this.refuseInvalidHeadDoctor(headDoctorId);

        if (headRefusal) {
          return headRefusal;
        }
      }

      const updated = await Department.findByIdAndUpdate(
        input.departmentId,
        this.toUpdateDocument({
          name: input.name,
          code: input.code,
          description: this.optionalText(input.description),
          headDoctor: headDoctorId,
        }),
        { returnDocument: 'after' }
      ).lean<DepartmentEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(departmentFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Updating a department failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Switch a department on or off. Deactivation is always allowed — it is the safe operation,
   * the one offered in place of a delete that a reference would refuse.
   *
   * @param input - Validated activation input.
   *
   * @returns The updated department, or a failure.
   */
  public async setActive(input: { departmentId: string; isActive: boolean }): Promise<SingleResult<DepartmentDto>> {
    try {
      await connectToDatabase();

      const updated = await Department.findByIdAndUpdate(
        input.departmentId,
        { isActive: input.isActive },
        { returnDocument: 'after' }
      ).lean<DepartmentEntity | null>();

      if (!updated) {
        return this.notFound();
      }

      return singleSuccess(departmentFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Changing a department state failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Delete a department.
   *
   * Refused while a doctor sits in it or a past appointment names it — removing it would orphan
   * those records. Deactivate it instead, which keeps the history and takes it out of pickers.
   *
   * @param departmentId - The department to delete.
   *
   * @returns Empty success, or a failure.
   */
  public async delete(departmentId: string): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const target = await Department.findById(departmentId).lean<DepartmentEntity | null>();

      if (!target) {
        return emptyFailureWithError(createError(VALIDATION.DEPARTMENT_NOT_FOUND.CODE, VALIDATION.DEPARTMENT_NOT_FOUND.MESSAGE));
      }

      const [doctorReference, appointmentReference] = await Promise.all([
        Doctor.exists({ department: departmentId }),
        Appointment.exists({ department: departmentId }),
      ]);

      if (doctorReference || appointmentReference) {
        return emptyFailureWithError(createError(BUSINESS.CANNOT_DELETE_REFERENCED.CODE, BUSINESS.CANNOT_DELETE_REFERENCED.MESSAGE));
      }

      await Department.findByIdAndDelete(departmentId);

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Deleting a department failed');

      return emptyFailureWithError(createError(DATABASE.DELETE_FAILED.CODE, DATABASE.DELETE_FAILED.MESSAGE));
    }
  }

  /**
   * A named head must resolve to a doctor whose account is active. The record is found first,
   * then the account behind it — a deactivated doctor, or an account that is no longer a
   * doctor, may not lead a department. An absent id is fine: the head is optional.
   *
   * @param headDoctorId - The Doctor id, or undefined when none is named.
   *
   * @returns A failure to return, or null when the assignment is allowed.
   */
  private async refuseInvalidHeadDoctor(headDoctorId: string | undefined): Promise<SingleResult<DepartmentDto> | null> {
    if (!headDoctorId) {
      return null;
    }

    const doctor = await Doctor.findById(headDoctorId).lean<DoctorEntity | null>();

    if (!doctor) {
      return singleFailure(createError(VALIDATION.HEAD_DOCTOR_NOT_FOUND.CODE, VALIDATION.HEAD_DOCTOR_NOT_FOUND.MESSAGE, 'headDoctorId'));
    }

    const account = await User.findById(doctor.user).lean<UserEntity | null>();

    if (!account || account.role !== USER_ROLES.DOCTOR || !account.isActive) {
      return singleFailure(createError(VALIDATION.HEAD_DOCTOR_NOT_ACTIVE.CODE, VALIDATION.HEAD_DOCTOR_NOT_ACTIVE.MESSAGE, 'headDoctorId'));
    }

    return null;
  }

  /**
   * Refuse a name or code already worn by another department. Checked field by field so the
   * error names the one that clashed. On an edit the current row is excluded.
   *
   * @param name - The proposed name.
   * @param code - The proposed code, already upper-cased by the schema.
   * @param excludeId - The row being edited, or null on create.
   *
   * @returns A failure to return, or null when both are free.
   */
  private async refuseClash(name: string, code: string, excludeId: string | null): Promise<SingleResult<DepartmentDto> | null> {
    const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};

    const nameTaken = await Department.findOne({ name, ...notSelf }).lean<DepartmentEntity | null>();

    if (nameTaken) {
      return singleFailure(createError(VALIDATION.NAME_ALREADY_USED.CODE, VALIDATION.NAME_ALREADY_USED.MESSAGE, 'name'));
    }

    const codeTaken = await Department.findOne({ code, ...notSelf }).lean<DepartmentEntity | null>();

    if (codeTaken) {
      return singleFailure(createError(VALIDATION.CODE_ALREADY_USED.CODE, VALIDATION.CODE_ALREADY_USED.MESSAGE, 'code'));
    }

    return null;
  }

  /**
   * Translate the screen's filters into a Mongo query.
   *
   * @param filters - Status and search text.
   *
   * @returns Conditions for `Department.find()`.
   */
  private buildConditions(filters: DepartmentFiltersOutput): QueryFilter<DepartmentAttributes> {
    const conditions: QueryFilter<DepartmentAttributes> = {};

    if (filters.status === DEPARTMENT_STATUS_FILTERS.ACTIVE) {
      conditions.isActive = true;
    }

    if (filters.status === DEPARTMENT_STATUS_FILTERS.INACTIVE) {
      conditions.isActive = false;
    }

    if (filters.query) {
      const pattern = new RegExp(escapeRegExp(filters.query), 'i');

      conditions.$or = [{ name: pattern }, { code: pattern }];
    }

    return conditions;
  }

  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  private optionalId(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  /**
   * Present values are written with `$set`, absent ones cleared with `$unset` — so emptying the
   * description or clearing the head actually removes the field rather than being dropped as an
   * `undefined` key. The same helper the user service uses, for the same reason.
   *
   * @param fields - The values to write, `undefined` meaning "no longer set".
   *
   * @returns An update document that both writes and clears.
   */
  private toUpdateDocument(fields: Record<string, unknown>): UpdateQuery<DepartmentAttributes> {
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

  private notFound(): SingleResult<DepartmentDto> {
    return singleFailure(createError(VALIDATION.DEPARTMENT_NOT_FOUND.CODE, VALIDATION.DEPARTMENT_NOT_FOUND.MESSAGE));
  }
}
