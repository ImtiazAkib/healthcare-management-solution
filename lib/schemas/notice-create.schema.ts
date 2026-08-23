import { z } from 'zod';

import { CODES } from '@/constants/codes.const';
import { NOTICE_AUDIENCES, NOTICE_CATEGORIES, NOTICE_FIELD_LIMITS } from '@/constants/notice.const';

import { encodeZodMessage } from '@/lib/utils';

import { objectIdField } from './object-id.schema';

const NOTICES = CODES.VALIDATION.NOTICES;

/*
  The text fields of a notice — the image is validated by its bytes in the service, not here, because
  a magic-number check is not something Zod does.

  This schema serves both publishing and editing: the two validate the same fields, and the id an
  edit needs comes from the route, not the body. A department notice must name its department; the
  `superRefine` makes that a field error on the department control rather than a surprise from the
  service. What is deliberately absent is `publishedBy` — the author is the session, never the
  payload.
*/
export const NoticeCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, encodeZodMessage(NOTICES.TITLE_REQUIRED.CODE, NOTICES.TITLE_REQUIRED.MESSAGE))
      .max(NOTICE_FIELD_LIMITS.TITLE, encodeZodMessage(NOTICES.TITLE_TOO_LONG.CODE, NOTICES.TITLE_TOO_LONG.MESSAGE)),
    body: z
      .string()
      .trim()
      .max(NOTICE_FIELD_LIMITS.BODY, encodeZodMessage(NOTICES.BODY_TOO_LONG.CODE, NOTICES.BODY_TOO_LONG.MESSAGE))
      .optional()
      .or(z.literal('')),
    audience: z.enum(Object.values(NOTICE_AUDIENCES), encodeZodMessage(NOTICES.AUDIENCE_INVALID.CODE, NOTICES.AUDIENCE_INVALID.MESSAGE)),
    category: z.enum(Object.values(NOTICE_CATEGORIES), encodeZodMessage(NOTICES.CATEGORY_INVALID.CODE, NOTICES.CATEGORY_INVALID.MESSAGE)),
    // A Select's "no department" option is an empty string; mapped to undefined so the optional id accepts it.
    departmentId: objectIdField
      .optional()
      .or(z.literal(''))
      .transform(value => (value ? value : undefined)),
  })
  .superRefine((values, ctx) => {
    if (values.audience === NOTICE_AUDIENCES.DEPARTMENT && !values.departmentId) {
      ctx.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: encodeZodMessage(NOTICES.DEPARTMENT_REQUIRED.CODE, NOTICES.DEPARTMENT_REQUIRED.MESSAGE),
      });
    }
  });

export type NoticeCreateInput = z.input<typeof NoticeCreateSchema>;
export type NoticeCreateOutput = z.output<typeof NoticeCreateSchema>;
