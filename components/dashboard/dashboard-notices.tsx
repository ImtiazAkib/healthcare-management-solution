import type { ListResult } from '@/lib/result';

import { NoticeList } from '@/components/notices';

import type { NoticeDto } from '@/types';

type DashboardNoticesProps = {
  result: ListResult<NoticeDto>;
  /** Overrides the default heading — a role dashboard can title it "Announcements", say. */
  title?: string;
};

/*
  A notices block for a role dashboard, dropped in with a feed the page has already fetched. Three
  outcomes, kept distinct: a failed read is a `role="alert"` banner, never an empty state — an
  unreachable feed must not read as "nothing to announce" — an empty feed is the calm empty inside
  `NoticeList`, and a populated feed is the list itself.
*/
export function DashboardNotices({ result, title = 'Notices' }: DashboardNoticesProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-card-title">{title}</h2>

      {result.success ? (
        <NoticeList notices={result.result} />
      ) : (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          Notices could not be loaded. Refresh to try again.
        </p>
      )}
    </section>
  );
}
