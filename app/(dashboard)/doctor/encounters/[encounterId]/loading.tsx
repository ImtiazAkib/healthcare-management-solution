import { Skeleton } from '@/components/ui';

/*
  Encounter-shaped: the patient header, the vitals grid, then the consultation card — so the wait
  resolves into roughly the screen's layout rather than a jump.
*/
export default function DoctorEncounterLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
