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

/*
  Publishing a notice. A route handler rather than a Server Action because a notice may carry an
  image and `FormData` streams where an action would serialize. The gates run in order so an
  unwanted or oversized request is turned away early: authenticated, same-origin, an administrator,
  and under the coarse size ceiling — all before the body is read — and only then is the form parsed
  and handed to the service, which re-checks any image by its bytes and stores it. A text-only notice
  passes the same path carrying no image.
*/
export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return withUnauthorized();
  }

  if (!isSameOriginRequest(request)) {
    return withForbidden();
  }

  // The hospital publishes notices; administration owns that. Nobody else.
  if (sessionUser.role !== USER_ROLES.ADMIN && sessionUser.role !== USER_ROLES.SUPER_ADMIN) {
    return withForbidden();
  }

  // The same per-account upload budget the lab reports use — a notice may carry an image too.
  if (!(await consumeRateLimit('upload', sessionUser.userId, RATE_LIMIT.UPLOAD))) {
    return withTooManyRequests();
  }

  // Refuse an obviously-too-large body from its declared length, before a byte is buffered.
  if (contentLengthExceeds(request, NOTICE_IMAGE.MAX_SIZE_BYTES)) {
    return withPayloadTooLarge(IMAGE_TOO_LARGE.CODE, IMAGE_TOO_LARGE.MESSAGE);
  }

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

  const result = await noticeService.create(validation.data, image, sessionUser);

  if (!isSuccess(result)) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  return withOk(result.result);
}
