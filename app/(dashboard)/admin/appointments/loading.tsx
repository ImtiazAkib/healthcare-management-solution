import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, the filter row, then a table of appointment rows — so the wait
  resolves into roughly what it stood in for rather than a jump.
*/
export default function AdminAppointmentsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Skeleton className="h-10 w-full sm:w-56" />
        <Skeleton className="h-10 w-full sm:w-44" />
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
