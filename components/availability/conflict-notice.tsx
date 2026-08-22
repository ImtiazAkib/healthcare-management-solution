import { AvailabilityDto } from '@/types';

import type { SingleResult } from '@/lib/result';

type ConflictNoticeProps = {
  result: SingleResult<AvailabilityDto>;
};

/*
  A publish or an edit can fail for two reasons at once — the doctor is already sitting *and* the
  room is already taken — because the service checks both and reports both. The form's single
  `formError` line would drop one of them, so a clash gets its own notice that lists every reason
  the result carries rather than only `errors[0]`.

  Renders nothing when the result is clean, so a caller can drop it in unconditionally.
*/
export function ConflictNotice({ result }: ConflictNoticeProps) {
  if (result.errors.length === 0) {
    return null;
  }

  return (
    <div role="alert" className="border-destructive/40 bg-destructive/10 text-destructive flex flex-col gap-1 rounded-md border px-3 py-2 text-sm">
      {result.errors.map((error, index) => (
        // Two clashes can share a code path but never a message, and the list is fixed once
        // rendered, so an index key is stable here.
        <p key={`${index}-${error.code}`}>{error.error}</p>
      ))}
    </div>
  );
}
