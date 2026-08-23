'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { LAB_REPORT_MIME_TYPES } from '@/constants';

import { STORAGE } from '@/constants/storage.const';

import { Button, Input, Label, Textarea } from '@/components/ui';

type ReportUploadFormProps = {
  labOrderId: string;
  /** Called after a successful upload — the caller uses it to close the hosting dialog. */
  onDone?: () => void;
};

/** The mime types the form accepts, as a plain string list the check can read without a cast. */
const ALLOWED_MIME_TYPES: readonly string[] = LAB_REPORT_MIME_TYPES;

/*
  Filing a report against an order. The written half — a summary and findings — rides alongside the
  file, and the bytes go through a route handler, never a Server Action: a Server Action cannot carry
  a file, and the route has its own magic-number check the client cannot stand in for.

  The guards here are courtesy, not security: a missing, wrong-typed, or oversized file is caught
  before a byte is sent so the person is told at once, but the route re-checks everything against the
  file's real content, which is the check that counts.
*/
export function ReportUploadForm({ labOrderId, onDone }: ReportUploadFormProps) {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [findings, setFindings] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSummaryChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSummary(event.target.value);
  };

  const handleFindingsChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setFindings(event.target.value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setFile(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    if (!file) {
      setFormError('Attach the report file.');

      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFormError('That file type is not allowed.');

      return;
    }

    if (file.size > STORAGE.MAX_FILE_SIZE_BYTES) {
      setFormError('That file is too large.');

      return;
    }

    setIsSubmitting(true);

    const body = new FormData();
    body.append('labOrderId', labOrderId);
    body.append('summary', summary);
    body.append('findings', findings);
    body.append('file', file);

    try {
      const res = await fetch('/api/lab/reports/upload', { method: 'POST', body });
      const json = await res.json().catch(() => null);

      if (res.ok) {
        toast.success('Report uploaded.');
        router.refresh();
        onDone?.();

        return;
      }

      setFormError(json?.errors?.[0]?.error ?? 'Upload failed. Try again.');
    } catch {
      // A rejected fetch — the connection dropped mid-upload. Surface a retry rather than a frozen form.
      setFormError('Upload failed — check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="report-summary">
          Summary <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id="report-summary" value={summary} placeholder="A one-line summary of the result" onChange={handleSummaryChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="report-findings">
          Findings <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id="report-findings" rows={4} placeholder="The detailed findings" value={findings} onChange={handleFindingsChange} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="report-file">Report file</Label>
        <Input id="report-file" type="file" accept={ALLOWED_MIME_TYPES.join(',')} className="cursor-pointer" onChange={handleFileChange} />
        <p className="text-muted-foreground text-xs">PDF, JPEG, PNG or WebP.</p>
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? 'Uploading…' : 'Upload report'}
        </Button>
      </div>
    </form>
  );
}
