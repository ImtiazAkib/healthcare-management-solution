import { Skeleton } from '@/components/ui';

/*
  Prescription-shaped: the back-link, the patient header, the prescriber/issued pair, then the drugs
  table — so the wait resolves into roughly the screen's layout rather than a jump.
*/
export default function DoctorPrescriptionLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-4 w-32" />

      <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
