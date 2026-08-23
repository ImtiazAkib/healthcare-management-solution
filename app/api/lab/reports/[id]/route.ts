import type { NextRequest } from 'next/server';

import { isSameOriginRequest, withNotFound, withOk, withUnauthorized } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { isSuccess } from '@/lib/result';
import { LabService } from '@/lib/services';

const labService = new LabService();

/*
  A report's metadata — the DTO, which carries no storage key. The same caller matrix as the file
  routes decides who may read it, and a wrong caller gets the same 404 a missing report would, so the
  endpoint discloses nothing about which reports exist.
*/
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isSameOriginRequest(request)) {
    return withNotFound();
  }

  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return withUnauthorized();
  }

  const result = await labService.getReport(id, sessionUser);

  if (!isSuccess(result) || !result.result) {
    return withNotFound();
  }

  return withOk(result.result);
}
