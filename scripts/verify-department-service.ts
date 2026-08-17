import mongoose from 'mongoose';

import { Department, Doctor, User } from '@/models';

import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { DepartmentService } from '@/lib/services';

/*
  Exercises DepartmentService against a real database, then removes everything it made.

  The substance is the two rules the screen cannot vouch for: a named head must be a real
  doctor whose account is active, and a department anything still references cannot be deleted.
  Both are attacked directly here, because a Server Action is a public endpoint.

  Every fixture carries a run-scoped suffix and is removed by it in a `finally`.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-dept-${SUFFIX}`;
const email = (local: string) => `${local}.${SUFFIX}@example.test`;
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

async function seedDoctor(local: string, isActive: boolean): Promise<{ doctorId: string; userId: string }> {
  const account = await User.create({
    name: `Dr ${local} ${SUFFIX}`,
    email: email(local),
    password: PASSWORD,
    role: USER_ROLES.DOCTOR,
    isEmailVerified: true,
    isApproved: true,
    isActive,
  });

  // A doctor record needs a department; a throwaway one, removed with the rest by its code.
  const home = await Department.create({ name: `Home ${local} ${NAME_TAG}`, code: `H${local}${SUFFIX}`.toUpperCase().slice(0, 12) });

  const doctor = await Doctor.create({
    user: account._id,
    department: home._id,
    specialization: 'General',
    registrationNo: `REG-${local}-${SUFFIX}`,
    consultationFee: 0,
  });

  return { doctorId: String(doctor._id), userId: String(account._id) };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([Department.createIndexes(), Doctor.createIndexes(), User.createIndexes()]);

  const service = new DepartmentService();

  try {
    console.log('Create — unique name and code');
    const created = await service.create({ name: `Cardiology ${NAME_TAG}`, code: `CARD${SUFFIX}`, description: '', headDoctorId: '' });
    check('a department is created, active by default', created.success && created.result?.isActive === true, created.errors);

    const departmentId = created.result?.departmentId ?? '';

    const dupName = await service.create({ name: `Cardiology ${NAME_TAG}`, code: `WARD${SUFFIX}`, description: '', headDoctorId: '' });
    check('a duplicate name is refused on the name field', !dupName.success && dupName.errors[0]?.field === 'name', dupName.errors);

    const dupCode = await service.create({ name: `Neurology ${NAME_TAG}`, code: `CARD${SUFFIX}`, description: '', headDoctorId: '' });
    check('a duplicate code is refused on the code field', !dupCode.success && dupCode.errors[0]?.field === 'code', dupCode.errors);

    console.log('\nHead doctor — must be a real, active doctor');
    const activeDoctor = await seedDoctor('active', true);
    const inactiveDoctor = await seedDoctor('inactive', false);

    const withHead = await service.update({
      departmentId,
      name: `Cardiology ${NAME_TAG}`,
      code: `CARD${SUFFIX}`,
      description: '',
      headDoctorId: activeDoctor.doctorId,
    });
    check('an active doctor can be assigned as head', withHead.success && withHead.result?.headDoctorId === activeDoctor.doctorId, withHead.errors);

    // Regression (a real defect the review caught): a department keeps its head id after that
    // doctor's account is deactivated, so re-validating an unchanged head would block every edit.
    // An UNRELATED edit must still save; the head is re-checked only when it actually changes.
    await User.updateOne({ _id: activeDoctor.userId }, { isActive: false });
    const staleHeadEdit = await service.update({
      departmentId,
      name: `Cardiology ${NAME_TAG}`,
      code: `CARD${SUFFIX}`,
      description: 'A note added after the head was deactivated',
      headDoctorId: activeDoctor.doctorId,
    });
    check('an unrelated edit still saves when the head was since deactivated', staleHeadEdit.success, staleHeadEdit.errors);
    await User.updateOne({ _id: activeDoctor.userId }, { isActive: true });

    const missingHead = await service.update({
      departmentId,
      name: `Cardiology ${NAME_TAG}`,
      code: `CARD${SUFFIX}`,
      description: '',
      headDoctorId: new mongoose.Types.ObjectId().toString(),
    });
    check(
      'a head that is not a doctor record is refused',
      !missingHead.success && missingHead.errors[0]?.field === 'headDoctorId',
      missingHead.errors
    );

    const inactiveHead = await service.update({
      departmentId,
      name: `Cardiology ${NAME_TAG}`,
      code: `CARD${SUFFIX}`,
      description: '',
      headDoctorId: inactiveDoctor.doctorId,
    });
    check(
      'a head whose account is deactivated is refused',
      !inactiveHead.success && inactiveHead.errors[0]?.field === 'headDoctorId',
      inactiveHead.errors
    );

    // Clearing the head is allowed and actually removes it.
    const clearedHead = await service.update({
      departmentId,
      name: `Cardiology ${NAME_TAG}`,
      code: `CARD${SUFFIX}`,
      description: '',
      headDoctorId: '',
    });
    check('the head can be cleared', clearedHead.success && clearedHead.result?.headDoctorId === null, clearedHead.errors);

    console.log('\nAssignable heads — active doctors only');
    const assignable = await service.listAssignableHeadDoctors();
    check(
      'the active doctor is offered as a head',
      assignable.result.some(option => option.doctorId === activeDoctor.doctorId),
      assignable.result
    );
    check(
      'the deactivated doctor is not offered',
      assignable.result.every(option => option.doctorId !== inactiveDoctor.doctorId)
    );

    console.log('\nActivation — deactivate then reactivate');
    const deactivated = await service.setActive({ departmentId, isActive: false });
    check('a department can be deactivated', deactivated.success && deactivated.result?.isActive === false);

    const reactivated = await service.setActive({ departmentId, isActive: true });
    check('and reactivated', reactivated.success && reactivated.result?.isActive === true);

    console.log('\nDelete — refused while referenced, allowed once free');
    // Put a doctor in the department (a fresh account — Doctor.user is unique), then deletion must refuse.
    const referencingUser = await User.create({
      name: `Dr ref ${SUFFIX}`,
      email: email('ref'),
      password: PASSWORD,
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
    });
    await Doctor.create({
      user: referencingUser._id,
      department: departmentId,
      specialization: 'Cardiology',
      registrationNo: `REG-REF-${SUFFIX}`,
      consultationFee: 0,
    });
    const deleteReferenced = await service.delete(departmentId);
    check('a department with a doctor in it cannot be deleted', !deleteReferenced.success, deleteReferenced);

    await Doctor.deleteMany({ department: departmentId });
    const deleteFree = await service.delete(departmentId);
    check('with no doctor left, it can be deleted', deleteFree.success, deleteFree.errors);

    console.log('\nList — status filter and search');
    const openOnly = await service.list({ status: 'active', query: '' });
    check(
      'the active filter returns only active departments',
      openOnly.result.every(department => department.isActive)
    );

    const searched = await service.list({ status: 'all', query: `Home active ${NAME_TAG}` });
    check(
      'a search matches on name',
      searched.result.some(department => department.name.includes(NAME_TAG))
    );
  } finally {
    console.log('\nCleaning up');
    // Case-insensitive throughout: the User model lower-cases emails and the Department model
    // upper-cases codes, so a case-sensitive suffix match would silently leave fixtures behind.
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const codeOrName = { $or: [{ name: new RegExp(NAME_TAG, 'i') }, { code: new RegExp(SUFFIX, 'i') }] };
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);

    const removedDoctors = await Doctor.deleteMany({ user: { $in: userIds } });
    const removedDepartments = await Department.deleteMany(codeOrName);
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(
      `  removed ${removedDepartments.deletedCount} department(s), ${removedDoctors.deletedCount} doctor record(s), ${removedUsers.deletedCount} user(s)`
    );
    const leftoverDepartments = await Department.countDocuments(codeOrName);
    check('nothing this run created is left behind', leftoverDepartments === 0 && (await User.countDocuments({ email: emailPattern })) === 0);

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
