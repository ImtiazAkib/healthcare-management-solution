import mongoose from 'mongoose';

import { Availability, Department, Doctor, User } from '@/models';

import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { AvailabilityCreateSchema } from '@/lib/schemas';
import type { AvailabilityCreateOutput } from '@/lib/schemas';
import { AvailabilityService, DoctorService } from '@/lib/services';
import { countSlots, expandSlots } from '@/lib/utils';

/*
  Exercises AvailabilityService and the scheduling utils against a real database, then removes
  what it made.

  The substance is the two clashes the screen cannot vouch for — a doctor cannot be in two places
  at once, a room cannot hold two doctors at once — plus the boundaries that decide them: the
  half-open time overlap (back-to-back is fine), the effective-window overlap (last spring and
  this autumn never clash), and the slot expansion the booking screen will share.

  Fixtures carry a run-scoped suffix and are removed case-insensitively (the User model lower-cases
  emails; the Department model upper-cases codes).
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-avail-${SUFFIX}`;
const ROOM = `R${SUFFIX}`.toUpperCase().slice(0, 10);
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL  ${label}`, detail ?? '');
}

async function seedDoctor(local: string): Promise<{ doctorId: string; userId: string }> {
  const account = await User.create({
    name: `Dr ${local} ${SUFFIX}`,
    email: email(local),
    role: USER_ROLES.DOCTOR,
    isEmailVerified: true,
    isApproved: true,
  });

  const department = await Department.create({ name: `Dept ${local} ${NAME_TAG}`, code: `D${local}${SUFFIX}`.toUpperCase().slice(0, 12) });

  const doctor = await Doctor.create({
    user: account._id,
    department: department._id,
    specialization: 'General',
    registrationNo: `REG-${local}-${SUFFIX}`,
    consultationFee: 0,
  });

  return { doctorId: String(doctor._id), userId: String(account._id) };
}

function block(doctorId: string, overrides: Partial<AvailabilityCreateOutput> = {}): AvailabilityCreateOutput {
  return {
    doctorId,
    dayOfWeek: 'tuesday',
    startTime: '09:00',
    endTime: '13:00',
    slotMinutes: 20,
    room: ROOM,
    effectiveFrom: '2026-01-01',
    effectiveTo: undefined,
    ...overrides,
  };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([Availability.createIndexes(), Doctor.createIndexes(), Department.createIndexes(), User.createIndexes()]);

  const service = new AvailabilityService();
  const doctors = new DoctorService();

  try {
    console.log('Slot expansion — a pure function');
    check('a 09:00–13:00 block of 20-minute slots holds 12', expandSlots('09:00', '13:00', 20).length === 12);
    check(
      'the first slot is 09:00–09:20',
      expandSlots('09:00', '13:00', 20)[0]?.startTime === '09:00' && expandSlots('09:00', '13:00', 20)[0]?.endTime === '09:20'
    );
    check('a block that does not divide evenly drops the short tail', expandSlots('09:00', '09:50', 20).length === 2);
    check('countSlots agrees', countSlots({ startTime: '09:00', endTime: '13:00', slotMinutes: 20 }) === 12);

    console.log('\nSchema — an end before a start is refused before the service sees it');
    const backwards = AvailabilityCreateSchema.safeParse({
      doctorId: new mongoose.Types.ObjectId().toString(),
      dayOfWeek: 'tuesday',
      startTime: '14:00',
      endTime: '09:00',
      slotMinutes: 20,
      effectiveFrom: '2026-01-01',
    });
    check('a backwards block fails the schema', !backwards.success);

    const tooLongSlot = AvailabilityCreateSchema.safeParse({
      doctorId: new mongoose.Types.ObjectId().toString(),
      dayOfWeek: 'tuesday',
      startTime: '09:00',
      endTime: '09:30',
      slotMinutes: 60,
      effectiveFrom: '2026-01-01',
    });
    check('a slot longer than its block fails the schema (review finding)', !tooLongSlot.success);

    const doctorA = await seedDoctor('aa');
    const doctorB = await seedDoctor('bb');

    console.log('\nCreate — a valid block, and a missing doctor');
    const created = await service.create(block(doctorA.doctorId));
    check('a valid block is published', created.success, created.errors);

    const missingDoctor = await service.create(block(new mongoose.Types.ObjectId().toString()));
    check(
      'a block for a doctor that does not exist is refused',
      !missingDoctor.success && missingDoctor.errors[0]?.field === 'doctorId',
      missingDoctor.errors
    );

    console.log('\nDoctor clash — one doctor, two overlapping blocks');
    const doctorClash = await service.create(block(doctorA.doctorId, { startTime: '12:00', endTime: '14:00', room: `${ROOM}X` }));
    check(
      'an overlapping block for the same doctor is refused, naming the clash',
      !doctorClash.success && doctorClash.errors.some(error => error.field === 'startTime'),
      doctorClash.errors
    );
    check(
      'the doctor-clash message names the day and hours',
      doctorClash.errors.some(error => error.error.includes('09:00') && error.error.includes('13:00')),
      doctorClash.errors
    );

    console.log('\nBack-to-back and different day — not a clash');
    const backToBack = await service.create(block(doctorA.doctorId, { startTime: '13:00', endTime: '15:00', room: `${ROOM}Y` }));
    check('a block starting exactly when another ends is allowed', backToBack.success, backToBack.errors);

    const otherDay = await service.create(block(doctorA.doctorId, { dayOfWeek: 'wednesday', room: `${ROOM}Z` }));
    check('the same hours on a different day are allowed', otherDay.success, otherDay.errors);

    // A clash-free block whose slot outlasts it is refused by the model backstop, not just the schema.
    const zeroSlot = await service.create(
      block(doctorB.doctorId, { dayOfWeek: 'friday', startTime: '09:00', endTime: '09:30', slotMinutes: 60, room: `${ROOM}0` })
    );
    check('a zero-slot block is refused by the model backstop (review finding)', !zeroSlot.success, zeroSlot.errors);

    console.log('\nRoom clash — two doctors, one room, one time');
    const roomClash = await service.create(block(doctorB.doctorId, { startTime: '10:00', endTime: '12:00' }));
    check(
      'an overlapping block in the same room for another doctor is refused',
      !roomClash.success && roomClash.errors.some(error => error.field === 'room'),
      roomClash.errors
    );
    check(
      'the room-clash message names the other doctor',
      roomClash.errors.some(error => error.error.includes(`Dr aa ${SUFFIX}`)),
      roomClash.errors
    );

    console.log('\nEffective window — same time, windows that never ran at once');
    const springOnly = await service.create(block(doctorB.doctorId, { room: `${ROOM}W`, effectiveFrom: '2026-01-01', effectiveTo: '2026-06-30' }));
    check('a bounded block is published', springOnly.success, springOnly.errors);
    const autumnOnly = await service.create(block(doctorB.doctorId, { room: `${ROOM}W`, effectiveFrom: '2026-07-01', effectiveTo: '2026-12-31' }));
    check('the same room and hours in a non-overlapping window are allowed', autumnOnly.success, autumnOnly.errors);

    console.log('\nEdit — the clash check excludes the block being edited');
    const editSelf = await service.update({
      availabilityId: created.result?.availabilityId ?? '',
      dayOfWeek: 'tuesday',
      startTime: '09:00',
      endTime: '12:00',
      slotMinutes: 30,
      room: ROOM,
      effectiveFrom: '2026-01-01',
      effectiveTo: undefined,
    });
    check('a block can be edited without clashing with itself', editSelf.success && editSelf.result?.slotMinutes === 30, editSelf.errors);

    console.log('\nActivation and delete');
    const deactivated = await service.setActive({ availabilityId: created.result?.availabilityId ?? '', isActive: false });
    check('a block can be deactivated', deactivated.success && deactivated.result?.isActive === false);
    const reactivated = await service.setActive({ availabilityId: created.result?.availabilityId ?? '', isActive: true });
    check('and reactivated when nothing else took its place', reactivated.success && reactivated.result?.isActive === true, reactivated.errors);

    const deleted = await service.delete(backToBack.result?.availabilityId ?? '');
    check('a block can be deleted', deleted.success, deleted.errors);

    console.log('\nList and doctor lookup');
    const forDoctorA = await service.list({ doctorId: doctorA.doctorId, dayOfWeek: 'all', status: 'all' });
    check(
      'the doctor filter narrows to one doctor',
      forDoctorA.result.every(availability => availability.doctorId === doctorA.doctorId) && forDoctorA.result.length > 0
    );

    const selection = await doctors.listForSelection();
    check(
      'the seeded doctor is offered for selection',
      selection.result.some(option => option.doctorId === doctorA.doctorId)
    );

    const byUser = await doctors.findByUser(doctorA.userId);
    check('a doctor record resolves from its account', byUser.success && byUser.result?.doctorId === doctorA.doctorId, byUser.errors);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const seededDoctors = await Doctor.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const doctorIds = seededDoctors.map(doctor => doctor._id);

    const removedAvailability = await Availability.deleteMany({ doctor: { $in: doctorIds } });
    const removedDoctors = await Doctor.deleteMany({ user: { $in: userIds } });
    const removedDepartments = await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(
      `  removed ${removedAvailability.deletedCount} block(s), ${removedDoctors.deletedCount} doctor(s), ${removedDepartments.deletedCount} department(s), ${removedUsers.deletedCount} user(s)`
    );
    check(
      'nothing this run created is left behind',
      (await User.countDocuments({ email: emailPattern })) === 0 && (await Availability.countDocuments({ doctor: { $in: doctorIds } })) === 0
    );

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
