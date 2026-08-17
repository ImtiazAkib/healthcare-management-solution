import bcrypt from 'bcryptjs';

import { User } from '@/models/user.model';
import { UserDto, userFromEntity } from '@/types';

import { ABSENT_PASSWORD_HASH } from '@/constants/auth.const';
import { CODES } from '@/constants/codes.const';

import { createLoggerWithContext } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb';
import { SingleResult, createError, singleFailure, singleSuccess } from '@/lib/result';

const log = createLoggerWithContext('auth.service');

const AUTH = CODES.AUTH.USERS;

/**
 * Spend the same time refusing an address that has no account as one that has.
 *
 * @param candidate - The password as typed.
 *
 * @returns Always false — the point is what it costs, not what it says.
 */
async function compareAgainstAbsentPassword(candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, ABSENT_PASSWORD_HASH);
}

export class AuthService {
  /**
   * Check an email and password, and report why they were refused.
   *
   * **The order matters.** The password is verified first, so account state — unverified,
   * waiting for approval, deactivated — is only ever disclosed to somebody who has already
   * proved they own the account. Reversing it would turn this form into a way to ask "is
   * this person a patient here", which in a hospital is the disclosure to avoid.
   *
   * @param identifier - Email address, as typed.
   * @param password - Password as typed.
   *
   * @returns The user on success, or a failure carrying the reason.
   */
  public async verifyCredentials(identifier: string, password: string): Promise<SingleResult<UserDto>> {
    try {
      await connectToDatabase();

      const user = await User.findOne({ email: identifier.trim().toLowerCase() }).select('+password');

      /*
        **The comparison runs whether or not there is an account to compare against.**

        Returning early on a missing account would be the obvious shape and would undo the
        thing this method is most careful about: bcrypt at cost 12 costs roughly 200ms, so a
        refusal that skips it arrives two orders of magnitude sooner. The shared
        `INVALID_CREDENTIALS` code and its shared sentence hide *what* was wrong; only doing
        the same work hides it from a caller holding a stopwatch. In a hospital, "does this
        address have an account" is "is this person a patient here".

        The same reasoning covers an account with no password — one registered at the counter
        and not yet claimed — which `comparePassword` handles the same way.
      */
      const matches = user ? await user.comparePassword(password) : await compareAgainstAbsentPassword(password);

      if (!user || !matches) {
        return this.invalidCredentials();
      }

      if (!user.isActive) {
        return singleFailure(createError(AUTH.ACCOUNT_DEACTIVATED.CODE, AUTH.ACCOUNT_DEACTIVATED.MESSAGE));
      }

      /*
        Two gates, told apart on purpose. "Confirm your address" and "wait for the hospital"
        are different problems with different remedies, and one message for both leaves the
        visitor with nothing to act on. Verification is checked first because it is the one
        they can fix themselves.
      */
      if (!user.isEmailVerified) {
        return singleFailure(createError(AUTH.EMAIL_NOT_VERIFIED.CODE, AUTH.EMAIL_NOT_VERIFIED.MESSAGE));
      }

      if (!user.isApproved) {
        return singleFailure(createError(AUTH.ACCOUNT_NOT_APPROVED.CODE, AUTH.ACCOUNT_NOT_APPROVED.MESSAGE));
      }

      return singleSuccess(userFromEntity(user));
    } catch (error) {
      /*
        The identifier is not logged. It is somebody's email address, and a log line pairing
        it with a failed sign-in at a hospital says more than it looks like it does.
      */
      log.error({ err: error }, 'Credential verification failed');

      return singleFailure(createError(AUTH.SIGN_IN_FAILED.CODE, AUTH.SIGN_IN_FAILED.MESSAGE));
    }
  }

  /**
   * One shared failure for an unknown address and a wrong password. Distinguishing them
   * would let anyone probe which addresses have accounts here — and an address that has an
   * account here is a person who is a patient here.
   */
  private invalidCredentials(): SingleResult<UserDto> {
    return singleFailure(createError(AUTH.INVALID_CREDENTIALS.CODE, AUTH.INVALID_CREDENTIALS.MESSAGE));
  }
}
