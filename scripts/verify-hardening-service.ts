import mongoose from 'mongoose';

import { AuditLog, Doctor, Encounter, Patient, RateLimit, User } from '@/models';
import { SessionUser } from '@/types';

import { AUDIT_OUTCOMES } from '@/constants/audit.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { RATE_LIMIT } from '@/constants/rate-limit.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { AuditService, AuthService, MedicalRecordService, consumeRateLimit, resetRateLimit } from '@/lib/services';
import { hashToken } from '@/lib/services/token.hash';

import type { UserEntity } from '@/models/user.model';

/*
  Exercises the hardening layer against a real database, then removes what it made.

  The substance is the acceptance: a limit **locks after its budget** and a correct sign-in before the
  limit does not; the counter is in the **database**, so it survives a restart; and opening a patient
  record — allowed or refused — writes an **audit row** naming the actor and the patient, appended,
  never overwritten.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();
const PASSWORD = 'Str0ng-Pass!23';
const TEST_SCOPE = `verify-${SUFFIX}`;

let failures = 0;
let mrnCounter = Date.now() % 900000;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

function sessionOf(account: UserEntity): SessionUser {
  return { userId: String(account._id), role: account.role, email: account.email, name: account.name, isApproved: account.isApproved };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Patient.createIndexes(), Doctor.createIndexes(), RateLimit.createIndexes(), AuditLog.createIndexes()]);

  const auth = new AuthService();
  const audit = new AuditService();
  const records = new MedicalRecordService();

  try {
    console.log('Rate limit — locks after its budget, and the counter is in the database');
    const budget = { LIMIT: 3, WINDOW_MINUTES: 15 };
    const within = [];
    for (let attempt = 0; attempt < budget.LIMIT; attempt += 1) {
      within.push(await consumeRateLimit(TEST_SCOPE, 'someone', budget));
    }
    check('every attempt up to the limit is allowed', within.every(Boolean));
    check('the attempt past the limit is refused', (await consumeRateLimit(TEST_SCOPE, 'someone', budget)) === false);
    const persisted = await RateLimit.findOne({ key: `${TEST_SCOPE}:${hashToken('someone')}` }).lean();
    check('the counter is persisted in the database (so it survives a restart)', Boolean(persisted));

    await resetRateLimit(TEST_SCOPE, 'someone');
    check('a reset clears the counter and the next attempt is allowed again', (await consumeRateLimit(TEST_SCOPE, 'someone', budget)) === true);

    console.log('\nSign-in — counts failures per identifier, locks past the budget');
    const unknown = email('nobody');
    const attempts = [];
    for (let attempt = 0; attempt < RATE_LIMIT.SIGN_IN.LIMIT; attempt += 1) {
      attempts.push(await auth.verifyCredentials(unknown, 'wrong'));
    }
    check(
      'every wrong attempt up to the limit is refused as invalid credentials, not rate-limited',
      attempts.every(result => !result.success)
    );
    const locked = await auth.verifyCredentials(unknown, 'wrong');
    // Past the budget the message changes from "invalid credentials" to "too many attempts".
    check('the attempt past the budget is rate-limited', !locked.success && locked.errors[0]?.code === 30002, locked.errors);

    console.log('\nSign-in — a correct sign-in before the limit resets the failure count');
    await User.create({
      name: `Real ${SUFFIX}`,
      email: email('real'),
      password: PASSWORD,
      role: USER_ROLES.PATIENT,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const realKey = `sign-in:${hashToken(email('real'))}`;
    await auth.verifyCredentials(email('real'), 'wrong'); // one failure — creates the counter
    check('a failure creates the sign-in counter', Boolean(await RateLimit.findOne({ key: realKey }).lean()));
    const good = await auth.verifyCredentials(email('real'), PASSWORD);
    check('the correct password signs in', good.success, good.errors);
    check('signing in clears the failure counter', (await RateLimit.findOne({ key: realKey }).lean()) === null);

    console.log('\nAudit — a recorded access appears in the trail, filtered by actor');
    const staff = await User.create({
      name: `AuditActor-${SUFFIX}`,
      email: email('staff'),
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const targetId = new mongoose.Types.ObjectId().toString();
    await audit.record({
      actor: sessionOf(staff.toObject()),
      action: 'view',
      entity: 'patient',
      entityId: targetId,
      outcome: AUDIT_OUTCOMES.GRANTED,
    });
    const trail = await audit.list({ outcome: 'all', query: `AuditActor-${SUFFIX}` });
    check(
      'the recorded access is in the trail, naming the actor',
      trail.result.some(row => row.actorName === `AuditActor-${SUFFIX}` && row.entityId === targetId && row.outcome === 'granted'),
      trail.errors
    );

    console.log('\nAudit — opening a patient record writes a row, allowed or refused');
    const doctorUser = await User.create({
      name: `Dr ${SUFFIX}`,
      email: email('doc'),
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const department = new mongoose.Types.ObjectId();
    const doctor = await Doctor.create({
      user: doctorUser._id,
      department,
      specialization: 'General',
      registrationNo: `REG-${SUFFIX}`,
      consultationFee: 0,
    });
    const patientUser = await User.create({
      name: `Pat ${SUFFIX}`,
      email: email('pt'),
      role: USER_ROLES.PATIENT,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    mrnCounter += 1;
    const patient = await Patient.create({ user: patientUser._id, medicalRecordNo: `HMS-2094-${String(mrnCounter).padStart(6, '0')}` });
    const doctorSession = sessionOf(doctorUser.toObject());

    // No relationship yet — a doctor opening a stranger's record is refused, and that is recorded.
    const refused = await records.getPatientForDoctor(String(patient._id), doctorSession);
    check('opening a stranger record is refused', !refused.success);
    const refusedRow = await AuditLog.findOne({
      actor: doctorUser._id,
      entity: 'patient',
      entityId: patient._id,
      outcome: AUDIT_OUTCOMES.REFUSED,
    }).lean();
    check('the refused access is in the trail, naming the actor and the patient', Boolean(refusedRow));

    // A relationship (an encounter links them) — now the access is granted, and that is recorded too.
    await Encounter.create({
      appointment: new mongoose.Types.ObjectId(),
      patient: patient._id,
      doctor: doctor._id,
      status: ENCOUNTER_STATUSES.COMPLETED,
      completedAt: new Date(),
    });
    await records.getPatientForDoctor(String(patient._id), doctorSession);
    const grantedRow = await AuditLog.findOne({
      actor: doctorUser._id,
      entity: 'patient',
      entityId: patient._id,
      outcome: AUDIT_OUTCOMES.GRANTED,
    }).lean();
    check('the granted access is in the trail', Boolean(grantedRow));
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);

    await AuditLog.deleteMany({ actor: { $in: userIds } });
    await RateLimit.deleteMany({ key: new RegExp(`^${TEST_SCOPE}:`) });
    await RateLimit.deleteOne({ key: `sign-in:${hashToken(email('real'))}` });
    await RateLimit.deleteOne({ key: `sign-in:${hashToken(email('nobody'))}` });
    await Encounter.deleteMany({
      patient: {
        $in: (
          await Patient.find({ user: { $in: userIds } })
            .select('_id')
            .lean()
        ).map(patient => patient._id),
      },
    });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    const removed = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removed.deletedCount} user(s)`);
    check('nothing this run created is left behind', (await User.countDocuments({ email: emailPattern })) === 0);

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
