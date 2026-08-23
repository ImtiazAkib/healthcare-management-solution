import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, a hero panel, then a row of quick-link tiles — so the wait resolves into
  roughly what it stood in for rather than a jump.
*/
export default function PatientDashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <Skeleton className="h-40 w-full rounded-lg" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
