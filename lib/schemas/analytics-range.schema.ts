import { z } from 'zod';

import { CALENDAR_DATE_PATTERN } from '@/constants/schedule.const';

/*
  The analytics window as URL state. Both ends are `YYYY-MM-DD` day-strings; a missing or malformed
  one falls back to empty, which the service reads as "use the default window" rather than erroring —
  a hand-edited `?from=yesterday` should quietly land on the default, not break the page. The service
  is where an empty or reversed range becomes the last thirty days.
*/
export const AnalyticsRangeSchema = z.object({
  from: z.string().trim().regex(CALENDAR_DATE_PATTERN).catch('').default(''),
  to: z.string().trim().regex(CALENDAR_DATE_PATTERN).catch('').default(''),
});

export type AnalyticsRangeInput = z.input<typeof AnalyticsRangeSchema>;
export type AnalyticsRangeOutput = z.output<typeof AnalyticsRangeSchema>;
