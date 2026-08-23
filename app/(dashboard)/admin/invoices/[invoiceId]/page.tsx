import type { Metadata } from 'next';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants';

import { requireAdminArea } from '@/lib/auth';
import { InvoiceService, PaymentService } from '@/lib/services';

import { InvoiceDetail } from '@/components/billing';

const invoiceService = new InvoiceService();
const paymentService = new PaymentService();

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

type AdminInvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function AdminInvoiceDetailPage({ params }: AdminInvoiceDetailPageProps) {
  await requireAdminArea();

  const { invoiceId } = await params;

  const invoice = await invoiceService.getById(invoiceId);

  // A missing invoice is a 404 rather than an empty page.
  if (!invoice.result) {
    notFound();
  }

  // The payment history is a separate read; a failure there is empty, not a 404 — the bill still shows.
  const payments = await paymentService.listForInvoice(invoiceId);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_INVOICES.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to invoices
      </Link>

      <InvoiceDetail invoice={invoice.result} payments={payments.result} />
    </div>
  );
}
