import { Doctor } from '@/models/doctor.model';
import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { SessionUser, UserDto, UserRole, userFromEntity } from '@/types';

import { CODES } from '@/constants/codes.const';
import { ADMIN_LIMIT, STAFF_ROLES, USER_ROLES } from '@/constants/roles.const';
import { FILTER_ALL, USER_STATUS_FILTERS } from '@/constants/users.const';

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
import type { UserActivateOutput, UserApproveOutput, UserCreateOutput, UserFiltersOutput, UserUpdateOutput } from '@/lib/schemas';
import { escapeRegExp, toId } from '@/lib/utils';

import type { UserAttributes, UserEntity } from '@/models/user.model';
// Mongoose 9 renamed `FilterQuery` to `QueryFilter`. `UpdateQuery` kept its name.
import type { QueryFilter, UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('user.service');

const DATABASE = CODES.DATABASE.USERS;
const VALIDATION = CODES.VALIDATION.USERS;
const BUSINESS = CODES.BUSINESS.USERS;
const AUTH = CODES.AUTH.USERS;

/*
  Who may do what to whom, in one place, because the answer is the same whichever verb is
  being used:

  - The super administrator row is untouchable. Not by an administrator, not by itself.
  - An `admin` row belongs to the super administrator alone — creating, editing, approving,
    activating, deleting. Create and promote-into-admin are the same decision wearing
    different verbs, so they are one rule.
  - Nobody changes their own role or their own access. Written about the actor, so it keeps
    holding when the role rules next change.
  - A patient is never created here; patients come from the registry with a record number.
  - At most five active administrators.

  Every one of these is checked here, not in the action — a Server Action is a public
  endpoint and the screen that hid the button proves nothing about the caller.
*/
export class UserService {
  /**
   * List the staff accounts, newest first, narrowed by the screen's filters.
   *
   * The super administrator is never in the list. It is seeded, unmanageable and not a staff
   * account anybody administers, so it is excluded at the query rather than filtered out
   * after — which also keeps it out of any count the screen shows.
   *
   * @param filters - Role, status and search text, already validated.
   *
   * @returns Every matching account as a DTO.
   */
  public async list(filters: UserFiltersOutput): Promise<ListResult<UserDto>> {
    try {
      await connectToDatabase();

      const users = await User.find(this.buildConditions(filters)).sort({ createdAt: -1 }).lean<UserEntity[]>();

      return listSuccess(users.map(userFromEntity));
    } catch (error) {
      log.error({ err: error }, 'Listing users failed');

      return listFailure(createError(DATABASE.LIST_FAILED.CODE, DATABASE.LIST_FAILED.MESSAGE));
    }
  }

  /**
   * One account, by id.
   *
   * @param userId - The account to read.
   *
   * @returns The account, or a failure.
   */
  public async getById(userId: string): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const user = await User.findById(userId).lean<UserEntity | null>();

      if (!user) {
        return this.userNotFound();
      }

      return singleSuccess(userFromEntity(user));
    } catch (error) {
      log.error({ err: error }, 'Reading a user failed');

      return singleFailure(createError(DATABASE.FIND_BY_ID_FAILED.CODE, DATABASE.FIND_BY_ID_FAILED.MESSAGE));
    }
  }

  /**
   * Create a staff account.
   *
   * The password arrives in plaintext and is handed to the model as-is: hashing lives in the
   * pre-save hook, so this method cannot forget it. The account is created **approved and
   * verified** — the hospital creating it is the vouching, and there is no address to prove
   * when the account is made by the hospital itself. Without both flags the account could
   * not sign in and nobody would see it waiting.
   *
   * @param input - Validated create input.
   * @param requester - The signed-in account making the request.
   *
   * @returns The created account, or a failure naming the field that refused it.
   */
  public async create(input: UserCreateOutput, requester: SessionUser): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const refusal = this.refuseDisallowedRoleChange(null, input.role, requester);

      if (refusal) {
        return refusal;
      }

      // A patient is not a staff account; it has no place on this screen.
      if (input.role === USER_ROLES.PATIENT) {
        return singleFailure(createError(BUSINESS.CANNOT_CREATE_PATIENT_HERE.CODE, BUSINESS.CANNOT_CREATE_PATIENT_HERE.MESSAGE, 'role'));
      }

      /*
        The division of labour: the super administrator creates administrators, an ordinary
        administrator creates clinical staff. The gate above already refuses an ordinary
        administrator the `admin` role, so this is its mirror — the one role the super
        administrator may create is `admin`.
      */
      if (requester.role === USER_ROLES.SUPER_ADMIN && input.role !== USER_ROLES.ADMIN) {
        return singleFailure(createError(BUSINESS.SUPER_ADMIN_CREATES_ADMINS_ONLY.CODE, BUSINESS.SUPER_ADMIN_CREATES_ADMINS_ONLY.MESSAGE, 'role'));
      }

      if (input.role === USER_ROLES.ADMIN && (await this.isAdminCeilingReached(null))) {
        return this.adminLimitReached();
      }

      const existing = await User.findOne({ email: input.email }).lean<UserEntity | null>();

      if (existing) {
        return singleFailure(createError(VALIDATION.EMAIL_ALREADY_USED.CODE, VALIDATION.EMAIL_ALREADY_USED.MESSAGE, 'email'));
      }

      const created = await User.create({
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role,
        isEmailVerified: true,
        isApproved: true,
        phone: this.optionalText(input.phone),
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
      });

      return singleSuccess(userFromEntity(created));
    } catch (error) {
      log.error({ err: error }, 'Creating a user failed');

      return singleFailure(createError(DATABASE.CREATE_FAILED.CODE, DATABASE.CREATE_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a staff account.
   *
   * The password is absent — it has its own screen. The email may change, and a change is
   * re-checked against every other account, because an administrator correcting a typo is a
   * real need and moving onto a taken address must still be refused.
   *
   * @param input - Validated update input.
   * @param requester - The signed-in account making the request.
   *
   * @returns The updated account, or a failure.
   */
  public async update(input: UserUpdateOutput, requester: SessionUser): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const target = await User.findById(input.userId).lean<UserEntity | null>();

      if (!target) {
        return this.userNotFound();
      }

      // The role is not moving on an edit, so the target's own role is both sides of the gate.
      const refusal = this.refuseDisallowedRoleChange(target, target.role, requester);

      if (refusal) {
        return refusal;
      }

      if (input.email !== target.email) {
        const taken = await User.findOne({ email: input.email, _id: { $ne: target._id } }).lean<UserEntity | null>();

        if (taken) {
          return singleFailure(createError(VALIDATION.EMAIL_ALREADY_USED.CODE, VALIDATION.EMAIL_ALREADY_USED.MESSAGE, 'email'));
        }
      }

      /*
        Only the fields the staff form edits — name, email, phone. Gender and date of birth
        are deliberately not touched here: the staff form does not collect them, and passing
        them through would `$unset` them on every save (the schema hands back `undefined` for
        a field the form never rendered). A patient's demographics are edited through the
        patient registry in step 7, which owns those fields.
      */
      const updated = await User.findByIdAndUpdate(
        input.userId,
        this.toUpdateDocument({
          name: input.name,
          email: input.email,
          phone: this.optionalText(input.phone),
        }),
        { returnDocument: 'after' }
      ).lean<UserEntity | null>();

      if (!updated) {
        return this.userNotFound();
      }

      return singleSuccess(userFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Updating a user failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Approve an account, or take approval back — the boolean decides which.
   *
   * @param input - Validated approval input.
   * @param requester - The signed-in account making the request.
   *
   * @returns The updated account, or a failure.
   */
  public async setApproval(input: UserApproveOutput, requester: SessionUser): Promise<SingleResult<UserDto>> {
    return this.applyStateChange(input.userId, { isApproved: input.isApproved }, requester);
  }

  /**
   * Switch an account on or off.
   *
   * Deactivation rather than deletion, so a doctor's past encounters keep a valid author.
   * Reactivating an administrator counts against the ceiling — a fourth arriving through the
   * back door is still a fourth.
   *
   * @param input - Validated activation input.
   * @param requester - The signed-in account making the request.
   *
   * @returns The updated account, or a failure.
   */
  public async setActive(input: UserActivateOutput, requester: SessionUser): Promise<SingleResult<UserDto>> {
    return this.applyStateChange(input.userId, { isActive: input.isActive }, requester);
  }

  /**
   * Delete a staff account.
   *
   * Irreversible, and offered alongside deactivation rather than in its place. The same gate
   * every mutation goes through applies — the super administrator is untouchable, an admin is
   * the super administrator's alone, nobody deletes their own account. On top of that, an
   * account that owns a **clinical record** (a doctor's professional record, a patient's
   * medical record) cannot be deleted: doing so would orphan that record. Deactivate it
   * instead, which keeps the history and refuses the next sign-in.
   *
   * @param userId - The account to delete.
   * @param requester - The signed-in account making the request.
   *
   * @returns Empty success, or a failure.
   */
  public async delete(userId: string, requester: SessionUser): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const target = await User.findById(userId).lean<UserEntity | null>();

      if (!target) {
        return emptyFailureWithError(createError(VALIDATION.USER_NOT_FOUND.CODE, VALIDATION.USER_NOT_FOUND.MESSAGE));
      }

      if (target.role === USER_ROLES.SUPER_ADMIN) {
        return emptyFailureWithError(createError(BUSINESS.SUPER_ADMIN_IS_IMMUTABLE.CODE, BUSINESS.SUPER_ADMIN_IS_IMMUTABLE.MESSAGE));
      }

      if (target.role === USER_ROLES.ADMIN && requester.role !== USER_ROLES.SUPER_ADMIN) {
        return emptyFailureWithError(createError(AUTH.ADMIN_MANAGED_BY_SUPER_ADMIN.CODE, AUTH.ADMIN_MANAGED_BY_SUPER_ADMIN.MESSAGE));
      }

      // Deleting yourself is the access half of "nobody changes their own access", made permanent.
      if (toId(target._id) === requester.userId) {
        return emptyFailureWithError(createError(BUSINESS.CANNOT_CHANGE_OWN_ACCESS.CODE, BUSINESS.CANNOT_CHANGE_OWN_ACCESS.MESSAGE));
      }

      const [doctorRecord, patientRecord] = await Promise.all([Doctor.exists({ user: userId }), Patient.exists({ user: userId })]);

      if (doctorRecord || patientRecord) {
        return emptyFailureWithError(createError(BUSINESS.ACCOUNT_HAS_CLINICAL_RECORD.CODE, BUSINESS.ACCOUNT_HAS_CLINICAL_RECORD.MESSAGE));
      }

      await User.findByIdAndDelete(userId);

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Deleting a user failed');

      return emptyFailureWithError(createError(DATABASE.DELETE_FAILED.CODE, DATABASE.DELETE_FAILED.MESSAGE));
    }
  }

  /**
   * Apply an approval or activation change, after checking the requester may make it against
   * this account. Both flags go through here because both answer the same question — may this
   * account sign in — so both are governed by the same rules.
   *
   * @param userId - Account being changed.
   * @param change - The single flag to write.
   * @param requester - The signed-in account making the request.
   *
   * @returns The updated account, or a failure.
   */
  private async applyStateChange(
    userId: string,
    change: Partial<Pick<UserAttributes, 'isApproved' | 'isActive'>>,
    requester: SessionUser
  ): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const target = await User.findById(userId).lean<UserEntity | null>();

      if (!target) {
        return this.userNotFound();
      }

      const refusal = this.refuseDisallowedRoleChange(target, target.role, requester);

      if (refusal) {
        return refusal;
      }

      /*
        The access half of "nobody changes their own role or access". Approval and activation
        carry no role for the shared gate to compare, so the self-check is made here — and it
        is unconditional, because both flags decide whether this account signs in tomorrow.
      */
      if (toId(target._id) === requester.userId) {
        return this.ownAccess();
      }

      // Switching an administrator back on is, to the ceiling, the same act as creating one.
      if (change.isActive === true && target.role === USER_ROLES.ADMIN && (await this.isAdminCeilingReached(userId))) {
        return this.adminLimitReached();
      }

      const updated = await User.findByIdAndUpdate(userId, change, { returnDocument: 'after' }).lean<UserEntity | null>();

      if (!updated) {
        return this.userNotFound();
      }

      return singleSuccess(userFromEntity(updated));
    } catch (error) {
      log.error({ err: error }, 'Changing a user state failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Translate the screen's filters into a Mongo query.
   *
   * The list is scoped to **staff roles** at the query, so this screen shows only the accounts it
   * manages. That excludes the super administrator (seeded, unmanageable) and, just as
   * deliberately, the **patient** — a patient is registered separately and is not a staff account,
   * and once the registry started minting `patient` accounts a `$ne: super-admin` filter alone
   * would have leaked every patient onto this screen, where an administrator could have toggled the
   * approval or activation a patient's later account claim depends on. Scoping to `STAFF_ROLES`
   * keeps them out at the source, and out of any count.
   *
   * @param filters - Role, status and search text.
   *
   * @returns Conditions for `User.find()`.
   */
  private buildConditions(filters: UserFiltersOutput): QueryFilter<UserAttributes> {
    const conditions: QueryFilter<UserAttributes> = { role: { $in: STAFF_ROLES } };

    if (filters.role !== FILTER_ALL) {
      conditions.role = filters.role;
    }

    /*
      Waiting for approval means waiting for a *person*, so an account whose address has not
      been proven does not belong in the queue. Accounts an administrator created carry
      `isEmailVerified: true` from the start, so this narrows the self-registered ones — of
      which there are none until step 15, but the rule is written once and correctly now.
    */
    if (filters.status === USER_STATUS_FILTERS.PENDING) {
      conditions.isApproved = false;
      conditions.isActive = true;
      conditions.isEmailVerified = true;
    }

    if (filters.status === USER_STATUS_FILTERS.ACTIVE) {
      conditions.isApproved = true;
      conditions.isActive = true;
    }

    if (filters.status === USER_STATUS_FILTERS.INACTIVE) {
      conditions.isActive = false;
    }

    if (filters.query) {
      // Escaped, because the raw value comes from a search box and a URL.
      const pattern = new RegExp(escapeRegExp(filters.query), 'i');

      conditions.$or = [{ name: pattern }, { email: pattern }];
    }

    return conditions;
  }

  /**
   * The one gate every mutating method goes through.
   *
   * Takes the account as it stands and the role it is heading for, so create, edit, approve,
   * activate and delete all ask the same question — and cannot answer it differently. A
   * create passes `null` for the target; a state change passes the target's own role on both
   * sides, because nothing is moving.
   *
   * @param target - The account being changed, or null when one is being created.
   * @param nextRole - The role it will hold afterwards.
   * @param requester - The signed-in account making the request.
   *
   * @returns A failure to return, or null when the request is allowed.
   */
  private refuseDisallowedRoleChange(target: UserEntity | null, nextRole: UserRole, requester: SessionUser): SingleResult<UserDto> | null {
    const isSuperAdmin = requester.role === USER_ROLES.SUPER_ADMIN;

    // Nothing reaches the seeded account, and nothing is ever promoted into its role.
    if (target?.role === USER_ROLES.SUPER_ADMIN || nextRole === USER_ROLES.SUPER_ADMIN) {
      return singleFailure(createError(BUSINESS.SUPER_ADMIN_IS_IMMUTABLE.CODE, BUSINESS.SUPER_ADMIN_IS_IMMUTABLE.MESSAGE));
    }

    /*
      An administrator account is the super administrator's alone, whether it is being made,
      unmade, or merely switched off. Both sides are checked: leaving the role is as much an
      administrator decision as entering it.
    */
    if (!isSuperAdmin && (target?.role === USER_ROLES.ADMIN || nextRole === USER_ROLES.ADMIN)) {
      return singleFailure(createError(AUTH.ADMIN_MANAGED_BY_SUPER_ADMIN.CODE, AUTH.ADMIN_MANAGED_BY_SUPER_ADMIN.MESSAGE));
    }

    /*
      Nobody moves their own role. Narrow on purpose: editing your own name through this
      screen is fine, demoting yourself is not. The access half lives in `applyStateChange`,
      because approval and activation carry no role to compare.
    */
    if (target && toId(target._id) === requester.userId && nextRole !== target.role) {
      return this.ownAccess();
    }

    return null;
  }

  /**
   * Whether the facility already has as many active administrators as it may have.
   *
   * Counted over the `admin` role alone — the super administrator is not one of the five.
   * Deactivated administrators are not counted, so switching one off frees a seat; otherwise
   * a facility that lost someone could never fill the gap, since accounts are deactivated
   * rather than deleted.
   *
   * @param excludeUserId - An account to leave out of the count, or null.
   *
   * @returns True when no further administrator may be created or activated.
   */
  private async isAdminCeilingReached(excludeUserId: string | null): Promise<boolean> {
    const conditions: QueryFilter<UserAttributes> = { role: USER_ROLES.ADMIN, isActive: true };

    if (excludeUserId) {
      conditions._id = { $ne: excludeUserId };
    }

    return (await User.countDocuments(conditions)) >= ADMIN_LIMIT;
  }

  /**
   * An untouched optional input submits an empty string. Store nothing instead, so the DTO
   * reports `null` rather than an empty value that reads as deliberate.
   *
   * @param value - Raw optional field.
   *
   * @returns The trimmed text, or undefined when it was blank.
   */
  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  /**
   * Turn a set of field values into the update Mongo actually applies.
   *
   * Mongoose drops `undefined` keys from an update rather than clearing the field, so
   * emptying an optional input would otherwise be a silent no-op — the form would say the
   * phone was gone while the record still held it. Present values are written with `$set`,
   * absent ones removed with `$unset`.
   *
   * @param fields - The values the form produced, `undefined` meaning "no longer set".
   *
   * @returns An update document that both writes and clears.
   */
  private toUpdateDocument(fields: Record<string, unknown>): UpdateQuery<UserAttributes> {
    const assigned: Record<string, unknown> = {};
    const cleared: Record<string, ''> = {};

    Object.entries(fields).forEach(([field, value]) => {
      if (value === undefined) {
        cleared[field] = '';

        return;
      }

      assigned[field] = value;
    });

    // An empty `$unset` is rejected by the driver, so it is only included when it has work.
    return Object.keys(cleared).length > 0 ? { $set: assigned, $unset: cleared } : { $set: assigned };
  }

  private userNotFound(): SingleResult<UserDto> {
    return singleFailure(createError(VALIDATION.USER_NOT_FOUND.CODE, VALIDATION.USER_NOT_FOUND.MESSAGE));
  }

  private ownAccess(): SingleResult<UserDto> {
    return singleFailure(createError(BUSINESS.CANNOT_CHANGE_OWN_ACCESS.CODE, BUSINESS.CANNOT_CHANGE_OWN_ACCESS.MESSAGE));
  }

  private adminLimitReached(): SingleResult<UserDto> {
    return singleFailure(createError(BUSINESS.ADMIN_LIMIT_REACHED.CODE, BUSINESS.ADMIN_LIMIT_REACHED.MESSAGE, 'role'));
  }
}
