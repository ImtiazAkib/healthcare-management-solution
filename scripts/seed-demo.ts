import mongoose from 'mongoose';

import { Appointment, Availability, Department, Doctor, Encounter, Patient, ServiceItem, User } from '@/models';
import { ServiceCategory } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { USER_ROLES } from '@/constants/roles.const';
import { DAYS_OF_WEEK } from '@/constants/schedule.const';
import { SERVICE_CATEGORIES } from '@/constants/service.const';

import { connectToDatabase } from '@/lib/mongodb';
import { issueMedicalRecordNo } from '@/lib/services';
import { toCalendarDate } from '@/lib/utils';

import type { DepartmentEntity } from '@/models/department.model';
import type { DoctorEntity } from '@/models/doctor.model';
import type { UserEntity } from '@/models/user.model';

/*
  Seeds a small but complete demo hospital so a fresh clone has something to click around: a super
  administrator, an administrator, three doctors across two departments, two nurses, a lab account,
  twenty patients, a priced service catalogue, a week of availability, and a day of appointments.

  It is **safe to re-run.** Accounts, departments and services are created only if they are not
  already there (matched by email or code), so a second run never duplicates them or resets a
  password. The time-sensitive data — availability and the day's appointments — is cleared for the
  demo doctors and rebuilt, so re-running refreshes the schedule to today rather than piling up.

  Every demo account signs in with one password, printed at the end. It defaults to a known demo
  value for a laptop; set `SEED_DEMO_PASSWORD` to override it. This is demo data — do not point it at
  a database that matters.
*/
const PASSWORD = process.env.SEED_DEMO_PASSWORD || 'CareSync-Demo-1';
const DOMAIN = 'demo.hospital';
const email = (local: string) => `${local}@${DOMAIN}`;

/** Find an account by email, or create it with the demo password. Idempotent on the address. */
async function ensureUser(
  local: string,
  fields: { name: string; role: UserEntity['role']; phone?: string; gender?: UserEntity['gender']; dateOfBirth?: Date }
): Promise<UserEntity> {
  const address = email(local);
  const existing = await User.findOne({ email: address }).lean<UserEntity | null>();

  if (existing) {
    return existing;
  }

  const created = await User.create({
    name: fields.name,
    email: address,
    password: PASSWORD,
    role: fields.role,
    isEmailVerified: true,
    isApproved: true,
    isActive: true,
    phone: fields.phone,
    gender: fields.gender,
    dateOfBirth: fields.dateOfBirth,
  });

  return created.toObject();
}

async function ensureDepartment(code: string, name: string): Promise<DepartmentEntity> {
  const existing = await Department.findOne({ code }).lean<DepartmentEntity | null>();

  return existing ?? (await Department.create({ code, name })).toObject();
}

async function ensureService(code: string, name: string, category: ServiceCategory, priceMinorUnits: number): Promise<void> {
  if (!(await ServiceItem.findOne({ code }).lean())) {
    await ServiceItem.create({ code, name, category, priceMinorUnits });
  }
}

async function ensureDoctor(
  local: string,
  name: string,
  department: DepartmentEntity,
  specialization: string,
  registrationNo: string,
  consultationFee: number
): Promise<DoctorEntity> {
  const account = await ensureUser(local, { name, role: USER_ROLES.DOCTOR });
  const existing = await Doctor.findOne({ user: account._id }).lean<DoctorEntity | null>();

  if (existing) {
    return existing;
  }

  return (
    await Doctor.create({ user: account._id, department: department._id, specialization, registrationNo, consultationFee, isAcceptingPatients: true })
  ).toObject();
}

async function seed(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  // A super administrator is seeded only if the facility has none — never a second one.
  const superAdmin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN }).lean<UserEntity | null>();
  const seededDirector = !superAdmin;
  if (seededDirector) {
    await ensureUser('director', { name: 'Dr. Rahim Director', role: USER_ROLES.SUPER_ADMIN });
    console.log('  seeded the super administrator (director@demo.hospital)');
  } else {
    console.log(`  a super administrator already exists (${superAdmin?.email}) — left as is, with its own password`);
  }

  await ensureUser('admin', { name: 'Anwara Admin', role: USER_ROLES.ADMIN });
  await ensureUser('nurse1', { name: 'Nadia Nurse', role: USER_ROLES.NURSE });
  await ensureUser('nurse2', { name: 'Nasrin Nurse', role: USER_ROLES.NURSE });
  await ensureUser('lab', { name: 'Central Diagnostic Lab', role: USER_ROLES.LAB });

  const cardiology = await ensureDepartment('CARD', 'Cardiology');
  const orthopedics = await ensureDepartment('ORTHO', 'Orthopedics');
  await ensureDepartment('GEN', 'General Medicine');

  await Promise.all([
    ensureService('CONSULT', 'General consultation', SERVICE_CATEGORIES.CONSULTATION, 60000),
    ensureService('SPECIALIST', 'Specialist consultation', SERVICE_CATEGORIES.CONSULTATION, 100000),
    ensureService('CBC', 'Complete blood count', SERVICE_CATEGORIES.LAB, 45000),
    ensureService('XRAY', 'X-ray, single view', SERVICE_CATEGORIES.LAB, 80000),
    ensureService('DRESS', 'Wound dressing', SERVICE_CATEGORIES.PROCEDURE, 30000),
  ]);

  const doctors = await Promise.all([
    ensureDoctor('dr.karim', 'Dr. Karim Ahmed', cardiology, 'Interventional cardiology', 'BMDC-A-10001', 100000),
    ensureDoctor('dr.sultana', 'Dr. Sultana Begum', cardiology, 'Cardiology', 'BMDC-A-10002', 90000),
    ensureDoctor('dr.hasan', 'Dr. Hasan Ali', orthopedics, 'Orthopedic surgery', 'BMDC-A-10003', 90000),
  ]);

  // Twenty patients, each an approved account with a minted medical record number.
  const patients: { patientId: mongoose.Types.ObjectId; name: string }[] = [];
  for (let index = 1; index <= 20; index += 1) {
    const label = String(index).padStart(2, '0');
    const account = await ensureUser(`patient${label}`, {
      name: `Patient ${label}`,
      role: USER_ROLES.PATIENT,
      gender: index % 2 === 0 ? 'female' : 'male',
      dateOfBirth: new Date(1970 + (index % 40), index % 12, ((index * 3) % 27) + 1),
    });

    let patient = await Patient.findOne({ user: account._id }).lean();
    if (!patient) {
      patient = await (await Patient.create({ user: account._id, medicalRecordNo: await issueMedicalRecordNo() })).toObject();
    }
    patients.push({ patientId: patient._id, name: `Patient ${label}` });
  }
  console.log(`  ensured ${doctors.length} doctors and ${patients.length} patients`);

  // Availability: refresh a week of weekday sittings for the demo doctors so booking works any day.
  const doctorIds = doctors.map(doctor => doctor._id);
  await Availability.deleteMany({ doctor: { $in: doctorIds } });
  const blocks = doctors.flatMap(doctor =>
    DAYS_OF_WEEK.map((day, dayIndex) => ({
      doctor: doctor._id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '13:00',
      slotMinutes: 20,
      room: `R-${String(doctor.registrationNo).slice(-2)}`,
      effectiveFrom: '2020-01-01',
      isActive: dayIndex !== 5, // closed on Friday, open the rest of the week
    }))
  );
  await Availability.insertMany(blocks);

  // A day of appointments for today: a spread of statuses across doctors and patients.
  const today = toCalendarDate(new Date());
  await Appointment.deleteMany({ doctor: { $in: doctorIds }, date: today });
  await Encounter.deleteMany({ doctor: { $in: doctorIds }, createdAt: { $gte: new Date(`${today}T00:00:00.000`) } });

  const slotTimes = ['09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00', '11:20', '11:40'];
  const statuses = [
    APPOINTMENT_STATUSES.COMPLETED,
    APPOINTMENT_STATUSES.COMPLETED,
    APPOINTMENT_STATUSES.CHECKED_IN,
    APPOINTMENT_STATUSES.CONFIRMED,
    APPOINTMENT_STATUSES.CONFIRMED,
    APPOINTMENT_STATUSES.NO_SHOW,
    APPOINTMENT_STATUSES.CONFIRMED,
    APPOINTMENT_STATUSES.CHECKED_IN,
    APPOINTMENT_STATUSES.CONFIRMED,
  ];

  const bookedBy = doctors[0].user;
  let created = 0;
  for (let index = 0; index < slotTimes.length; index += 1) {
    const doctor = doctors[index % doctors.length];
    const patient = patients[index];
    const startTime = slotTimes[index];
    const [hour, minute] = startTime.split(':').map(Number);
    const endTotal = hour * 60 + minute + 20;
    const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
    const status = statuses[index];

    const appointment = await Appointment.create({
      patient: patient.patientId,
      doctor: doctor._id,
      department: doctor.department,
      date: today,
      startTime,
      endTime,
      status,
      tokenNo: index + 1,
      bookedBy,
      ...(status === APPOINTMENT_STATUSES.CHECKED_IN || status === APPOINTMENT_STATUSES.COMPLETED ? { checkedInAt: new Date() } : {}),
      ...(status === APPOINTMENT_STATUSES.COMPLETED ? { completedAt: new Date() } : {}),
    });

    // Give the completed visits an encounter, so the timeline and analytics have something to show.
    if (status === APPOINTMENT_STATUSES.COMPLETED) {
      await Encounter.create({
        appointment: appointment._id,
        patient: patient.patientId,
        doctor: doctor._id,
        chiefComplaint: 'Follow-up review',
        diagnoses: [{ description: 'Essential hypertension', code: 'I10' }],
        status: ENCOUNTER_STATUSES.COMPLETED,
        completedAt: new Date(),
      });
    }

    created += 1;
  }
  console.log(`  scheduled ${created} appointments for ${today}`);

  console.log('\nDemo hospital ready. Sign in with any of these and the password below:');
  if (seededDirector) {
    console.log('  director@demo.hospital   (super administrator)');
  }
  console.log('  admin@demo.hospital      (administrator)');
  console.log('  dr.karim@demo.hospital   (doctor)');
  console.log('  nurse1@demo.hospital     (nurse)');
  console.log('  lab@demo.hospital        (diagnostic lab)');
  console.log('  patient01@demo.hospital  (patient)');
  console.log(`\n  password: ${PASSWORD}\n`);

  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error('Seeding the demo hospital failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
