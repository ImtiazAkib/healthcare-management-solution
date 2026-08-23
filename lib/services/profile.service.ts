import { randomBytes } from 'node:crypto';

import { Doctor } from '@/models/doctor.model';
import { Patient } from '@/models/patient.model';
import { User } from '@/models/user.model';
import { ProfileDto, SessionUser, UserDto, profileFromParts, userFromEntity } from '@/types';

import { EMAIL_VERIFICATION } from '@/constants/account.const';
import { CODES } from '@/constants/codes.const';
import { USER_ROLES } from '@/constants/roles.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { EmptyResult, SingleResult, createError, emptyFailureWithError, emptySuccess, singleFailure, singleSuccess } from '@/lib/result';
import type { PasswordChangeOutput, ProfileContactOutput, ProfileUpdateOutput } from '@/lib/schemas';

import { hashToken } from './token.hash';

import type { DoctorEntity } from '@/models/doctor.model';
import type { PatientAttributes, PatientEntity } from '@/models/patient.model';
import type { UserAttributes, UserEntity } from '@/models/user.model';
import type { UpdateQuery } from 'mongoose';

const log = createLoggerWithContext('profile.service');

const DATABASE = CODES.DATABASE.PROFILE;
const VALIDATION = CODES.VALIDATION.PROFILE;
const USERS = CODES.VALIDATION.USERS;
const AUTH = CODES.AUTH.USERS;

/**
 * What an accepted profile edit hands back.
 *
 * The **session** is built from the saved record, not the form, and carries the old email even when
 * a change was requested — so re-issuing the cookie from it cannot let an unproven address into the
 * session. The **token** leaves the service exactly once, only when the email actually changed, for
 * the action to mail; only its hash is stored.
 */
export type ProfileUpdateResult = {
  profile: ProfileDto;
  session: SessionUser;
  pendingEmailToken: string | null;
};

/*
  Everything a person may change about their own account, and the one change that needs proof.

  Three things carry the weight here:

  - **The account is the session's, never the payload's.** Every method pins the target to
    `requester.userId`; nothing takes an id from the caller, so there is no other record to point at.
    Role, approval and the record numbers are not editable because the schemas do not carry them and
    this service never writes them.
  - **An email change is not in force until its link is followed.** The new address is held in
    `pendingEmail` with a hashed, single-use token; `email` — the address sign-in and password
    recovery use — keeps its old value until `confirmEmailChange` writes it.
  - **A password change goes through a hydrated `save()`**, so the model's pre-save hook hashes it. A
    `findByIdAndUpdate` would skip that hook and store a plaintext password, so it is never used for
    one; the current password is checked first, from a screen the owner already opened.
*/
export class ProfileService {
  /**
   * Read the signed-in person's own profile.
   *
   * Joins the account to whichever professional record hangs off it — a patient's for the emergency
   * contact and address, a doctor's for the registration number — so the screen shows one page. The
   * account is loaded with `+pendingEmail` so a change awaiting confirmation can be shown.
   *
   * @param session - The signed-in account.
   *
   * @returns The assembled profile, or a failure.
   */
  public async getProfile(session: SessionUser): Promise<SingleResult<ProfileDto>> {
    try {
      await connectToDatabase();

      const user = await User.findById(session.userId).select('+pendingEmail').lean<UserEntity | null>();

      if (!user) {
        return singleFailure(createError(USERS.USER_NOT_FOUND.CODE, USERS.USER_NOT_FOUND.MESSAGE));
      }

      const [patient, doctor] = await Promise.all([this.patientFor(session), this.doctorFor(session)]);

      return singleSuccess(profileFromParts(user, patient, doctor));
    } catch (error) {
      log.error({ err: error }, 'Loading a profile failed');

      return singleFailure(createError(DATABASE.LOAD_FAILED.CODE, DATABASE.LOAD_FAILED.MESSAGE));
    }
  }

  /**
   * Edit the fields a person may change about themselves: name, phone, gender, date of birth, and —
   * held aside until proven — their email address.
   *
   * The name and demographics are written straight through. A new email is not: its reachability is
   * still unproven, so it goes into `pendingEmail` with a fresh token the caller mails, while the
   * address in force stays the old one. The returned session carries that old address, which is what
   * makes re-issuing the cookie from it safe.
   *
   * @param input - Validated profile fields.
   * @param requester - The signed-in account making the change.
   *
   * @returns The updated profile, the session to re-issue, and the email-change token (or null).
   */
  public async updateProfile(input: ProfileUpdateOutput, requester: SessionUser): Promise<SingleResult<ProfileUpdateResult>> {
    try {
      await connectToDatabase();

      const target = await User.findById(requester.userId).lean<UserEntity | null>();

      if (!target) {
        return this.userNotFound();
      }

      const isEmailChanging = input.email !== target.email;
      let pendingFields: Partial<UserAttributes> = {};
      let pendingEmailToken: string | null = null;

      if (isEmailChanging) {
        // Refused now, and re-checked when the link is followed — the address can be taken in between.
        const taken = await User.findOne({ email: input.email, _id: { $ne: target._id } }).lean<UserEntity | null>();

        if (taken) {
          return singleFailure(createError(USERS.EMAIL_ALREADY_USED.CODE, USERS.EMAIL_ALREADY_USED.MESSAGE, 'email'));
        }

        const token = randomBytes(EMAIL_VERIFICATION.TOKEN_BYTES).toString('hex');
        pendingFields = {
          pendingEmail: input.email,
          pendingEmailTokenHash: hashToken(token),
          pendingEmailExpiresAt: new Date(Date.now() + EMAIL_VERIFICATION.LIFETIME_HOURS * 60 * 60 * 1000),
        };
        pendingEmailToken = token;
      }

      const updated = await User.findByIdAndUpdate(
        requester.userId,
        // `email` is deliberately absent — an address change is written only by `confirmEmailChange`.
        this.toUpdateDocument<UserAttributes>({
          name: input.name,
          phone: this.optionalText(input.phone),
          gender: input.gender,
          dateOfBirth: input.dateOfBirth,
          ...pendingFields,
        }),
        { returnDocument: 'after' }
      )
        .select('+pendingEmail')
        .lean<UserEntity | null>();

      if (!updated) {
        return this.userNotFound();
      }

      const [patient, doctor] = await Promise.all([this.patientFor(requester), this.doctorFor(requester)]);

      return singleSuccess({
        profile: profileFromParts(updated, patient, doctor),
        // Built from the saved record and the address in force — never the requested one.
        session: { userId: requester.userId, email: updated.email, name: updated.name, role: updated.role, isApproved: updated.isApproved },
        pendingEmailToken,
      });
    } catch (error) {
      log.error({ err: error }, 'Updating a profile failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Change your own password, from a screen you reached with a live session.
   *
   * The current password is required and checked here — not because the session is in doubt, but
   * because a session left open on a ward computer is the realistic threat, and the current password
   * is the one thing the person who walked up to it does not have. The new password is written
   * through a hydrated `save()` so the pre-save hook hashes it.
   *
   * It does **not** revoke sessions already open elsewhere: the session is a stateless JWT, which is
   * re-validated each request against the account's role, approval and active flags but not against
   * its password. Rotating live sessions on a password change belongs to the hardening step, not
   * here; the current-password gate covers the threat this screen is actually exposed to.
   *
   * @param input - The current password and the new one (already confirmed by the schema).
   * @param requester - The signed-in account.
   *
   * @returns An empty success, or a failure.
   */
  public async changePassword(input: PasswordChangeOutput, requester: SessionUser): Promise<EmptyResult> {
    try {
      await connectToDatabase();

      const user = await User.findById(requester.userId).select('+password');

      if (!user) {
        return emptyFailureWithError(createError(USERS.USER_NOT_FOUND.CODE, USERS.USER_NOT_FOUND.MESSAGE));
      }

      const correct = await user.comparePassword(input.currentPassword);

      if (!correct) {
        // Raised only after the account was found and the entry checked — it tells the owner, not a stranger.
        return emptyFailureWithError(createError(AUTH.CURRENT_PASSWORD_INCORRECT.CODE, AUTH.CURRENT_PASSWORD_INCORRECT.MESSAGE, 'currentPassword'));
      }

      user.password = input.newPassword;
      await user.save();

      return emptySuccess();
    } catch (error) {
      log.error({ err: error }, 'Changing a password failed');

      return emptyFailureWithError(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Edit a patient's own emergency contact and address.
   *
   * The clinical fields — allergies, conditions, blood group — are not reachable here: they are a
   * clinician's entries, and a patient-supplied allergy overwriting one is a patient-safety problem.
   * The emergency contact is written whole or cleared whole, which is what the stored sub-document,
   * requiring a name, a relation and a phone together, needs.
   *
   * @param input - Validated contact fields.
   * @param requester - The signed-in patient.
   *
   * @returns The updated profile, or a failure.
   */
  public async updateContact(input: ProfileContactOutput, requester: SessionUser): Promise<SingleResult<ProfileDto>> {
    try {
      await connectToDatabase();

      const name = (input.emergencyName ?? '').trim();
      const relation = (input.emergencyRelation ?? '').trim();
      const phone = (input.emergencyPhone ?? '').trim();

      // The schema has already refused a partial contact, so "any given" means "all given".
      const emergencyContact = name !== '' ? { name, relation, phone } : undefined;

      const updated = await Patient.findOneAndUpdate(
        { user: requester.userId },
        this.toUpdateDocument<PatientAttributes>({ emergencyContact, address: this.optionalText(input.address) }),
        { returnDocument: 'after' }
      ).lean<PatientEntity | null>();

      if (!updated) {
        return singleFailure(createError(VALIDATION.PATIENT_RECORD_NOT_FOUND.CODE, VALIDATION.PATIENT_RECORD_NOT_FOUND.MESSAGE));
      }

      const user = await User.findById(requester.userId).select('+pendingEmail').lean<UserEntity | null>();

      if (!user) {
        return this.userNotFound();
      }

      return singleSuccess(profileFromParts(user, updated, null));
    } catch (error) {
      log.error({ err: error }, 'Updating an emergency contact failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * Confirm a requested email change from the link's token, and make the new address the one in
   * force.
   *
   * Opened from an inbox with no session, so the token alone proves it. The address is re-checked
   * against every other account at this moment, not just when it was requested — a day is long
   * enough for someone else to have taken it. Writing it clears the token pair, which is what makes
   * the link single-use.
   *
   * @param token - The raw token from the link.
   *
   * @returns The updated account (so the caller can refresh a matching session), or a failure.
   */
  public async confirmEmailChange(token: string): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const user = await User.findOne({ pendingEmailTokenHash: hashToken(token) }).select(
        '+pendingEmail +pendingEmailTokenHash +pendingEmailExpiresAt'
      );

      if (!user || !user.pendingEmail) {
        return this.emailChangeLinkInvalid();
      }

      if (!user.pendingEmailExpiresAt || user.pendingEmailExpiresAt.getTime() < Date.now()) {
        return singleFailure(createError(VALIDATION.EMAIL_CHANGE_LINK_EXPIRED.CODE, VALIDATION.EMAIL_CHANGE_LINK_EXPIRED.MESSAGE));
      }

      const taken = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } }).lean<UserEntity | null>();

      if (taken) {
        return singleFailure(createError(USERS.EMAIL_ALREADY_USED.CODE, USERS.EMAIL_ALREADY_USED.MESSAGE));
      }

      user.email = user.pendingEmail;
      user.pendingEmail = undefined;
      user.pendingEmailTokenHash = undefined;
      user.pendingEmailExpiresAt = undefined;
      await user.save();

      // Re-read as a plain entity for the mapper rather than casting the hydrated document.
      const refreshed = await User.findById(user._id).lean<UserEntity | null>();

      if (!refreshed) {
        return this.userNotFound();
      }

      return singleSuccess(userFromEntity(refreshed));
    } catch (error) {
      // The unique email index refusing a second account under a race reads as a taken address, not an outage.
      if (this.isDuplicateKeyError(error)) {
        return singleFailure(createError(USERS.EMAIL_ALREADY_USED.CODE, USERS.EMAIL_ALREADY_USED.MESSAGE));
      }

      log.error({ err: error }, 'Confirming an email change failed');

      return singleFailure(createError(DATABASE.UPDATE_FAILED.CODE, DATABASE.UPDATE_FAILED.MESSAGE));
    }
  }

  /**
   * The patient record hanging off an account, or null when the role has none.
   *
   * @param session - The signed-in account.
   *
   * @returns The patient record, or null.
   */
  private async patientFor(session: SessionUser): Promise<PatientEntity | null> {
    if (session.role !== USER_ROLES.PATIENT) {
      return null;
    }

    return Patient.findOne({ user: session.userId }).lean<PatientEntity | null>();
  }

  /**
   * The doctor record hanging off an account, or null when the role has none.
   *
   * @param session - The signed-in account.
   *
   * @returns The doctor record, or null.
   */
  private async doctorFor(session: SessionUser): Promise<DoctorEntity | null> {
    if (session.role !== USER_ROLES.DOCTOR) {
      return null;
    }

    return Doctor.findOne({ user: session.userId }).lean<DoctorEntity | null>();
  }

  /**
   * Turn a set of field values into the update Mongo actually applies. Present values are written
   * with `$set`; blank optionals are removed with `$unset`, because Mongoose drops an `undefined`
   * key rather than clearing the field — so emptying a phone would otherwise be a silent no-op.
   *
   * @param fields - The values, `undefined` meaning "no longer set".
   *
   * @returns An update document that both writes and clears.
   */
  private toUpdateDocument<T>(fields: Record<string, unknown>): UpdateQuery<T> {
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

  /**
   * An untouched optional input submits an empty string. Store nothing instead, so the DTO reports
   * `null` rather than an empty value that reads as deliberate.
   *
   * @param value - Raw optional field.
   *
   * @returns The trimmed text, or undefined when it was blank.
   */
  private optionalText(value: string | undefined): string | undefined {
    return value ? value : undefined;
  }

  /** A mongo duplicate-key error — the unique email index refusing a second account under a race. */
  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 11000;
  }

  private userNotFound(): SingleResult<never> {
    return singleFailure(createError(USERS.USER_NOT_FOUND.CODE, USERS.USER_NOT_FOUND.MESSAGE));
  }

  private emailChangeLinkInvalid(): SingleResult<UserDto> {
    return singleFailure(createError(VALIDATION.EMAIL_CHANGE_LINK_INVALID.CODE, VALIDATION.EMAIL_CHANGE_LINK_INVALID.MESSAGE));
  }
}
