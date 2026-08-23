import mongoose from 'mongoose';

import { Encounter, Invoice, Patient, Payment, ServiceItem, User } from '@/models';
import { SessionUser } from '@/types';

import { INVOICE_STATUSES, PAYMENT_METHODS } from '@/constants/billing.const';
import { ENCOUNTER_STATUSES } from '@/constants/encounter.const';
import { USER_ROLES } from '@/constants/roles.const';
import { SERVICE_CATEGORIES } from '@/constants/service.const';

import { connectToDatabase } from '@/lib/mongodb';
import { InvoiceCreateSchema, PaymentRecordSchema } from '@/lib/schemas';
import { InvoiceService, PaymentService } from '@/lib/services';

import type { UserEntity } from '@/models/user.model';

/*
  Exercises the billing services against a real database, then removes what it made.

  The substance is the rules the screen cannot vouch for: **the server prices every line** from the
  catalogue and totals it, so a client-sent total has nowhere to enter; a line **snapshots** the
  price, so a later catalogue change cannot restate an issued bill; a part payment moves the invoice
  to **partial** and clearing the balance to **paid**, while **overpayment is refused**; a **void**
  keeps the record and its history and refuses a further payment; and a patient sees **only their
  own** invoices.

  Fixtures carry a run-scoped suffix and are removed case-insensitively.
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

async function seedPatient(local: string, name: string): Promise<{ userId: string; patientId: string; session: SessionUser }> {
  const account = await User.create({ name, email: email(local), role: USER_ROLES.PATIENT, isEmailVerified: true, isApproved: true, isActive: true });
  mrnCounter += 1;
  const patient = await Patient.create({ user: account._id, medicalRecordNo: `HMS-2096-${String(mrnCounter).padStart(6, '0')}` });

  return { userId: String(account._id), patientId: String(patient._id), session: sessionOf(account.toObject()) };
}

async function verify(): Promise<void> {
  await connectToDatabase();
  console.log(`Connected to "${mongoose.connection.name}".\n`);

  await Promise.all([User.createIndexes(), Patient.createIndexes(), ServiceItem.createIndexes(), Invoice.createIndexes(), Payment.createIndexes()]);

  const invoices = new InvoiceService();
  const payments = new PaymentService();

  try {
    const admin = await User.create({
      name: `Ada ${SUFFIX}`,
      email: email('admin'),
      role: USER_ROLES.ADMIN,
      isEmailVerified: true,
      isApproved: true,
      isActive: true,
    });
    const adminSession = sessionOf(admin.toObject());
    const patientA = await seedPatient('pt-a', 'Pat A');
    const patientB = await seedPatient('pt-b', 'Pat B');

    const consult = await ServiceItem.create({
      code: `CON${SUFFIX}`.slice(0, 16),
      name: `Consultation ${SUFFIX}`,
      category: SERVICE_CATEGORIES.CONSULTATION,
      priceMinorUnits: 50000,
    });
    const labItem = await ServiceItem.create({
      code: `LAB${SUFFIX}`.slice(0, 16),
      name: `Blood panel ${SUFFIX}`,
      category: SERVICE_CATEGORIES.LAB,
      priceMinorUnits: 30000,
    });

    const encounter = await Encounter.create({
      appointment: new mongoose.Types.ObjectId(),
      patient: patientA.patientId,
      doctor: new mongoose.Types.ObjectId(),
      status: ENCOUNTER_STATUSES.COMPLETED,
      completedAt: new Date(),
    });

    console.log('Server prices — a client total has nowhere to enter');
    const parsed = InvoiceCreateSchema.parse({
      patientId: patientA.patientId,
      lines: [{ serviceItemId: String(consult._id), quantity: 1 }],
      totalMinorUnits: 1,
      subtotalMinorUnits: 1,
      discountMinorUnits: '',
      taxMinorUnits: '',
    });
    check('subtotal and total are stripped by the schema', !('totalMinorUnits' in parsed) && !('subtotalMinorUnits' in parsed));

    console.log('\nRaise — from a completed encounter, both lines priced from the catalogue');
    const raised = await invoices.create(
      InvoiceCreateSchema.parse({
        patientId: patientA.patientId,
        encounterId: String(encounter._id),
        lines: [
          { serviceItemId: String(consult._id), quantity: 1 },
          { serviceItemId: String(labItem._id), quantity: 1 },
        ],
        discountMinorUnits: '10.00',
        taxMinorUnits: '5.00',
      }),
      adminSession
    );
    check('the invoice is raised', raised.success, raised.errors);
    // subtotal 80000, discount 1000, tax 500 -> total 79500. Lines priced from the catalogue.
    check(
      'the server computed the subtotal and total from the catalogue',
      raised.result?.subtotalMinorUnits === 80000 && raised.result?.totalMinorUnits === 79500,
      {
        subtotal: raised.result?.subtotalMinorUnits,
        total: raised.result?.totalMinorUnits,
      }
    );
    check('a tampered total was ignored — the invoice carries the server total', raised.result?.totalMinorUnits !== 1);
    check(
      'the line snapshots the catalogue price',
      raised.result?.lines[0]?.unitPriceMinorUnits === 50000 && raised.result?.lines[0]?.serviceCode === consult.code
    );
    check('the invoice starts unpaid', raised.result?.status === INVOICE_STATUSES.UNPAID && raised.result?.paidMinorUnits === 0);
    const invoiceId = raised.result?.invoiceId ?? '';

    console.log('\nSnapshot — a later catalogue change does not restate the bill');
    await ServiceItem.findByIdAndUpdate(consult._id, { priceMinorUnits: 999999 });
    const reread = await invoices.getById(invoiceId);
    check('the invoice still shows the price it billed', reread.result?.lines[0]?.unitPriceMinorUnits === 50000);

    console.log('\nPayments — part pays to partial, the balance to paid');
    const overpay = await payments.record(
      PaymentRecordSchema.parse({ invoiceId, amountMinorUnits: '1000.00', method: PAYMENT_METHODS.CASH }),
      adminSession
    );
    check('an overpayment is refused', !overpay.success, overpay.errors);
    const part = await payments.record(
      PaymentRecordSchema.parse({ invoiceId, amountMinorUnits: '400.00', method: PAYMENT_METHODS.CASH }),
      adminSession
    );
    check(
      'a part payment moves the invoice to partial',
      part.result?.status === INVOICE_STATUSES.PARTIAL && part.result?.paidMinorUnits === 40000,
      part.errors
    );
    const rest = await payments.record(
      PaymentRecordSchema.parse({ invoiceId, amountMinorUnits: '395.00', method: PAYMENT_METHODS.CARD, reference: 'RCPT-1' }),
      adminSession
    );
    check(
      'clearing the balance moves it to paid',
      rest.result?.status === INVOICE_STATUSES.PAID && rest.result?.balanceMinorUnits === 0,
      rest.errors
    );
    const afterPaid = await payments.record(
      PaymentRecordSchema.parse({ invoiceId, amountMinorUnits: '10.00', method: PAYMENT_METHODS.CASH }),
      adminSession
    );
    check('a paid invoice takes no further payment', !afterPaid.success, afterPaid.errors);
    const history = await payments.listForInvoice(invoiceId);
    check('the payment history holds both payments', history.result.length === 2);

    console.log('\nDiscount — cannot exceed the subtotal');
    const bigDiscount = await invoices.create(
      InvoiceCreateSchema.parse({
        patientId: patientA.patientId,
        lines: [{ serviceItemId: String(labItem._id), quantity: 1 }],
        discountMinorUnits: '9999.00',
        taxMinorUnits: '',
      }),
      adminSession
    );
    check('a discount larger than the subtotal is refused', !bigDiscount.success, bigDiscount.errors);

    console.log('\nVoid — keeps the record and refuses a payment');
    const toVoid = await invoices.create(
      InvoiceCreateSchema.parse({
        patientId: patientA.patientId,
        lines: [{ serviceItemId: String(labItem._id), quantity: 2 }],
        discountMinorUnits: '',
        taxMinorUnits: '',
      }),
      adminSession
    );
    const voided = await invoices.void({ invoiceId: toVoid.result?.invoiceId ?? '', reason: 'Billed in error' }, adminSession);
    check(
      'voiding succeeds and keeps the lines and a reason',
      voided.result?.status === INVOICE_STATUSES.VOID && voided.result?.voidReason === 'Billed in error' && (voided.result?.lines.length ?? 0) === 1,
      voided.errors
    );
    const payVoid = await payments.record(
      PaymentRecordSchema.parse({ invoiceId: toVoid.result?.invoiceId ?? '', amountMinorUnits: '10.00', method: PAYMENT_METHODS.CASH }),
      adminSession
    );
    check('a voided invoice takes no payment', !payVoid.success, payVoid.errors);
    const voidAgain = await invoices.void({ invoiceId: toVoid.result?.invoiceId ?? '', reason: 'Again' }, adminSession);
    check('a voided invoice cannot be voided again', !voidAgain.success, voidAgain.errors);

    console.log('\nPatient scoping — a patient sees only their own');
    const mineA = await invoices.listForPatient(patientA.session);
    check('patient A sees their own invoices', mineA.result.length >= 1 && mineA.result.every(invoice => invoice.patientId === patientA.patientId));
    const mineB = await invoices.listForPatient(patientB.session);
    check(
      'patient B sees none of A’s invoices',
      mineB.result.every(invoice => invoice.patientId === patientB.patientId)
    );
    const crossOwner = await invoices.getForPatient(invoiceId, patientB.session);
    check('patient B cannot open A’s invoice by id — not found', !crossOwner.success);
  } finally {
    console.log('\nCleaning up');
    const emailPattern = new RegExp(`\\.${SUFFIX}@example\\.test$`, 'i');
    const users = await User.find({ email: emailPattern }).select('_id').lean();
    const userIds = users.map(user => user._id);
    const patients = await Patient.find({ user: { $in: userIds } })
      .select('_id')
      .lean();
    const patientIds = patients.map(patient => patient._id);
    const invoiceRows = await Invoice.find({ patient: { $in: patientIds } })
      .select('_id')
      .lean();

    await Payment.deleteMany({ invoice: { $in: invoiceRows.map(invoice => invoice._id) } });
    await Invoice.deleteMany({ patient: { $in: patientIds } });
    await Encounter.deleteMany({ patient: { $in: patientIds } });
    await ServiceItem.deleteMany({ code: new RegExp(SUFFIX, 'i') });
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
