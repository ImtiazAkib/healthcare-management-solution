import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isSameOriginRequest, withNotFound, withReportFile } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { isSuccess } from '@/lib/result';
import { LabService } from '@/lib/services';

const labService = new LabService();

/*
  Preview a report file inline — the same access check and the same not-found-for-everything-wrong
  behavior as the download route, differing only in the disposition: `inline` renders it in the
  sandbox rather than downloading it. The sandbox and `nosniff` headers are what make previewing an
  uploaded file in the browser safe.
*/
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!isSameOriginRequest(request)) {
    return withNotFound();
  }

  const result = await labService.openReportForDownload(id, sessionUser);

  if (!isSuccess(result) || !result.result) {
    return NextResponse.json({ errors: result.errors }, { status: sessionUser ? 404 : 401 });
  }

  return withReportFile(result.result, 'inline');
}
