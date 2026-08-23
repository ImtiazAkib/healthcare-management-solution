import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, then table-like rows — so the wait resolves into roughly what it stood
  in for rather than a jump.
*/
export default function DoctorLabOrdersLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
