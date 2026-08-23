import { Download, ExternalLink, FlaskConical } from 'lucide-react';

import { formatShortDate } from '@/lib/utils';

import { PatientPortalEmpty } from './patient-portal-empty';

import type { PatientReportsProps } from './patient.types';

/*
  The patient's released test results, newest first — read-only. A result the lab has not yet
  released is a check still in progress and never appears here; once released, the report carries
  the tests it covers, an optional summary, and the file to open inline or download. Those two links
  point at `/api` routes, so they are plain anchors — a `next/link` would try to client-navigate to
  a file and fail.
*/
export function PatientReports({ reports }: PatientReportsProps) {
  if (reports.length === 0) {
    return (
      <PatientPortalEmpty
        icon={FlaskConical}
        title="No results released yet"
        description="When the lab releases a result for you, the report appears here to read or download."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map(report => (
        <li key={report.labReportId} className="border-border flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <p className="text-sm font-medium wrap-break-word">{report.tests.map(test => test.name).join(', ') || 'Test result'}</p>
            <span className="text-muted-foreground text-sm whitespace-nowrap">{report.releasedAt ? formatShortDate(report.releasedAt) : '—'}</span>
          </div>

          {report.summary && <p className="text-muted-foreground text-sm wrap-break-word">{report.summary}</p>}

          {report.file ? (
            <div className="flex flex-wrap gap-4 pt-1">
              <a
                href={`/api/lab/reports/${report.labReportId}/view`}
                target="_blank"
                rel="noopener"
                className="text-foreground inline-flex items-center gap-1 text-sm font-medium hover:underline">
                <ExternalLink className="size-3.5" />
                View report
              </a>
              <a
                href={`/api/lab/reports/${report.labReportId}/download`}
                target="_blank"
                rel="noopener"
                className="text-foreground inline-flex items-center gap-1 text-sm font-medium hover:underline">
                <Download className="size-3.5" />
                Download
              </a>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No file attached to this result.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
