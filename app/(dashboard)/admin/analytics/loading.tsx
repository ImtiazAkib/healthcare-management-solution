import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, the date filters, a tiles grid, then a chart-sized block — so the wait
  resolves into roughly what it stood in for rather than a jump.
*/
export default function AdminAnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[auto_auto_auto_1fr]">
        <Skeleton className="h-10 w-full sm:w-44" />
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>

      <Skeleton className="h-52 w-full" />

      <span className="sr-only">Loading…</span>
    </div>
  );
}
