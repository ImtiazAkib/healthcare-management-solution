import { Skeleton } from '@/components/ui';

/*
  Content-shaped: a header, then a stack of bordered panels standing in for the summary, identity and
  edit sections — so the wait resolves into roughly the page it held rather than a jump.
*/
export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />

      <span className="sr-only">Loading…</span>
    </div>
  );
}
