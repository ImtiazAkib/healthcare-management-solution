import { NoticeCard } from './notice-card';
import { NoticesEmpty } from './notices-empty';

import type { NoticeListProps } from './notices.types';

/*
  A feed of notices, newest — or, for a role feed, emergency-pinned — first: the service decides the
  order, this only lays them out. The admin flag flows to each card, which is where the edit and
  delete controls live.
*/
export function NoticeList({ notices, admin = false, departments = [] }: NoticeListProps) {
  if (notices.length === 0) {
    return <NoticesEmpty />;
  }

  return (
    <div className="flex flex-col gap-3">
      {notices.map(notice => (
        <NoticeCard key={notice.noticeId} notice={notice} admin={admin} departments={departments} />
      ))}
    </div>
  );
}
