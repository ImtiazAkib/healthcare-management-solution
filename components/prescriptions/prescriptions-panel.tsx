'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Plus, RefreshCw } from 'lucide-react';

import { formatShortDate, isPrescriptionSuperseded, summarizePrescriptionItem } from '@/lib/utils';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';

import { PrescriptionForm } from './prescription-form';
import { PrescriptionStatusBadge } from './prescription-status.badge';

import type { PrescriptionDto } from './prescriptions.types';

type PrescriptionsPanelProps = {
  encounterId: string;
  prescriptions: PrescriptionDto[];
  /** True while the encounter is open — a completed encounter's scripts are read-only. */
  canIssue: boolean;
};

/** Which dialog, if any, is open: the issue form, or a replacement keyed to a prescription id. */
type OpenDialog = { kind: 'issue' } | { kind: 'replace'; prescription: PrescriptionDto } | null;

/*
  The prescriptions written in one encounter, shown on the encounter screen. Each is summarized to
  its first drug line — the full detail lives on its own page, linked from the row — with its issued
  date and whether it still stands.

  While the encounter is open the doctor can issue a new script, and replace any that still stands:
  a prescription is never edited in place, so "replace" opens a fresh form seeded from the original.
  Once the encounter is completed the panel is read-only — the service refuses a write against a
  closed encounter regardless, so the controls that could only produce a refusal are not rendered.
*/
export function PrescriptionsPanel({ encounterId, prescriptions, canIssue }: PrescriptionsPanelProps) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const handleClose = (): void => {
    setOpenDialog(null);
  };

  const handleDialogOpenChange = (open: boolean): void => {
    if (!open) {
      setOpenDialog(null);
    }
  };

  return (
    <section className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Prescriptions</h2>

        {canIssue && (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpenDialog({ kind: 'issue' })}>
            <Plus className="size-4" />
            Issue prescription
          </Button>
        )}
      </div>

      {prescriptions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No prescriptions written yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {prescriptions.map(prescription => {
            const superseded = isPrescriptionSuperseded(prescription);
            const [firstItem, ...restItems] = prescription.items;

            return (
              <li key={prescription.prescriptionId} className="border-border flex flex-col gap-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/doctor/prescriptions/${prescription.prescriptionId}`} className="text-sm font-medium hover:underline">
                    {firstItem ? summarizePrescriptionItem(firstItem) : 'Prescription'}
                  </Link>
                  <PrescriptionStatusBadge superseded={superseded} />
                </div>

                {restItems.length > 0 && <p className="text-muted-foreground text-xs">+{restItems.length} more</p>}

                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                  <span>Issued {formatShortDate(prescription.issuedAt)}</span>

                  {canIssue && !superseded && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOpenDialog({ kind: 'replace', prescription })}>
                      <RefreshCw className="size-3.5" />
                      Replace
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openDialog?.kind === 'issue' && (
        <Dialog open onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Issue a prescription</DialogTitle>
              <DialogDescription>Add the drugs and any advice. It is issued against this encounter.</DialogDescription>
            </DialogHeader>

            <PrescriptionForm mode="issue" encounterId={encounterId} onDone={handleClose} />
          </DialogContent>
        </Dialog>
      )}

      {openDialog?.kind === 'replace' && (
        <Dialog open onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Replace this prescription</DialogTitle>
              <DialogDescription>A new prescription is issued and the old one is kept, marked replaced.</DialogDescription>
            </DialogHeader>

            <PrescriptionForm
              mode="replace"
              encounterId={encounterId}
              prescriptionId={openDialog.prescription.prescriptionId}
              initialItems={openDialog.prescription.items}
              initialAdvice={openDialog.prescription.advice ?? ''}
              onDone={handleClose}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
