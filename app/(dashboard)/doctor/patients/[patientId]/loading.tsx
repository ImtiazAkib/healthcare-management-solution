import { Skeleton } from '@/components/ui';

/*
  Detail-shaped: a back link, the patient header, the record cards, then timeline rows — so the
  wait resolves into roughly the record's layout rather than a jump.
*/
export default function DoctorPatientDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-5 w-32" />

      <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border-border flex flex-col gap-4 rounded-lg border p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
