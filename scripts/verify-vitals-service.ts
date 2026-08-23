import mongoose from 'mongoose';

import { Appointment, Department, Doctor, Patient, User } from '@/models';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { USER_ROLES } from '@/constants/roles.const';

import { connectToDatabase } from '@/lib/mongodb';
import { VitalsRecordSchema } from '@/lib/schemas';
import { QueueService, TriageService, VitalsService } from '@/lib/services';

import type { AppointmentStatus } from '@/types';

/*
  Exercises VitalsService and TriageService against a real database, then removes what it made.

  The substance is the write path steps 9/10 did not build: a nurse records vitals (stamped with who
  and when) and sets a triage priority that **reorders the live queue** ahead of token order. Range
  refusal is the schema's job and is checked there; the service refuses a booking that has not
  arrived.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
const NAME_TAG = `zz-vitals-${SUFFIX}`;
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

async function seedDoctor(): Promise<{ doctorId: string; departmentId: string }> {
  const account = await User.create({ name: `Dr ${SUFFIX}`, email: email('dr'), role: USER_ROLES.DOCTOR, isApproved: true });
  const department = await Department.create({ name: `Dept ${NAME_TAG}`, code: `D${SUFFIX}`.toUpperCase().slice(0, 12) });
  const doctor = await Doctor.create({
    user: account._id,
    department: department._id,
    specialization: 'General',
    registrationNo: `REG-${SUFFIX}`,
    consultationFee: 0,
  });

  return { doctorId: String(doctor._id), departmentId: String(department._id) };
}

async function seedPatient(): Promise<string> {
  const account = await User.create({ name: `Patient ${SUFFIX}`, email: email('pt'), role: USER_ROLES.PATIENT, isApproved: true });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2099-${String(mrnCounter).padStart(6, '0')}` });

  return String(patient._id);
}

async function seedAppointment(
  doctorId: string,
  patientId: string,
  departmentId: string,
  status: AppointmentStatus,
  startTime: string,
  tokenNo?: number
): Promise<string> {
  const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3, 5));
  const endMinutes = startMinutes + 20;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  const appointment = await Appointment.create({
    patient: patientId,
    doctor: doctorId,
    department: departmentId,
    date: '2099-06-15',
    startTime,
    endTime,
    status,
    bookedBy: new mongoose.Types.ObjectId(),
    ...(tokenNo ? { tokenNo, checkedInAt: new Date() } : {}),
  });

  return String(appointment._id);
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([Appointment.createIndexes(), Doctor.createIndexes(), Patient.createIndexes(), User.createIndexes()]);

  const vitals = new VitalsService();
  const triage = new TriageService();
  const queue = new QueueService();
  const nurseUserId = String(new mongoose.Types.ObjectId());

  try {
    const drA = await seedDoctor();
    const patient = await seedPatient();

    const firstArrival = await seedAppointment(drA.doctorId, patient, drA.departmentId, APPOINTMENT_STATUSES.CHECKED_IN, '09:00', 1);
    const secondArrival = await seedAppointment(drA.doctorId, patient, drA.departmentId, APPOINTMENT_STATUSES.CHECKED_IN, '09:20', 2);

    console.log('Vitals — recorded with who and when');
    const recorded = await vitals.recordVitals(
      {
        appointmentId: firstArrival,
        systolic: 118,
        diastolic: 78,
        pulse: 72,
        temperature: 36.8,
        respiratoryRate: 16,
        oxygenSaturation: 98,
        weight: 70,
        height: 175,
      },
      nurseUserId
    );
    check('vitals are recorded on a checked-in appointment', recorded.success && recorded.result?.vitals?.pulse === 72, recorded.errors);
    check('the vitals are stamped with the recorder', recorded.result?.vitals?.recordedBy === nurseUserId);
    check('the vitals carry a timestamp', Boolean(recorded.result?.vitals?.recordedAt));

    const confirmed = await seedAppointment(drA.doctorId, patient, drA.departmentId, APPOINTMENT_STATUSES.CONFIRMED, '10:00');
    const beforeArrival = await vitals.recordVitals({ appointmentId: confirmed, pulse: 70 }, nurseUserId);
    check('vitals are refused before the patient has checked in', !beforeArrival.success, beforeArrival.errors);

    console.log('\nRange — a typo is refused at the schema');
    const badReading = VitalsRecordSchema.safeParse({ appointmentId: firstArrival, temperature: 986 });
    check('a temperature of 986 is refused', !badReading.success);

    console.log('\nTriage — set, stamped, and it reorders the queue');
    const prioritized = await triage.setPriority({ appointmentId: secondArrival, triagePriority: 'emergency' }, nurseUserId);
    check('the triage priority is set', prioritized.success && prioritized.result?.triagePriority === 'emergency', prioritized.errors);
    check('the triage is stamped with who set it', prioritized.result?.triagedById === nurseUserId && Boolean(prioritized.result?.triagedAt));

    const triageBeforeArrival = await triage.setPriority({ appointmentId: confirmed, triagePriority: 'urgent' }, nurseUserId);
    check('triage is refused before the patient has checked in', !triageBeforeArrival.success);

    const live = await queue.getQueue(drA.doctorId, '2099-06-15');
    check(
      'the emergency sits ahead of the lower-token routine patient',
      live.result[0]?.appointmentId === secondArrival && live.result[1]?.appointmentId === firstArrival,
      live.result.map(entry => ({ token: entry.tokenNo, priority: entry.triagePriority }))
    );
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const doctors = await Doctor.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const doctorIds = doctors.map(doctor => doctor._id);
    const patientIds = patients.map(patient => patient._id);

    const removedAppointments = await Appointment.deleteMany({ $or: [{ doctor: { $in: doctorIds } }, { patient: { $in: patientIds } }] });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await Department.deleteMany({ name: new RegExp(NAME_TAG, 'i') });
    const removedUsers = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removedAppointments.deletedCount} appointment(s), ${removedUsers.deletedCount} user(s)`);
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
