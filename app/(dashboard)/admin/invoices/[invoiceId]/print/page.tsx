import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { requireAdminArea } from '@/lib/auth';
import { InvoiceService } from '@/lib/services';

import { InvoicePrintSheet } from '@/components/billing';

const invoiceService = new InvoiceService();

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

type AdminInvoicePrintPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function AdminInvoicePrintPage({ params }: AdminInvoicePrintPageProps) {
  // The same gate as the detail page: only the administration area may print a bill.
  await requireAdminArea();

  const { invoiceId } = await params;

  const invoice = await invoiceService.getById(invoiceId);

  if (!invoice.result) {
    notFound();
  }

  return <InvoicePrintSheet invoice={invoice.result} />;
}
