import mongoose from 'mongoose';

import { Doctor, Patient, User } from '@/models';

import { ADMIN_LIMIT, USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { UserService } from '@/lib/services';

import type { SessionUser } from '@/types';

/*
  Exercises UserService's rules against a real database, then removes everything it made.

  The rules are the substance of the step, so they are attacked directly: an ordinary
  administrator reaching for the `admin` role, somebody deactivating their own account, a
  request to create a patient here, deleting an account that owns a clinical record, and the
  administrator ceiling. Each is a refusal the screen hides a button for — and each is checked
  here because a Server Action is a public endpoint the screen cannot vouch for.

  Every fixture is tagged and removed by that tag in a `finally`.
*/
const TAG = `staff-${Date.now().toString(36)}`;
const email = (local: string) => `${local}.${TAG}@example.test`;
const PASSWORD = 'a long enough password';

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

const session = (userId: string, role: SessionUser['role']): SessionUser => ({
  userId,
  role,
  email: 'session@example.test',
  name: 'Session',
  isApproved: true,
});

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Doctor.createIndexes(), Patient.createIndexes()]);

  const service = new UserService();

  try {
    /*
      A super administrator to act as. Reuse the seeded one if it exists, so this never tries
      to mint a second (the partial unique index would refuse it anyway); otherwise make a
      tagged stand-in that the cleanup removes.
    */
    const seededSuper = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).lean<{ _id: mongoose.Types.ObjectId } | null>();
    const superId = seededSuper
      ? String(seededSuper._id)
      : String(
          (
            await User.create({
              name: 'Verify Super',
              email: email('super'),
              password: PASSWORD,
              role: USER_ROLES.SUPER_ADMIN,
              isEmailVerified: true,
              isApproved: true,
            })
          )._id
        );
    const superSession = session(superId, USER_ROLES.SUPER_ADMIN);

    // An ordinary administrator to act as, created by the super administrator through the service.
    console.log('Create — the division of labour');
    const adminResult = await service.create(
      { name: 'Verify Admin', email: email('admin'), password: PASSWORD, role: USER_ROLES.ADMIN },
      superSession
    );
    check('the super administrator can create an administrator', adminResult.success, adminResult.errors);
    check('the created account is approved and verified', adminResult.result?.isApproved === true && adminResult.result?.isEmailVerified === true);

    const adminSession = session(adminResult.result?.userId ?? '', USER_ROLES.ADMIN);

    const doctorResult = await service.create(
      { name: 'Verify Doctor', email: email('doctor'), password: PASSWORD, role: USER_ROLES.DOCTOR },
      adminSession
    );
    check('an administrator can create a doctor', doctorResult.success, doctorResult.errors);

    const nurseResult = await service.create(
      { name: 'Verify Nurse', email: email('nurse'), password: PASSWORD, role: USER_ROLES.NURSE },
      adminSession
    );
    check('an administrator can create a nurse', nurseResult.success);

    const adminMakesAdmin = await service.create({ name: 'No', email: email('no-admin'), password: PASSWORD, role: USER_ROLES.ADMIN }, adminSession);
    check('an ordinary administrator CANNOT create an administrator', !adminMakesAdmin.success, adminMakesAdmin.result);

    const superMakesDoctor = await service.create(
      { name: 'No', email: email('no-doctor'), password: PASSWORD, role: USER_ROLES.DOCTOR },
      superSession
    );
    check('the super administrator CANNOT create a doctor — only admins', !superMakesDoctor.success);

    const makePatient = await service.create({ name: 'No', email: email('no-patient'), password: PASSWORD, role: USER_ROLES.PATIENT }, adminSession);
    check('a patient CANNOT be created here', !makePatient.success);

    const makeSuper = await service.create({ name: 'No', email: email('no-super'), password: PASSWORD, role: USER_ROLES.SUPER_ADMIN }, superSession);
    check('a second super administrator CANNOT be created', !makeSuper.success);

    const duplicateEmail = await service.create({ name: 'Dup', email: email('doctor'), password: PASSWORD, role: USER_ROLES.NURSE }, adminSession);
    check('a duplicate email is refused with a field error', !duplicateEmail.success && duplicateEmail.errors[0]?.field === 'email');

    console.log('\nEdit — the role is locked, the super administrator is untouchable');
    const doctorId = doctorResult.result?.userId ?? '';

    const editOk = await service.update({ userId: doctorId, name: 'Renamed Doctor', email: email('doctor') }, adminSession);
    check('an administrator can rename a doctor', editOk.success && editOk.result?.name === 'Renamed Doctor', editOk.errors);

    const editEmailToTaken = await service.update({ userId: doctorId, name: 'Renamed Doctor', email: email('nurse') }, adminSession);
    check('editing onto a taken email is refused', !editEmailToTaken.success && editEmailToTaken.errors[0]?.field === 'email');

    const adminEditsAdmin = await service.update({ userId: adminSession.userId, name: 'Nope', email: email('admin') }, adminSession);
    check('an ordinary administrator CANNOT edit an administrator (even themselves via this path)', !adminEditsAdmin.success, adminEditsAdmin.result);

    console.log('\nApproval and activation — never your own, never a foreign admin');
    const selfDeactivate = await service.setActive({ userId: adminSession.userId, isActive: false }, adminSession);
    check('nobody deactivates their own account', !selfDeactivate.success);

    const selfRevoke = await service.setApproval({ userId: adminSession.userId, isApproved: false }, adminSession);
    check('nobody revokes their own approval', !selfRevoke.success);

    const deactivateDoctor = await service.setActive({ userId: doctorId, isActive: false }, adminSession);
    check('an administrator can deactivate a doctor', deactivateDoctor.success && deactivateDoctor.result?.isActive === false);

    const reactivateDoctor = await service.setActive({ userId: doctorId, isActive: true }, adminSession);
    check('and reactivate it', reactivateDoctor.success && reactivateDoctor.result?.isActive === true);

    const adminDeactivatesAdmin = await service.setActive({ userId: adminSession.userId, isActive: false }, session(doctorId, USER_ROLES.ADMIN));
    check('an ordinary administrator cannot deactivate another administrator', !adminDeactivatesAdmin.success);

    console.log('\nThe administrator ceiling');
    // The facility may hold ADMIN_LIMIT active admins. Fill remaining seats, then expect a refusal.
    const activeAdmins = await User.countDocuments({ role: USER_ROLES.ADMIN, isActive: true });
    const seatsLeft = Math.max(0, ADMIN_LIMIT - activeAdmins);
    const filler: string[] = [];
    for (let index = 0; index < seatsLeft; index += 1) {
      const made = await service.create(
        { name: `Filler ${index}`, email: email(`filler-${index}`), password: PASSWORD, role: USER_ROLES.ADMIN },
        superSession
      );
      if (made.result?.userId) {
        filler.push(made.result.userId);
      }
    }
    const overflow = await service.create({ name: 'Overflow', email: email('overflow'), password: PASSWORD, role: USER_ROLES.ADMIN }, superSession);
    check(`the ${ADMIN_LIMIT}-administrator ceiling refuses the next one`, !overflow.success, overflow.result);

    console.log('\nDelete — guarded, and refused when a clinical record hangs off it');
    const superDeletesDoctor = await service.delete(doctorId, adminSession);
    check('an administrator can delete a doctor account with no clinical record', superDeletesDoctor.success, superDeletesDoctor.errors);

    // A nurse account with a Doctor record hung off it — deletion must refuse.
    const recordUserId = nurseResult.result?.userId ?? '';
    const department = await User.db
      .collection('departments')
      .insertOne({ name: `Dept ${TAG}`, code: `d${TAG.slice(-6)}`, isActive: true, createdAt: new Date(), updatedAt: new Date() });
    await Doctor.create({
      user: recordUserId,
      department: department.insertedId,
      specialization: 'General',
      registrationNo: `REG-${TAG}`,
      consultationFee: 0,
    });

    const deleteWithRecord = await service.delete(recordUserId, adminSession);
    check('deleting an account that owns a clinical record is refused', !deleteWithRecord.success, deleteWithRecord);

    const selfDelete = await service.delete(adminSession.userId, adminSession);
    check('nobody deletes their own account', !selfDelete.success);

    const deleteSuper = await service.delete(superId, superSession);
    check('the super administrator cannot be deleted', !deleteSuper.success);

    console.log('\nList — the super administrator is invisible, filters narrow');
    const all = await service.list({ role: 'all', status: 'all', query: '' });
    check(
      'the list excludes the super administrator',
      all.result.every(x => x.role !== USER_ROLES.SUPER_ADMIN),
      all.result.map(x => x.role)
    );

    const nursesOnly = await service.list({ role: USER_ROLES.NURSE, status: 'all', query: '' });
    check(
      'a role filter narrows to that role',
      nursesOnly.result.every(x => x.role === USER_ROLES.NURSE)
    );

    const searched = await service.list({ role: 'all', status: 'all', query: 'Verify Nurse' });
    check(
      'a search matches on name',
      searched.result.some(x => x.name === 'Verify Nurse')
    );
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${TAG}@example\\.test$`);
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(x => x._id);

    const removedDoctors = await Doctor.deleteMany({ user: { $in: userIds } });
    await User.db.collection('departments').deleteMany({ name: new RegExp(TAG) });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedUsers.deletedCount} user(s), ${removedDoctors.deletedCount} doctor record(s)`);
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
