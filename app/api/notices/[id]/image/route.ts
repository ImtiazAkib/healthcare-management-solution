import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isSameOriginRequest, withNotFound, withReportFile } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { isSuccess } from '@/lib/result';
import { NoticeService } from '@/lib/services';

const noticeService = new NoticeService();

/*
  Serve a notice's image inline. The service makes the audience check — a viewer outside the notice's
  audience gets the same not-found a missing notice gives, so a guessed id reveals nothing — and the
  file is streamed with `nosniff` and a `sandbox` policy, because an uploaded image is bytes a
  stranger supplied. Signed in but wrong-audience answers 404; not signed in answers 401.
*/
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  if (!isSameOriginRequest(request)) {
    return withNotFound();
  }

  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const result = await noticeService.openImage(id, sessionUser);

  if (!isSuccess(result) || !result.result) {
    return NextResponse.json({ errors: result.errors }, { status: 404 });
  }

  return withReportFile(result.result, 'inline');
}
