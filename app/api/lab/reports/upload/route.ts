import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { CODES, USER_ROLES } from '@/constants';

import { STORAGE } from '@/constants/storage.const';

import {
  contentLengthExceeds,
  isSameOriginRequest,
  withForbidden,
  withInsufficientStorage,
  withOk,
  withPayloadTooLarge,
  withUnauthorized,
} from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { createError, isSuccess } from '@/lib/result';
import { LabReportCreateSchema } from '@/lib/schemas';
import { LabService, getStorageStatus } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const labService = new LabService();

const FILE_TOO_LARGE = CODES.VALIDATION.DIAGNOSTICS.FILE_TOO_LARGE;
const FILE_REQUIRED = CODES.VALIDATION.DIAGNOSTICS.FILE_REQUIRED;

/*
  Filing a report's file. A route handler rather than a Server Action on purpose: an action
  serializes its arguments, and a report file has no business going through that — `FormData`
  streams. The gates run in order so an oversized or unwanted request is turned away as early as
  possible: authenticated, same-origin, the right role, under the coarse size ceiling and under the
  bucket cap — all before the body is read — and only then is the multipart form parsed and handed to
  the service, which re-checks the file by its bytes and stores it.
*/
export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return withUnauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return withForbidden();
  }

  // The lab files reports; administration may stand in. Nobody else.
  if (sessionUser.role !== USER_ROLES.LAB && sessionUser.role !== USER_ROLES.ADMIN && sessionUser.role !== USER_ROLES.SUPER_ADMIN) {
    return withForbidden();
  }

  // Refuse an obviously-too-large body from its declared length, before a byte is buffered.
  if (contentLengthExceeds(request, STORAGE.MAX_FILE_SIZE_BYTES)) {
    return withPayloadTooLarge(FILE_TOO_LARGE.CODE, FILE_TOO_LARGE.MESSAGE);
  }

  // Refuse before reading the body when the bucket is already full.
  if ((await getStorageStatus()).full) {
    return withInsufficientStorage();
  }

  const form = await request.formData();

  const validation = LabReportCreateSchema.safeParse({
    labOrderId: form.get('labOrderId'),
    summary: form.get('summary') ?? undefined,
    findings: form.get('findings') ?? undefined,
  });

  if (!validation.success) {
    return NextResponse.json({ errors: mapZodErrorsToErrorDto(validation.error) }, { status: 400 });
  }

  const file = form.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ errors: [createError(FILE_REQUIRED.CODE, FILE_REQUIRED.MESSAGE, 'file')] }, { status: 400 });
  }

  const result = await labService.uploadReport({ ...validation.data, file }, sessionUser);

  if (!isSuccess(result)) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  return withOk(result.result);
}
