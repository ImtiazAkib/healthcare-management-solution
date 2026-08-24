import mongoose from 'mongoose';

import {
  Appointment,
  Availability,
  Department,
  Doctor,
  Encounter,
  Invoice,
  LabOrder,
  LabReport,
  Notification,
  Patient,
  Payment,
  Prescription,
  ServiceItem,
  User,
} from '@/models';
import { SessionUser } from '@/types';

import { APPOINTMENT_STATUSES } from '@/constants/appointment.const';
import { INVOICE_STATUSES, PAYMENT_METHODS } from '@/constants/billing.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { LAB_PRIORITIES, LAB_STATUSES } from '@/constants/lab.const';
import { NOTIFICATION_KINDS } from '@/constants/notification.const';
import { PRESCRIPTION_FREQUENCIES } from '@/constants/prescription.const';
import { USER_ROLES } from '@/constants/roles.const';
import { DAYS_OF_WEEK } from '@/constants/schedule.const';
import { SERVICE_CATEGORIES } from '@/constants/service.const';

import { connectToDatabase } from '@/lib/mongodb';
import {
  AppointmentService,
  EncounterService,
  InvoiceService,
  LabService,
  PaymentService,
  PrescriptionService,
  RegistrationService,
  VitalsService,
} from '@/lib/services';
import { toCalendarDate } from '@/lib/utils';

import type { UserEntity } from '@/models/user.model';

/*
  The end-to-end smoke path — the flow that crosses every service, run against a real database and
  cleaned up after: register a patient, verify the email, approve the account, book an appointment,
  check in, record vitals, open and complete a consultation, prescribe, order a lab test, upload and
  release the report, raise the invoice from the catalogue, and take the payment. It asserts the state
  each step leaves behind and that the two notifications the flow should send were written.

  This is the "does the whole thing still hang together" test, not an exhaustive per-service one —
  those are the `verify:*` scripts. Fixtures carry a run-scoped suffix and are removed at the end.
*/
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-6);
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

function sessionOf(account: UserEntity): SessionUser {
  return { userId: String(account._id), role: account.role, email: account.email, name: account.name, isApproved: account.isApproved };
}

function pdfFile(name: string): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a])], name, { type: 'application/pdf' });
}

async function run(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  const registration = new RegistrationService();
  const appointments = new AppointmentService();
  const vitals = new VitalsService();
  const encounters = new EncounterService();
  const prescriptions = new PrescriptionService();
  const lab = new LabService();
  const invoices = new InvoiceService();
  const payments = new PaymentService();

  const userIds: mongoose.Types.ObjectId[] = [];

  try {
    // Staff and catalogue the flow needs.
    const department = await Department.create({ name: `Cardiology ${SUFFIX}`, code: `CAR${SUFFIX}`.slice(0, 12) });
    const doctorUser = await User.create({
      name: `Dr ${SUFFIX}`,
      email: email('doc'),
      role: USER_ROLES.DOCTOR,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const doctor = await Doctor.create({
      user: doctorUser._id,
      department: department._id,
      specialization: 'Cardiology',
      registrationNo: `REG-${SUFFIX}`,
      consultationFee: 60000,
    });
    const nurseUser = await User.create({
      name: `Nurse ${SUFFIX}`,
      email: email('nurse'),
      role: USER_ROLES.NURSE,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const labUser = await User.create({
      name: `Lab ${SUFFIX}`,
      email: email('lab'),
      role: USER_ROLES.LAB,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const adminUser = await User.create({
      name: `Admin ${SUFFIX}`,
      email: email('admin'),
      role: USER_ROLES.ADMIN,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    userIds.push(doctorUser._id, nurseUser._id, labUser._id, adminUser._id);

    await Availability.insertMany(
      DAYS_OF_WEEK.map(day => ({
        doctor: doctor._id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '13:00',
        slotMinutes: 20,
        effectiveFrom: '2020-01-01',
      }))
    );
    const consult = await ServiceItem.create({
      code: `CON${SUFFIX}`.slice(0, 16),
      name: `Consultation ${SUFFIX}`,
      category: SERVICE_CATEGORIES.CONSULTATION,
      priceMinorUnits: 60000,
    });
    const cbc = await ServiceItem.create({
      code: `CBC${SUFFIX}`.slice(0, 16),
      name: `Blood count ${SUFFIX}`,
      category: SERVICE_CATEGORIES.LAB,
      priceMinorUnits: 45000,
    });

    const doctorSession = sessionOf(doctorUser.toObject());
    const labSession = sessionOf(labUser.toObject());
    const adminSession = sessionOf(adminUser.toObject());

    console.log('Register → verify → approve');
    const registered = await registration.register({ name: 'Smoke Patient', email: email('patient'), password: 'Str0ng-Pass!23', gender: undefined });
    check('the patient registers with a verification token', registered.success && Boolean(registered.result?.verificationToken), registered.errors);
    const patientUserId = registered.result?.user.userId ?? '';
    userIds.push(new mongoose.Types.ObjectId(patientUserId));

    const verified = await registration.verifyEmail(registered.result?.verificationToken ?? '');
    check('the email verifies from the link', verified.success, verified.errors);
    await User.updateOne({ _id: patientUserId }, { isApproved: true });

    const patient = await Patient.findOne({ user: patientUserId }).lean();
    check('registration created a patient record with a record number', Boolean(patient?.medicalRecordNo));
    const patientId = String(patient?._id);

    console.log('\nBook → check in → vitals');
    const bookDate = toCalendarDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    const booked = await appointments.book(
      {
        patientId,
        doctorId: String(doctor._id),
        departmentId: String(department._id),
        date: bookDate,
        startTime: '09:00',
        endTime: '09:20',
        reason: 'Chest discomfort',
      },
      String(adminUser._id)
    );
    check('the appointment is booked and confirmed', booked.success && booked.result?.status === APPOINTMENT_STATUSES.CONFIRMED, booked.errors);
    const appointmentId = booked.result?.appointmentId ?? '';

    const bookingNote = await Notification.findOne({ recipient: patientUserId, kind: NOTIFICATION_KINDS.APPOINTMENT_CONFIRMED }).lean();
    check('booking wrote the patient a confirmation notification', Boolean(bookingNote));

    const checkedIn = await appointments.changeStatus(
      { appointmentId, status: APPOINTMENT_STATUSES.CHECKED_IN, cancelledReason: '' },
      String(nurseUser._id)
    );
    check('the nurse checks the patient in and a token is assigned', checkedIn.success && Boolean(checkedIn.result?.tokenNo), checkedIn.errors);

    const recorded = await vitals.recordVitals({ appointmentId, systolic: 128, diastolic: 82, pulse: 76, temperature: 36.8 }, String(nurseUser._id));
    check('the nurse records vitals', recorded.success, recorded.errors);

    console.log('\nConsult → prescribe → order test → complete');
    const opened = await encounters.open({ appointmentId, chiefComplaint: 'Chest discomfort on exertion' }, doctorSession);
    check('the doctor opens the encounter', opened.success, opened.errors);
    const encounterId = opened.result?.encounterId ?? '';

    const prescribed = await prescriptions.issue(
      {
        encounterId,
        items: [{ drug: 'Aspirin', frequency: PRESCRIPTION_FREQUENCIES.ONCE_DAILY, dose: '75 mg', duration: '30 days' }],
        advice: 'Take after food.',
      },
      String(doctorUser._id)
    );
    check('the doctor issues a prescription', prescribed.success, prescribed.errors);

    const ordered = await lab.createOrder(
      { encounterId, tests: [{ name: 'Complete blood count', code: 'CBC' }], priority: LAB_PRIORITIES.ROUTINE, notes: '' },
      String(doctorUser._id)
    );
    check('the doctor orders a lab test', ordered.success, ordered.errors);
    const labOrderId = ordered.result?.labOrderId ?? '';

    const completed = await encounters.complete(encounterId, doctorSession);
    check('the doctor completes the encounter', completed.success && completed.result?.status === ENCOUNTER_STATUSES.COMPLETED, completed.errors);

    console.log('\nUpload → release (patient notified, no result named)');
    const uploaded = await lab.uploadReport(
      { labOrderId, summary: 'Within normal limits', findings: 'No abnormality detected.', file: pdfFile('report.pdf') },
      labSession
    );
    check('the lab uploads the report', uploaded.success, uploaded.errors);
    const labReportId = uploaded.result?.labReportId ?? '';

    const released = await lab.releaseReport({ labReportId }, labSession);
    check('the lab releases the report', released.success && released.result?.isReleased === true, released.errors);
    const order = await LabOrder.findById(labOrderId).lean();
    check('releasing moved the order to released', order?.status === LAB_STATUSES.RELEASED);
    const resultNote = await Notification.findOne({ recipient: patientUserId, kind: NOTIFICATION_KINDS.RESULT_RELEASED }).lean();
    check('releasing wrote the patient a result-ready notification', Boolean(resultNote));
    check('the result notification names no clinical detail', Boolean(resultNote) && !/normal|blood|count/i.test(String(resultNote?.body)));

    console.log('\nInvoice → pay');
    const raised = await invoices.create(
      {
        patientId,
        encounterId,
        lines: [
          { serviceItemId: String(consult._id), quantity: 1 },
          { serviceItemId: String(cbc._id), quantity: 1 },
        ],
        discountMinorUnits: 0,
        taxMinorUnits: 0,
      },
      adminSession
    );
    check('the invoice is raised from the catalogue', raised.success && raised.result?.totalMinorUnits === 105000, raised.errors);
    const invoiceId = raised.result?.invoiceId ?? '';

    const paid = await payments.record({ invoiceId, amountMinorUnits: 105000, method: PAYMENT_METHODS.CASH, reference: undefined }, adminSession);
    check(
      'the payment clears the invoice to paid',
      paid.success && paid.result?.status === INVOICE_STATUSES.PAID && paid.result?.balanceMinorUnits === 0,
      paid.errors
    );

    console.log(`\nThe full path completed end to end${failures === 0 ? '.' : ' with failures.'}`);
  } finally {
    console.log('\nCleaning up');
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(patient => patient._id);
    const appointmentRows = await Appointment.find({ patient: { $in: patientIds } })
      .select('_id')
      .lean();
    const appointmentIds = appointmentRows.map(appointment => appointment._id);
    const invoiceRows = await Invoice.find({ patient: { $in: patientIds } })
      .select('_id')
      .lean();
    const orders = await LabOrder.find({ patient: { $in: patientIds } })
      .select('_id')
      .lean();

    await Payment.deleteMany({ invoice: { $in: invoiceRows.map(invoice => invoice._id) } });
    await Invoice.deleteMany({ patient: { $in: patientIds } });
    await LabReport.deleteMany({ labOrder: { $in: orders.map(order => order._id) } });
    await LabOrder.deleteMany({ patient: { $in: patientIds } });
    await Prescription.deleteMany({ patient: { $in: patientIds } });
    await Encounter.deleteMany({ patient: { $in: patientIds } });
    await Appointment.deleteMany({ _id: { $in: appointmentIds } });
    await Notification.deleteMany({ recipient: { $in: userIds } });
    await Availability.deleteMany({
      doctor: {
        $in: (
          await Doctor.find({ user: { $in: userIds } })
            .select('_id')
            .lean()
        ).map(doctor => doctor._id),
      },
    });
    await Doctor.deleteMany({ user: { $in: userIds } });
    await Patient.deleteMany({ user: { $in: userIds } });
    await ServiceItem.deleteMany({ code: new RegExp(SUFFIX, 'i') });
    await Department.deleteMany({ name: new RegExp(SUFFIX) });
    const removed = await User.deleteMany({ _id: { $in: userIds } });

    console.log(`  removed ${removed.deletedCount} user(s)`);
    check('nothing this run created is left behind', (await User.countDocuments({ email: new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i') })) === 0);

    await mongoose.disconnect();
  }

  console.log(failures === 0 ? '\nSmoke test passed.\n' : `\n${failures} check(s) failed.\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch(async error => {
  console.error('Smoke test failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
