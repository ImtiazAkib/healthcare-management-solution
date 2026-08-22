import mongoose from 'mongoose';

import { Appointment, Availability, Counter, Department, Doctor, Patient, User } from '@/models';

import { APPOINTMENT_STATUSES, TRIAGE_PRIORITIES } from '@/constants/appointment.const';
import { USER_ROLES } from '@/constants/roles.const';
import { DAYS_OF_WEEK } from '@/constants/schedule.const';

import { connectToDatabase } from '@/lib/mongodb';
import { AppointmentService, QueueService } from '@/lib/services';

/*
  Exercises AppointmentService and QueueService against a real database, then removes what it made.

  The substance is the two rules the screen cannot vouch for: a slot is bookable only if
  availability offers it and nothing holds it, and double-booking is refused by the database's
  unique index rather than a check that a race can beat; plus the lifecycle — check-in assigns a
  sequential token, a checked-in patient cannot be cancelled, a no-show waits for the slot to pass —
  and the queue derived from it all.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-booking-${SUFFIX}`;
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();

const FUTURE_DATE = '2099-06-15';
const PAST_DATE = '2020-06-15';

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

async function seedDoctor(local: string): Promise<{ doctorId: string; departmentId: string }> {
  const account = await User.create({
    name: `Dr ${local} ${SUFFIX}`,
    email: email(`dr-${local}`),
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

  // A block on every weekday, 09:00–13:00 in 20-minute slots, effective for any date this run uses.
  await Availability.insertMany(
    DAYS_OF_WEEK.map(day => ({
      doctor: doctor._id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 20,
      room: `R${SUFFIX}`.slice(0, 10),
      effectiveFrom: '2019-01-01',
    }))
  );

  return { doctorId: String(doctor._id), departmentId: String(department._id) };
}

async function seedPatient(local: string): Promise<string> {
  const account = await User.create({ name: `Patient ${local} ${SUFFIX}`, email: email(`pt-${local}`), role: USER_ROLES.PATIENT, isApproved: true });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2099-${String(mrnCounter).padStart(6, '0')}` });

  return String(patient._id);
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([
    Appointment.createIndexes(),
    Availability.createIndexes(),
    Doctor.createIndexes(),
    Patient.createIndexes(),
    User.createIndexes(),
  ]);

  const service = new AppointmentService();
  const queue = new QueueService();
  const bookedBy = new mongoose.Types.ObjectId().toString();

  try {
    const doctor = await seedDoctor('aa');
    const wrongDepartment = new mongoose.Types.ObjectId().toString();

    console.log('Slots — availability minus what is taken');
    const slots = await service.computeAvailableSlots(doctor.doctorId, FUTURE_DATE);
    check('a doctor with a weekday block offers 12 twenty-minute slots', slots.result.length === 12, slots.result.length);
    check('the first slot is 09:00', slots.result[0]?.startTime === '09:00');

    console.log('\nBook — a real slot, department derived, not trusted from the request');
    const patientA = await seedPatient('a');
    const booked = await service.book(
      {
        patientId: patientA,
        doctorId: doctor.doctorId,
        departmentId: wrongDepartment,
        date: FUTURE_DATE,
        startTime: '09:00',
        endTime: '09:20',
        reason: 'Checkup',
      },
      bookedBy
    );
    check('a booking on a real slot succeeds', booked.success, booked.errors);
    check('the booking starts confirmed', booked.result?.status === APPOINTMENT_STATUSES.CONFIRMED);
    check('the department is derived from the doctor, not the request', booked.result?.departmentId === doctor.departmentId, {
      got: booked.result?.departmentId,
      wrong: wrongDepartment,
    });

    const afterBooking = await service.computeAvailableSlots(doctor.doctorId, FUTURE_DATE);
    check(
      'the booked slot disappears from the picker',
      afterBooking.result.every(slot => slot.startTime !== '09:00') && afterBooking.result.length === 11
    );

    console.log('\nBook — outside the published hours');
    const patientB = await seedPatient('b');
    const outside = await service.book(
      {
        patientId: patientB,
        doctorId: doctor.doctorId,
        departmentId: doctor.departmentId,
        date: FUTURE_DATE,
        startTime: '14:00',
        endTime: '14:20',
        reason: '',
      },
      bookedBy
    );
    check('a slot outside published hours is refused', !outside.success && outside.errors[0]?.field === 'startTime', outside.errors);

    console.log('\nDouble-booking — two at once, one wins at the database');
    const [racePatient1, racePatient2] = await Promise.all([seedPatient('r1'), seedPatient('r2')]);
    const race = await Promise.all([
      service.book(
        {
          patientId: racePatient1,
          doctorId: doctor.doctorId,
          departmentId: doctor.departmentId,
          date: FUTURE_DATE,
          startTime: '10:00',
          endTime: '10:20',
          reason: '',
        },
        bookedBy
      ),
      service.book(
        {
          patientId: racePatient2,
          doctorId: doctor.doctorId,
          departmentId: doctor.departmentId,
          date: FUTURE_DATE,
          startTime: '10:00',
          endTime: '10:20',
          reason: '',
        },
        bookedBy
      ),
    ]);
    const raceWon = race.filter(result => result.success).length;
    check(
      'exactly one of two simultaneous bookings succeeds',
      raceWon === 1,
      race.map(r => (r.success ? 'ok' : r.errors[0]?.code))
    );
    check(
      'the loser is refused, not crashed',
      race.some(result => !result.success && result.errors.length > 0)
    );

    console.log('\nCheck-in — sequential tokens per doctor per day');
    const checkedIn1 = await service.changeStatus(
      { appointmentId: booked.result?.appointmentId ?? '', status: APPOINTMENT_STATUSES.CHECKED_IN, cancelledReason: '' },
      bookedBy
    );
    check(
      'a confirmed appointment checks in',
      checkedIn1.success && checkedIn1.result?.status === APPOINTMENT_STATUSES.CHECKED_IN,
      checkedIn1.errors
    );
    check('check-in assigns token 1', checkedIn1.result?.tokenNo === 1, checkedIn1.result?.tokenNo);

    const raceWinner = race.find(result => result.success)?.result;
    const checkedIn2 = await service.changeStatus(
      { appointmentId: raceWinner?.appointmentId ?? '', status: APPOINTMENT_STATUSES.CHECKED_IN, cancelledReason: '' },
      bookedBy
    );
    check('the next check-in for the same doctor and day is token 2', checkedIn2.result?.tokenNo === 2, checkedIn2.result?.tokenNo);

    console.log('\nLifecycle — legal and illegal moves');
    const illegal = await service.changeStatus(
      { appointmentId: raceWinner?.appointmentId ?? '', status: APPOINTMENT_STATUSES.COMPLETED, cancelledReason: '' },
      bookedBy
    );
    check('checked-in cannot jump straight to completed', !illegal.success, illegal.errors);

    const cancelCheckedIn = await service.changeStatus(
      { appointmentId: booked.result?.appointmentId ?? '', status: APPOINTMENT_STATUSES.CANCELLED, cancelledReason: 'nope' },
      bookedBy
    );
    check(
      'a checked-in appointment cannot be cancelled',
      !cancelCheckedIn.success && cancelCheckedIn.errors[0]?.code === 33203,
      cancelCheckedIn.errors
    );

    console.log('\nCancel before check-in, and no-show only after the slot');
    const patientC = await seedPatient('c');
    const toCancel = await service.book(
      {
        patientId: patientC,
        doctorId: doctor.doctorId,
        departmentId: doctor.departmentId,
        date: FUTURE_DATE,
        startTime: '11:00',
        endTime: '11:20',
        reason: '',
      },
      bookedBy
    );
    const cancelled = await service.changeStatus(
      { appointmentId: toCancel.result?.appointmentId ?? '', status: APPOINTMENT_STATUSES.CANCELLED, cancelledReason: 'Patient chose another time' },
      bookedBy
    );
    check(
      'a confirmed appointment can be cancelled',
      cancelled.success && cancelled.result?.status === APPOINTMENT_STATUSES.CANCELLED,
      cancelled.errors
    );
    check(
      'cancelling frees the slot again',
      (await service.computeAvailableSlots(doctor.doctorId, FUTURE_DATE)).result.some(slot => slot.startTime === '11:00')
    );

    const futureNoShow = await service.changeStatus(
      { appointmentId: raceWinner?.appointmentId ?? '', status: APPOINTMENT_STATUSES.NO_SHOW, cancelledReason: '' },
      bookedBy
    );
    check('a no-show before the slot has passed is refused', !futureNoShow.success, futureNoShow.errors);

    const patientD = await seedPatient('d');
    const pastAppointment = await service.book(
      {
        patientId: patientD,
        doctorId: doctor.doctorId,
        departmentId: doctor.departmentId,
        date: PAST_DATE,
        startTime: '09:00',
        endTime: '09:20',
        reason: '',
      },
      bookedBy
    );
    const pastNoShow = await service.changeStatus(
      { appointmentId: pastAppointment.result?.appointmentId ?? '', status: APPOINTMENT_STATUSES.NO_SHOW, cancelledReason: '' },
      bookedBy
    );
    check(
      'a no-show after the slot has passed is allowed',
      pastNoShow.success && pastNoShow.result?.status === APPOINTMENT_STATUSES.NO_SHOW,
      pastNoShow.errors
    );

    console.log('\nQueue — derived, urgent first then by token');
    const q1 = await queue.getQueue(doctor.doctorId, FUTURE_DATE);
    check(
      'the queue holds the two checked-in patients',
      q1.result.length === 2,
      q1.result.map(entry => entry.tokenNo)
    );
    check('the queue is in token order when all are routine', (q1.result[0]?.tokenNo ?? 0) < (q1.result[1]?.tokenNo ?? 0));

    // Make the token-2 patient an emergency; it must jump ahead of token 1.
    await Appointment.updateOne({ _id: raceWinner?.appointmentId }, { triagePriority: TRIAGE_PRIORITIES.EMERGENCY });
    const q2 = await queue.getQueue(doctor.doctorId, FUTURE_DATE);
    check(
      'an emergency jumps the queue ahead of a lower token',
      q2.result[0]?.appointmentId === raceWinner?.appointmentId,
      q2.result.map(entry => `${entry.triagePriority}:${entry.tokenNo}`)
    );

    console.log('\nReschedule — moves the slot, frees the old one');
    const patientE = await seedPatient('e');
    const toMove = await service.book(
      {
        patientId: patientE,
        doctorId: doctor.doctorId,
        departmentId: doctor.departmentId,
        date: FUTURE_DATE,
        startTime: '12:00',
        endTime: '12:20',
        reason: '',
      },
      bookedBy
    );

    // The reschedule picker excludes the appointment itself, so its own current slot shows as free (review finding).
    const excludingSelf = await service.computeAvailableSlots(doctor.doctorId, FUTURE_DATE, toMove.result?.appointmentId ?? null);
    check(
      'a reschedule sees its own current slot as free',
      excludingSelf.result.some(slot => slot.startTime === '12:00'),
      excludingSelf.result.map(slot => slot.startTime)
    );
    const withoutExcluding = await service.computeAvailableSlots(doctor.doctorId, FUTURE_DATE);
    check(
      'the same slot is otherwise counted as taken',
      withoutExcluding.result.every(slot => slot.startTime !== '12:00')
    );

    const moved = await service.reschedule({
      appointmentId: toMove.result?.appointmentId ?? '',
      doctorId: doctor.doctorId,
      date: FUTURE_DATE,
      startTime: '12:20',
      endTime: '12:40',
      reason: '',
    });
    check('an appointment reschedules to a free slot', moved.success && moved.result?.startTime === '12:20', moved.errors);
    const afterMove = await service.computeAvailableSlots(doctor.doctorId, FUTURE_DATE);
    check(
      'the old slot is free and the new one is taken',
      afterMove.result.some(slot => slot.startTime === '12:00') && afterMove.result.every(slot => slot.startTime !== '12:20')
    );
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const doctors = await Doctor.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const doctorIds = doctors.map(doctor => doctor._id);
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(patient => patient._id);

    const removedAppointments = await Appointment.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Availability.deleteMany({ doctor: { $in: doctorIds } });
    await Counter.deleteMany({ _id: new RegExp(`^appointment-token-(${doctorIds.map(id => String(id)).join('|')})-`) });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedAppointments.deletedCount} appointment(s), ${removedUsers.deletedCount} user(s)`);
    check(
      'nothing this run created is left behind',
      (await User.countDocuments({ email: emailPattern })) === 0 && (await Appointment.countDocuments({ doctor: { $in: doctorIds } })) === 0
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
