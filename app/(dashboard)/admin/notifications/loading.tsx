import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, then a stack of notification-sized rows — so the wait resolves into roughly
  what it stood in for rather than a jump.
*/
export default function AdminNotificationsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
