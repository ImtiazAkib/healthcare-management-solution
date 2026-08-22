import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, then a short stack of queue rows — each a token box beside a name and
  its action — so the wait resolves into roughly what it stood in for rather than a jump.
*/
export default function DoctorQueueLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
