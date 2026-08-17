import { Skeleton } from '@/components/ui';

/*
  The fallback while a dashboard page's server work is in flight. Content-shaped rather than a
  single grey block — a header line and a card — so the wait resolves into roughly what it was
  standing in for instead of a layout shift.
*/
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="surface-card flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-40" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
