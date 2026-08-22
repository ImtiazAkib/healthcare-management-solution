import { Skeleton } from '@/components/ui';

/*
  Content-shaped for the record page: a back link, a header block, then the demographic and
  clinical cards.
*/
export default function AdminPatientDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-4 w-32" />

      <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
