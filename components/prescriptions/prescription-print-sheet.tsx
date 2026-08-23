'use client';

import Link from 'next/link';

import { ArrowLeft, Printer } from 'lucide-react';

import { APP_DATA, PRESCRIPTION_FREQUENCY_LABELS, ROUTES } from '@/constants';

import { GENDER_LABELS } from '@/constants/users.const';

import { calculateAge, formatLongDate, isPrescriptionSuperseded } from '@/lib/utils';

import { Button } from '@/components/ui';

import type { PrescriptionDetail } from './prescriptions.types';

type PrescriptionPrintSheetProps = {
  prescription: PrescriptionDetail;
};

/** A blank cell reads better as a dash than as nothing — used for every optional item field. */
function orDash(value: string | null | undefined): string {
  return value ? value : '—';
}

/*
  The printable prescription — a single A4 sheet, its own action bar, and nothing of the dashboard
  chrome. The page sits under the dashboard layout, so the sidebar and topbar are still on the page;
  the print stylesheet hides everything except this sheet (visibility on `body`, restored on the
  sheet root) so only the script reaches paper. The bar (print and back) is `print:hidden`, so it is
  there on screen and gone on paper. Everything else is tuned to print black on white and fit one
  page: the clinic header, the patient and prescriber identities side by side, the drugs in a table,
  the advice, and — when the script has been replaced — a stamp that says so, so a printed copy of a
  superseded prescription cannot be mistaken for the current one.
*/
const PRINT_STYLES = `
  @media print {
    @page { size: A4; margin: 16mm; }
    body { background: #fff; }
    body * { visibility: hidden; }
    #prescription-print-root, #prescription-print-root * { visibility: visible; }
    /* Pin the top-left only, never the height — a long script must flow onto a second page, not clip. */
    #prescription-print-root { position: absolute; top: 0; left: 0; width: 100%; }
  }
`;

export function PrescriptionPrintSheet({ prescription }: PrescriptionPrintSheetProps) {
  const superseded = isPrescriptionSuperseded(prescription);

  const age = prescription.patientDateOfBirth ? calculateAge(prescription.patientDateOfBirth) : null;
  const gender = prescription.patientGender ? GENDER_LABELS[prescription.patientGender] : null;
  const patientMeta = [age !== null ? `${age} years` : null, gender].filter(Boolean).join(' · ');

  const prescriberMeta = [prescription.doctorDesignation, prescription.doctorSpecialization].filter(Boolean).join(' · ');

  const handlePrintClick = (): void => {
    window.print();
  };

  return (
    <div id="prescription-print-root" className="text-foreground print:text-black">
      <style>{PRINT_STYLES}</style>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 print:max-w-none print:p-0">
        <div className="flex items-center justify-between gap-2 print:hidden">
          <Button variant="ghost" size="sm" render={<Link href={ROUTES.DOCTOR_PRESCRIPTIONS.HREF} />}>
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <Button variant="default" size="sm" onClick={handlePrintClick}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>

        <div className="border-border relative flex flex-col gap-6 rounded-lg border p-6 print:rounded-none print:border-0 print:p-0">
          {superseded && (
            <span className="border-border text-muted-foreground absolute top-4 right-4 rounded-md border px-2 py-1 text-xs font-semibold tracking-wide uppercase print:text-black">
              Replaced
            </span>
          )}

          <header className="border-border flex flex-col gap-1 border-b pb-4">
            <p className="text-2xl font-bold">{APP_DATA.NAME}</p>
            <p className="text-muted-foreground text-sm print:text-black">{APP_DATA.TAGLINE}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold">{prescription.patientName}</p>
              <p className="text-muted-foreground text-xs print:text-black">MRN: {prescription.medicalRecordNo}</p>
              {patientMeta && <p className="text-muted-foreground text-xs print:text-black">{patientMeta}</p>}
            </div>

            <div className="flex flex-col gap-0.5 sm:text-right">
              <p className="text-sm font-semibold">{prescription.doctorName}</p>
              {prescriberMeta && <p className="text-muted-foreground text-xs print:text-black">{prescriberMeta}</p>}
              <p className="text-muted-foreground text-xs print:text-black">Reg. No: {prescription.doctorRegistrationNo}</p>
            </div>
          </div>

          <p className="text-muted-foreground text-xs print:text-black">{formatLongDate(prescription.issuedAt)}</p>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="py-2 pr-3 font-medium">Drug</th>
                <th className="py-2 pr-3 font-medium">Strength</th>
                <th className="py-2 pr-3 font-medium">Dose</th>
                <th className="py-2 pr-3 font-medium">Frequency</th>
                <th className="py-2 pr-3 font-medium">Duration</th>
                <th className="py-2 font-medium">Instructions</th>
              </tr>
            </thead>
            <tbody>
              {prescription.items.map((item, index) => (
                <tr key={`${index}-${item.drug}`} className="border-border border-b align-top">
                  <td className="py-2 pr-3 font-medium">{item.drug}</td>
                  <td className="py-2 pr-3">{orDash(item.strength)}</td>
                  <td className="py-2 pr-3">{orDash(item.dose)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{PRESCRIPTION_FREQUENCY_LABELS[item.frequency]}</td>
                  <td className="py-2 pr-3">{orDash(item.duration)}</td>
                  <td className="py-2">{orDash(item.instructions)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {prescription.advice && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold">Advice</p>
              <p className="text-sm whitespace-pre-line">{prescription.advice}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
