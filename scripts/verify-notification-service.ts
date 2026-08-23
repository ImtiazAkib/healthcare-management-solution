import mongoose from 'mongoose';

import { Appointment, Availability, Department, Doctor, Notification, Patient, User } from '@/models';
import { SessionUser } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { NOTICE_AUDIENCES, NOTICE_CATEGORIES } from '@/constants/notice.const';
import { NOTIFICATION_CHANNELS, NOTIFICATION_KINDS, NOTIFICATION_STATUSES } from '@/constants/notification.const';
import { USER_ROLES } from '@/constants/roles.const';
import { DAYS_OF_WEEK } from '@/constants/schedule.const';

import { connectToDatabase } from '@/lib/mongodb';
import { resultReleasedContent } from '@/lib/notify';
import { AppointmentService, NoticeService, NotificationService, ReminderService } from '@/lib/services';
import { toCalendarDate } from '@/lib/utils';

import type { UserEntity } from '@/models/user.model';

/*
  Exercises the notification subsystem against a real database, then removes what it made.

  The substance is the rules the screen cannot vouch for: every notification is a **record first** —
  an in-app one is written and seen at once, and a dispatch that cannot reach its recipient leaves a
  **failed** row carrying the reason rather than vanishing; **read is scoped** to the recipient;
  booking an appointment **writes a confirmation** the patient sees; the **reminder sweep is
  idempotent** — run twice, one reminder per appointment; an **emergency notice fans out** to its
  audience; and no notification names a clinical result.

  Fixtures carry a run-scoped suffix and are removed case-insensitively. The mail and SMS transports
  are the default logs, so nothing leaves the machine.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const email = (local: string) => `${local}.${SUFFIX}@example.test`.toLowerCase();

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

async function seedPatient(local: string, withPhone: boolean): Promise<{ userId: string; patientId: string }> {
  const account = await User.create({
    name: `Patient ${local} ${SUFFIX}`,
    email: email(local),
    role: USER_ROLES.PATIENT,
    isEmailVerified: true,
    isApproved: true,
    isActive: true,
    ...(withPhone ? { phone: '+8801712345678' } : {}),
  });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2097-${String(mrnCounter).padStart(6, '0')}` });

  return { userId: String(account._id), patientId: String(patient._id) };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  // syncIndexes for Notification: it reconciles the reminder index if an earlier run built an older spec.
  await Promise.all([User.createIndexes(), Patient.createIndexes(), Doctor.createIndexes(), Appointment.createIndexes(), Notification.syncIndexes()]);

  const notifications = new NotificationService();
  const reminders = new ReminderService();
  const appointments = new AppointmentService();
  const notices = new NoticeService();

  try {
    const patientA = await seedPatient('pt-a', true);
    const patientB = await seedPatient('pt-b', false);

    const doctorAccount = await User.create({
      name: `Dr ${SUFFIX}`,
      email: email('doc'),
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const department = await Department.create({ name: `Cardiology ${SUFFIX}`, code: `CAR${SUFFIX}`.slice(0, 12) });
    const doctor = await Doctor.create({
      user: doctorAccount._id,
      department: department._id,
      specialization: 'General',
      registrationNo: `REG-${SUFFIX}`,
      consultationFee: 0,
    });
    await Availability.insertMany(
      DAYS_OF_WEEK.map(day => ({
        doctor: doctor._id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '13:00',
        slotMinutes: 20,
        effectiveFrom: '2019-01-01',
      }))
    );
    const admin = await User.create({
      name: `Ada ${SUFFIX}`,
      email: email('admin'),
      role: USER_ROLES.ADMIN,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });

    console.log('Record first — an in-app notification is written and seen at once');
    const inApp = await notifications.notify({
      recipientId: patientA.userId,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      kind: NOTIFICATION_KINDS.APPOINTMENT_CONFIRMED,
      subject: 'S',
      body: 'B',
    });
    check('the in-app notification is sent on write', inApp.success && inApp.result?.status === NOTIFICATION_STATUSES.SENT, inApp.errors);
    check('it is unread and shows on the recipient list', inApp.result?.isRead === false);
    check('the unread count reflects it', (await notifications.unreadCount(patientA.userId)) >= 1);

    console.log('\nEmail — dispatched through the log transport, marked sent');
    const emailNote = await notifications.notify({
      recipientId: patientA.userId,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      kind: NOTIFICATION_KINDS.RESULT_RELEASED,
      subject: 'S',
      body: 'B',
    });
    check('the email notification is marked sent', emailNote.success && emailNote.result?.status === NOTIFICATION_STATUSES.SENT, emailNote.errors);

    console.log('\nFailed dispatch — leaves a failed row carrying the reason');
    const smsNoPhone = await notifications.notify({
      recipientId: patientB.userId,
      channel: NOTIFICATION_CHANNELS.SMS,
      kind: NOTIFICATION_KINDS.FOLLOW_UP_DUE,
      subject: 'S',
      body: 'B',
    });
    check(
      'an SMS to a recipient with no phone fails rather than vanishing',
      smsNoPhone.success && smsNoPhone.result?.status === NOTIFICATION_STATUSES.FAILED,
      smsNoPhone.errors
    );
    check('the failed row keeps a reason', Boolean(smsNoPhone.result?.failureReason));
    const smsWithPhone = await notifications.notify({
      recipientId: patientA.userId,
      channel: NOTIFICATION_CHANNELS.SMS,
      kind: NOTIFICATION_KINDS.FOLLOW_UP_DUE,
      subject: 'S',
      body: 'B',
    });
    check(
      'an SMS to a recipient with a phone is sent (log transport)',
      smsWithPhone.result?.status === NOTIFICATION_STATUSES.SENT,
      smsWithPhone.errors
    );

    console.log('\nRead — scoped to the recipient');
    const noteId = inApp.result?.notificationId ?? '';
    const otherReads = await notifications.markRead(noteId, patientB.userId);
    check('another person cannot mark it read — not found', !otherReads.success);
    const ownReads = await notifications.markRead(noteId, patientA.userId);
    check('the recipient marks their own read', ownReads.success, ownReads.errors);
    const afterRead = (await notifications.listForRecipient(patientA.userId)).result.find(note => note.notificationId === noteId);
    check('it now shows as read', afterRead?.isRead === true);

    console.log('\nBooking — writes a confirmation the patient sees in-app');
    const bookDate = toCalendarDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const booked = await appointments.book(
      {
        patientId: patientA.patientId,
        doctorId: String(doctor._id),
        departmentId: String(department._id),
        date: bookDate,
        startTime: '09:00',
        endTime: '09:20',
        reason: 'Checkup',
      },
      patientA.userId
    );
    check('the booking succeeds', booked.success, booked.errors);
    const confirmation = (await notifications.listForRecipient(patientA.userId)).result.find(
      note => note.kind === NOTIFICATION_KINDS.APPOINTMENT_CONFIRMED && note.relatedId === booked.result?.appointmentId
    );
    check('a confirmation notification was written for the patient', Boolean(confirmation));

    console.log('\nReminder sweep — idempotent, one reminder per appointment');
    const reminderDate = toCalendarDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const dueAppointment = await Appointment.create({
      patient: patientA.patientId,
      doctor: doctor._id,
      department: department._id,
      date: reminderDate,
      startTime: '10:00',
      endTime: '10:20',
      status: APPOINTMENT_STATUSES.CONFIRMED,
      bookedBy: doctorAccount._id,
    });
    await reminders.sweep();
    const firstCount = await Notification.countDocuments({ kind: NOTIFICATION_KINDS.APPOINTMENT_REMINDER, relatedId: dueAppointment._id });
    check('the sweep writes one reminder for the due appointment', firstCount === 1, firstCount);
    await reminders.sweep();
    const secondCount = await Notification.countDocuments({ kind: NOTIFICATION_KINDS.APPOINTMENT_REMINDER, relatedId: dueAppointment._id });
    check('running the sweep again writes no second reminder', secondCount === 1, secondCount);

    console.log('\nEmergency — a notice fans out to its audience as notifications');
    const emergency = await notices.create(
      {
        title: `Evacuate ${SUFFIX}`,
        body: 'Now.',
        audience: NOTICE_AUDIENCES.DEPARTMENT,
        category: NOTICE_CATEGORIES.EMERGENCY,
        departmentId: String(department._id),
      },
      null,
      sessionOf(admin.toObject())
    );
    check('the emergency notice publishes', emergency.success, emergency.errors);
    const alerted = await Notification.countDocuments({ recipient: doctorAccount._id, kind: NOTIFICATION_KINDS.EMERGENCY_NOTICE });
    check('the department doctor was alerted in-app', alerted >= 1, alerted);

    console.log('\nNo clinical content — a released-result message names no result');
    const released = resultReleasedContent();
    check(
      'the result-ready message says a result is ready and to sign in, never the result',
      released.body.toLowerCase().includes('sign in') && !/\d/.test(released.body)
    );
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(patient => patient._id);

    const doctorIds = (
      await Doctor.find({ user: { $in: userIds } })
        .select('_id')
        .lean()
    ).map(doctor => doctor._id);
    await Notification.deleteMany({ recipient: { $in: userIds } });
    await Appointment.deleteMany({ patient: { $in: patientIds } });
    await Availability.deleteMany({ doctor: { $in: doctorIds } });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(SUFFIX) });

    console.log(`  removed ${removedUsers.deletedCount} user(s)`);
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
