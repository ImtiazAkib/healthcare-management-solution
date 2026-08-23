import type { Metadata } from 'next';

import { requireAdminArea } from '@/lib/auth';
import { AnalyticsRangeSchema } from '@/lib/schemas';
import { AnalyticsService } from '@/lib/services';

import { AnalyticsScreen } from '@/components/analytics';

import { loadAnalyticsSearchParams } from './page-search-params';

import type { SearchParams } from 'nuqs/server';

const analyticsService = new AnalyticsService();

type AdminAnalyticsPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  /*
    The URL is parsed, then validated. `AnalyticsRangeSchema` catches rather than throws on each end, so
    a hand-edited query string degrades to the default window instead of an error page — and the service
    resolves an empty or reversed pair into the last thirty days.
  */
  const range = AnalyticsRangeSchema.parse(await loadAnalyticsSearchParams(searchParams));

  const result = await analyticsService.getOverview(range);

  // A failed overview carries a null result; both are checked so the screen only ever sees a computed
  // overview, never a half-failed one.
  if (!result.success || !result.result) {
    throw new Error('Could not load the analytics overview. Please try again.');
  }

  return <AnalyticsScreen overview={result.result} />;
}
