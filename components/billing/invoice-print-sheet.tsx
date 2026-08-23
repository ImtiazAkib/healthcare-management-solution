'use client';

import Link from 'next/link';

import { ArrowLeft, Printer } from 'lucide-react';

import { APP_DATA, INVOICE_STATUS_LABELS, INVOICE_STATUSES } from '@/constants';
import { InvoiceDto } from '@/types';

import { formatMoney, formatShortDateTime } from '@/lib/utils';

import { Button } from '@/components/ui';

type InvoicePrintSheetProps = {
  invoice: InvoiceDto;
};

/** The currency symbol prefixes every amount; formatting is the same helper everywhere. */
function money(minorUnits: number): string {
  return `${APP_DATA.CURRENCY.SYMBOL}${formatMoney(minorUnits)}`;
}

/*
  The printable invoice — a single sheet, its own action bar, and nothing of the dashboard chrome.
  Mirrors the prescription print sheet exactly: the page sits under the dashboard layout, so the print
  stylesheet hides everything except this sheet (visibility on `body`, restored on the sheet root) so
  only the bill reaches paper. The bar (print and back) is `print:hidden`, there on screen and gone on
  paper. A voided bill carries a stamp, so a printed copy can never be mistaken for one still owed.
*/
const PRINT_STYLES = `
  @media print {
    @page { size: A4; margin: 16mm; }
    body { background: #fff; }
    body * { visibility: hidden; }
    #invoice-print-root, #invoice-print-root * { visibility: visible; }
    /* Pin the top-left only, never the height — a long invoice must flow onto a second page, not clip. */
    #invoice-print-root { position: absolute; top: 0; left: 0; width: 100%; }
  }
`;

export function InvoicePrintSheet({ invoice }: InvoicePrintSheetProps) {
  const isVoid = invoice.status === INVOICE_STATUSES.VOID;

  const handlePrintClick = (): void => {
    window.print();
  };

  return (
    <div id="invoice-print-root" className="text-foreground print:text-black">
      <style>{PRINT_STYLES}</style>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 print:max-w-none print:p-0">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/admin/invoices/${invoice.invoiceId}`} />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <Button variant="default" size="sm" onClick={handlePrintClick}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>

        <div className="border-border relative flex flex-col gap-6 rounded-lg border p-6 print:rounded-none print:border-0 print:p-0">
          {isVoid && (
            <span className="border-border text-muted-foreground absolute top-4 right-4 rounded-md border px-2 py-1 text-xs font-semibold tracking-wide uppercase print:text-black">
              {INVOICE_STATUS_LABELS.void}
            </span>
          )}

          <header className="border-border flex flex-col gap-1 border-b pb-4">
            <p className="text-2xl font-bold">{APP_DATA.NAME}</p>
            <p className="text-muted-foreground text-sm print:text-black">{APP_DATA.TAGLINE}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold">{invoice.patientName ?? 'Unknown patient'}</p>
              {invoice.medicalRecordNo && <p className="text-muted-foreground text-xs print:text-black">MRN: {invoice.medicalRecordNo}</p>}
            </div>

            <div className="flex flex-col gap-0.5 sm:text-right">
              <p className="text-muted-foreground text-xs print:text-black">Invoice</p>
              <p className="text-sm font-semibold">{invoice.invoiceId}</p>
              <p className="text-muted-foreground text-xs print:text-black">{formatShortDateTime(invoice.issuedAt)}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 text-right font-medium">Unit price</th>
                <th className="py-2 pr-3 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={`${index}-${line.serviceCode}`} className="border-border border-b align-top">
                  <td className="py-2 pr-3">
                    <span className="block font-medium">{line.description}</span>
                    <span className="text-muted-foreground text-xs print:text-black">{line.serviceCode}</span>
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{money(line.unitPriceMinorUnits)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{line.quantity}</td>
                  <td className="py-2 text-right whitespace-nowrap tabular-nums">{money(line.lineTotalMinorUnits)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col gap-1.5 sm:ml-auto sm:w-64">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground print:text-black">Subtotal</span>
              <span className="tabular-nums">{money(invoice.subtotalMinorUnits)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground print:text-black">Discount</span>
              <span className="tabular-nums">− {money(invoice.discountMinorUnits)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground print:text-black">Tax</span>
              <span className="tabular-nums">+ {money(invoice.taxMinorUnits)}</span>
            </div>
            <div className="border-border flex items-center justify-between border-t pt-1.5 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{money(invoice.totalMinorUnits)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground print:text-black">Paid</span>
              <span className="tabular-nums">{money(invoice.paidMinorUnits)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Balance due</span>
              <span className="tabular-nums">{money(invoice.balanceMinorUnits)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
