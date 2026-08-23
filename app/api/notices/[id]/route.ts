import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { CODES, USER_ROLES } from '@/constants';

import { NOTICE_IMAGE } from '@/constants/notice.const';
import { RATE_LIMIT } from '@/constants/rate-limit.const';

import {
  contentLengthExceeds,
  isSameOriginRequest,
  withForbidden,
  withOk,
  withPayloadTooLarge,
  withTooManyRequests,
  withUnauthorized,
} from '@/lib/api';
import { getSessionUser } from '@/lib/auth';
import { isSuccess } from '@/lib/result';
import { NoticeCreateSchema } from '@/lib/schemas';
import { NoticeService, consumeRateLimit } from '@/lib/services';
import { mapZodErrorsToErrorDto } from '@/lib/utils';

const noticeService = new NoticeService();

const IMAGE_TOO_LARGE = CODES.VALIDATION.NOTICES.IMAGE_TOO_LARGE;

/** Only an administrator edits or deletes a notice. Returns the session when allowed, or the refusal response. */
async function requirePublisher(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { ok: false as const, response: withUnauthorized() };
  }

  if (!isSameOriginRequest(request)) {
    return { ok: false as const, response: withForbidden() };
  }

  if (sessionUser.role !== USER_ROLES.ADMIN && sessionUser.role !== USER_ROLES.SUPER_ADMIN) {
    return { ok: false as const, response: withForbidden() };
  }

  return { ok: true as const, sessionUser };
}

/*
  Editing a notice — the same gates and the same streaming multipart form as publishing, keyed to the
  notice in the URL. A new image replaces the old one; sending none keeps the current image.
*/
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePublisher(request);

  if (!gate.ok) {
    return gate.response;
  }

  if (!(await consumeRateLimit('upload', gate.sessionUser.userId, RATE_LIMIT.UPLOAD))) {
    return withTooManyRequests();
  }

  if (contentLengthExceeds(request, NOTICE_IMAGE.MAX_SIZE_BYTES)) {
    return withPayloadTooLarge(IMAGE_TOO_LARGE.CODE, IMAGE_TOO_LARGE.MESSAGE);
  }

  const { id } = await params;
  const form = await request.formData();

  const validation = NoticeCreateSchema.safeParse({
    title: form.get('title'),
    body: form.get('body') ?? undefined,
    audience: form.get('audience'),
    category: form.get('category'),
    departmentId: form.get('departmentId') ?? undefined,
  });

  if (!validation.success) {
    return NextResponse.json({ errors: mapZodErrorsToErrorDto(validation.error) }, { status: 400 });
  }

  const attached = form.get('image');
  const image = attached instanceof File && attached.size > 0 ? attached : null;

  const result = await noticeService.update(id, validation.data, image);

  if (!isSuccess(result)) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  return withOk(result.result);
}

/*
  Deleting a notice. No body, so no multipart parse — just the gates, then the service, which removes
  the row and its image together.
*/
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePublisher(request);

  if (!gate.ok) {
    return gate.response;
  }

  const { id } = await params;
  const result = await noticeService.delete(id);

  if (!isSuccess(result)) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  return withOk({ success: true });
}
