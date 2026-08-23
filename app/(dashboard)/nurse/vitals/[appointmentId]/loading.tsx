import { Skeleton } from '@/components/ui';

/*
  Screen-shaped: the back-link, the patient header, then the triage and vitals sections — the vitals
  as an eight-box grid — so the wait resolves into roughly the layout rather than a jump.
*/
export default function NurseVitalsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-5 w-32" />

      <div className="border-border flex flex-col gap-3 rounded-lg border p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <Skeleton className="h-4 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-24" />
          ))}
        </div>
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
        <Skeleton className="h-4 w-16" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
