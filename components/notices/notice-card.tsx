import { formatShortDateTime } from '@/lib/utils';

import { NoticeAudienceLabel, NoticeCategoryBadge } from './notice-badge';
import { NoticeDeleteButton } from './notice-delete-button';
import { NoticeEditButton } from './notice-edit-button';

import type { NoticeCardProps } from './notices.types';

/*
  One notice as a card. Emergency is the only category that changes the frame — a destructive border
  and tint — so it reads as an emergency before a word is parsed; the category chip carries the same
  color, and the two reinforce rather than repeat.

  The image is a banner served from the guarded route, addressed by id and rendered only when the
  notice actually carries one. It is a plain `<img>` on purpose: the bytes come from an authenticated
  streaming route with its own `nosniff`/`sandbox` policy, not a static asset `next/image` could size.
*/
export function NoticeCard({ notice, admin = false, departments = [] }: NoticeCardProps) {
  const isEmergency = notice.category === 'emergency';

  return (
    <article
      className={
        isEmergency
          ? 'border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-lg border p-4'
          : 'border-border flex flex-col gap-3 rounded-lg border p-4'
      }>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <NoticeCategoryBadge category={notice.category} />
            <NoticeAudienceLabel audience={notice.audience} departmentName={notice.departmentName} />
          </div>
          <h3 className="text-card-title wrap-break-word">{notice.title}</h3>
        </div>

        {admin && (
          <div className="flex shrink-0 items-center gap-1.5">
            <NoticeEditButton notice={notice} departments={departments} />
            <NoticeDeleteButton noticeId={notice.noticeId} title={notice.title} />
          </div>
        )}
      </div>

      {notice.body && <p className="text-sm wrap-break-word whitespace-pre-line">{notice.body}</p>}

      {notice.hasImage && (
        // eslint-disable-next-line @next/next/no-img-element -- a guarded streaming route, not a sizable static asset
        <img src={`/api/notices/${notice.noticeId}/image`} alt="" className="border-border max-h-80 w-full rounded-md border object-contain" />
      )}

      <p className="text-muted-foreground text-xs">{formatShortDateTime(notice.publishedAt)}</p>
    </article>
  );
}
