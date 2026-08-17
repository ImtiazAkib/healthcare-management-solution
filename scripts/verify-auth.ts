import { SignJWT } from 'jose';
import mongoose from 'mongoose';

import { env } from '@/env/server';
import { User } from '@/models';

import { SESSION } from '@/constants/auth.const';
import { CODES } from '@/constants/codes.const';
import { USER_ROLES } from '@/constants/roles.const';

import { createSessionToken, verifySessionToken } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/mongodb';
import { AuthService } from '@/lib/services';
import { resolveSignInErrorMessage } from '@/lib/utils';

import type { SessionUser } from '@/types';

/*
  Exercises the session token and credential verification against a real database, then
  removes everything it made.

  The token half deliberately attacks its own format: a tampered payload, an `alg: none`
  header, an expired token and a foreign issuer are each minted here and fed back through
  `verifySessionToken`. A signature check that is never given a bad signature has not been
  tested.
*/
const TAG = `auth-${Date.now().toString(36)}`;
const email = (local: string) => `${local}.${TAG}@example.test`;
const PASSWORD = 'a long enough password';

const AUTH = CODES.AUTH.USERS;

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

const secret = new TextEncoder().encode(env.AUTH_SECRET);

const sessionUser: SessionUser = {
  userId: '507f1f77bcf86cd799439011',
  email: 'someone@hospital.example',
  name: 'Someone',
  role: USER_ROLES.DOCTOR,
  isApproved: true,
};

async function verify(): Promise<void> {
  console.log('Session token — the happy path');
  const token = await createSessionToken(sessionUser);
  const decoded = await verifySessionToken(token);

  check('a freshly minted token verifies', decoded !== null);
  check(
    'the payload round-trips every claim',
    decoded?.userId === sessionUser.userId && decoded?.role === sessionUser.role && decoded?.isApproved === true
  );
  check('the token is three dot-separated segments', token.split('.').length === 3);

  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  check('the header pins HS256', header.alg === SESSION.ALGORITHM, header);

  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  check('the payload carries the issuer and audience', payload.iss === SESSION.ISSUER && payload.aud === SESSION.AUDIENCE);
  /*
    A range, not an equality. jose sets `iat` and `exp` from two independent
    `epoch(new Date())` reads in the same builder chain, so a second boundary falling between
    them makes the difference 3601. Asserting equality would fail this script at random,
    which is worse than useless — a check nobody trusts gets ignored when it matters.
  */
  const lifetime = payload.exp - payload.iat;
  check('the payload carries an expiry an hour out', lifetime >= SESSION.COOKIE.MAX_AGE && lifetime <= SESSION.COOKIE.MAX_AGE + 1, lifetime);
  check('the payload carries NO password or clinical field', !('password' in payload) && !('medicalRecordNo' in payload));

  console.log('\nSession token — the attacks');
  const [head, body, signature] = token.split('.');

  // Flip one character of the payload; the signature no longer covers it.
  const tamperedBody = body.slice(0, -2) + (body.slice(-2, -1) === 'A' ? 'B' : 'A') + body.slice(-1);
  check('a tampered payload is refused', (await verifySessionToken(`${head}.${tamperedBody}.${signature}`)) === null);
  check('a tampered signature is refused', (await verifySessionToken(`${head}.${body}.${signature.slice(0, -1)}x`)) === null);
  check('a token with no signature at all is refused', (await verifySessionToken(`${head}.${body}.`)) === null);
  check('garbage is refused rather than thrown', (await verifySessionToken('not-a-token')) === null);
  check('an empty string is refused', (await verifySessionToken('')) === null);

  /*
    The algorithm-confusion attack: re-encode the header as `alg: none` and drop the
    signature. Without `algorithms: ['HS256']` on verification, some verifiers accept this.
  */
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  check('an alg:none token is refused', (await verifySessionToken(`${noneHeader}.${body}.`)) === null);

  const expired = await new SignJWT({ ...sessionUser })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setIssuer(SESSION.ISSUER)
    .setAudience(SESSION.AUDIENCE)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(secret);
  check('an expired token is refused', (await verifySessionToken(expired)) === null);

  const foreignIssuer = await new SignJWT({ ...sessionUser })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt()
    .setIssuer('somebody-else')
    .setAudience(SESSION.AUDIENCE)
    .setExpirationTime('1h')
    .sign(secret);
  check('a token from another issuer is refused', (await verifySessionToken(foreignIssuer)) === null);

  const foreignAudience = await new SignJWT({ ...sessionUser })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt()
    .setIssuer(SESSION.ISSUER)
    .setAudience('somebody-else')
    .setExpirationTime('1h')
    .sign(secret);
  check('a token for another audience is refused', (await verifySessionToken(foreignAudience)) === null);

  const wrongSecret = await new SignJWT({ ...sessionUser })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt()
    .setIssuer(SESSION.ISSUER)
    .setAudience(SESSION.AUDIENCE)
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('a different secret that is long enough'));
  check('a token signed with another secret is refused', (await verifySessionToken(wrongSecret)) === null);

  /*
    Correctly signed, and still refused: the payload no longer matches the shape the code
    expects. A signature proves where a token came from, not that it still means anything.
  */
  const staleShape = await new SignJWT({ userId: '1', email: 'x@y.z', name: 'X', role: 'wizard', isApproved: true })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt()
    .setIssuer(SESSION.ISSUER)
    .setAudience(SESSION.AUDIENCE)
    .setExpirationTime('1h')
    .sign(secret);
  check('a validly signed token with an unknown role is refused', (await verifySessionToken(staleShape)) === null);

  const missingField = await new SignJWT({ userId: '1', email: 'x@y.z', name: 'X', role: USER_ROLES.DOCTOR })
    .setProtectedHeader({ alg: SESSION.ALGORITHM })
    .setIssuedAt()
    .setIssuer(SESSION.ISSUER)
    .setAudience(SESSION.AUDIENCE)
    .setExpirationTime('1h')
    .sign(secret);
  check('a validly signed token missing a claim is refused', (await verifySessionToken(missingField)) === null);

  await connectToDatabase();
  console.log(`\nConnected to "${mongoose.connection.name}".`);

  try {
    const authService = new AuthService();

    const active = await User.create({
      name: 'Verify Active',
      email: email('active'),
      password: PASSWORD,
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
    });
    const unverified = await User.create({
      name: 'Verify Unverified',
      email: email('unverified'),
      password: PASSWORD,
      role: USER_ROLES.NURSE,
      isEmailVerified: false,
      isApproved: true,
    });
    const unapproved = await User.create({
      name: 'Verify Unapproved',
      email: email('unapproved'),
      password: PASSWORD,
      role: USER_ROLES.NURSE,
      isEmailVerified: true,
      isApproved: false,
    });
    const deactivated = await User.create({
      name: 'Verify Deactivated',
      email: email('deactivated'),
      password: PASSWORD,
      role: USER_ROLES.NURSE,
      isEmailVerified: true,
      isApproved: true,
      isActive: false,
    });
    const claimless = await User.create({
      name: 'Verify Unclaimed',
      email: email('unclaimed'),
      role: USER_ROLES.PATIENT,
      isEmailVerified: true,
      isApproved: true,
    });

    console.log('\nCredential verification');
    const good = await authService.verifyCredentials(active.email, PASSWORD);
    check('the right password succeeds', good.success && good.result?.email === active.email, good.errors);
    check('the success carries no password field', good.result !== null && !('password' in good.result));

    const wrongPassword = await authService.verifyCredentials(active.email, 'not the password');
    check('a wrong password is refused', !wrongPassword.success);
    check('and it is refused as INVALID_CREDENTIALS', wrongPassword.errors[0]?.code === AUTH.INVALID_CREDENTIALS.CODE, wrongPassword.errors);

    const unknown = await authService.verifyCredentials(email('nobody'), PASSWORD);
    check('an unknown address is refused', !unknown.success);
    check('an unknown address and a wrong password give the SAME code — no enumeration', unknown.errors[0]?.code === wrongPassword.errors[0]?.code, {
      unknown: unknown.errors[0]?.code,
      wrong: wrongPassword.errors[0]?.code,
    });
    check('and the same message, word for word', unknown.errors[0]?.error === wrongPassword.errors[0]?.error, {
      unknown: unknown.errors[0]?.error,
      wrong: wrongPassword.errors[0]?.error,
    });

    console.log('\nRefusals cost the same time, not just the same words');
    /*
      The shared code and shared sentence hide *what* was wrong. They do nothing about a
      caller with a stopwatch: bcrypt at cost 12 is ~200ms, so a refusal that skipped it
      would arrive two orders of magnitude sooner and separate "no account here" from "wrong
      password" — which in a hospital is "is this person a patient here".

      Measured rather than asserted structurally, because the property is about elapsed time
      and only the clock can report on it. Each is timed twice and the faster run taken, so a
      stray GC pause inflates nothing.
    */
    const timeOf = async (address: string): Promise<number> => {
      let best = Infinity;

      for (let run = 0; run < 2; run += 1) {
        const started = performance.now();
        await authService.verifyCredentials(address, 'not the password');
        best = Math.min(best, performance.now() - started);
      }

      return best;
    };

    const knownMs = await timeOf(active.email);
    const unknownMs = await timeOf(email('ghost'));
    const unclaimedMs = await timeOf(claimless.email);

    console.log(
      `  (wrong password ${knownMs.toFixed(0)}ms · unknown address ${unknownMs.toFixed(0)}ms · unclaimed account ${unclaimedMs.toFixed(0)}ms)`
    );

    check('a wrong password actually costs bcrypt time', knownMs > 50, `${knownMs.toFixed(0)}ms`);
    check(
      'an unknown address costs comparable time — no timing oracle',
      unknownMs > knownMs / 2,
      `${unknownMs.toFixed(0)}ms vs ${knownMs.toFixed(0)}ms`
    );
    check('an unclaimed account costs comparable time too', unclaimedMs > knownMs / 2, `${unclaimedMs.toFixed(0)}ms vs ${knownMs.toFixed(0)}ms`);

    const mixedCase = await authService.verifyCredentials(active.email.toUpperCase(), PASSWORD);
    check('the address is matched case-insensitively', mixedCase.success);

    const padded = await authService.verifyCredentials(`  ${active.email}  `, PASSWORD);
    check('surrounding whitespace is trimmed', padded.success);

    console.log('\nAccount state — disclosed only after the password matched');
    const unverifiedRight = await authService.verifyCredentials(unverified.email, PASSWORD);
    check(
      'an unverified account is told to confirm its address',
      unverifiedRight.errors[0]?.code === AUTH.EMAIL_NOT_VERIFIED.CODE,
      unverifiedRight.errors
    );

    const unverifiedWrong = await authService.verifyCredentials(unverified.email, 'not the password');
    check(
      'but only with the right password — a wrong one still says INVALID_CREDENTIALS',
      unverifiedWrong.errors[0]?.code === AUTH.INVALID_CREDENTIALS.CODE,
      unverifiedWrong.errors
    );

    const unapprovedRight = await authService.verifyCredentials(unapproved.email, PASSWORD);
    check('an unapproved account is told it is waiting', unapprovedRight.errors[0]?.code === AUTH.ACCOUNT_NOT_APPROVED.CODE, unapprovedRight.errors);

    const deactivatedRight = await authService.verifyCredentials(deactivated.email, PASSWORD);
    check('a deactivated account is told so', deactivatedRight.errors[0]?.code === AUTH.ACCOUNT_DEACTIVATED.CODE, deactivatedRight.errors);

    const deactivatedWrong = await authService.verifyCredentials(deactivated.email, 'not the password');
    check('and a wrong password against it still says INVALID_CREDENTIALS', deactivatedWrong.errors[0]?.code === AUTH.INVALID_CREDENTIALS.CODE);

    const unclaimed = await authService.verifyCredentials(claimless.email, PASSWORD);
    check('an account with no password refuses rather than throwing', !unclaimed.success);
    check('and is indistinguishable from a wrong password', unclaimed.errors[0]?.code === AUTH.INVALID_CREDENTIALS.CODE, unclaimed.errors);

    console.log('\nRefusal codes map to sentences');
    const labels = {
      invalidCredentials: 'no-match',
      notVerified: 'confirm',
      notApproved: 'waiting',
      deactivated: 'switched-off',
      unexpected: 'generic',
    };
    check('INVALID_CREDENTIALS maps', resolveSignInErrorMessage(AUTH.INVALID_CREDENTIALS.CODE, labels) === 'no-match');
    check('EMAIL_NOT_VERIFIED maps', resolveSignInErrorMessage(AUTH.EMAIL_NOT_VERIFIED.CODE, labels) === 'confirm');
    check('ACCOUNT_NOT_APPROVED maps', resolveSignInErrorMessage(AUTH.ACCOUNT_NOT_APPROVED.CODE, labels) === 'waiting');
    check('ACCOUNT_DEACTIVATED maps', resolveSignInErrorMessage(AUTH.ACCOUNT_DEACTIVATED.CODE, labels) === 'switched-off');
    check('an unknown code falls back rather than showing a blank', resolveSignInErrorMessage(99999, labels) === 'generic');
  } finally {
    console.log('\nCleaning up');
    const removed = await User.deleteMany({ email: new RegExp(`\\.${TAG}@example\\.test$`) });
    console.log(`  removed ${removed.deletedCount} user(s)`);
    check('nothing this run created is left behind', (await User.countDocuments({ email: new RegExp(`\\.${TAG}@example\\.test$`) })) === 0);

    await mongoose.disconnect();
  }

  console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

verify().catch(async error => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
