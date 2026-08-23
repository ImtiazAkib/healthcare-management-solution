import type { Metadata } from 'next';

import { USER_ROLES } from '@/constants';

import { requireRole } from '@/lib/auth';
import { InvoiceService } from '@/lib/services';

import { PatientInvoices } from '@/components/billing';
import { PageHeader } from '@/components/ui';

const invoiceService = new InvoiceService();

export const metadata: Metadata = {
  title: 'My invoices',
  robots: { index: false, follow: false },
};

export default async function PatientInvoicesPage() {
  // The patient is resolved from the session's user id, never from a URL — the service scopes the
  // list to their own bills, so one patient can never read another's.
  const sessionUser = await requireRole(USER_ROLES.PATIENT);

  const invoices = await invoiceService.listForPatient(sessionUser);

  if (!invoices.success) {
    throw new Error('Could not load your invoices. Please try again.');
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My invoices" description="Every bill raised for your care, newest first, with what is paid and what is left to settle." />

      <PatientInvoices invoices={invoices.result} />
    </div>
  );
}
