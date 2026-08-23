import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isSameOriginRequest, withNotFound, withReportFile } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { isSuccess } from '@/lib/result';
import { LabService } from '@/lib/services';

const labService = new LabService();

/*
  Download a report file as an attachment.

  The storage key stays on the server: the service resolves it to a stream only after checking who is
  asking, so this route never handles it. A caller who may not read the report, a report with no
  file, and a row that has outlived its bytes all come back the same way — a 404 — so an id-guesser
  learns nothing about which reports exist. A request that did not come from the app's own screens
  (a pasted URL, a cross-site fetch) is refused the same way, since it has skipped every page that
  decides who may see the file.
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

  return withReportFile(result.result, 'attachment');
}
