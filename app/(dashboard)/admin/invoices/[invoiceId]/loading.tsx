import { Skeleton } from '@/components/ui';

/*
  Content-shaped: the back link, a header with a status chip, the lines table and a totals block — so
  the wait resolves into roughly what it stood in for rather than a jump.
*/
export default function AdminInvoiceDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-4 w-32" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>

      <Skeleton className="h-40 w-full sm:ml-auto sm:w-72" />

      <span className="sr-only">Loading…</span>
    </div>
  );
}
