import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, then a stack of card-like rows — so the wait resolves into roughly what
  it stood in for rather than a jump.
*/
export default function NoticesLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
