import { NOTICE_AUDIENCE_LABELS, NOTICE_CATEGORY_LABELS, NOTICE_CATEGORY_VARIANTS } from '@/constants';

import { Badge } from '@/components/ui';

import type { NoticeAudience, NoticeCategory } from '@/types';

type NoticeCategoryBadgeProps = {
  category: NoticeCategory;
};

type NoticeAudienceLabelProps = {
  audience: NoticeAudience;
  /** For a department notice, the resolved department name, so the label reads "Cardiology" not "A department". */
  departmentName?: string | null;
};

/*
  The category chip: its color is the whole point — an emergency reads destructive-red, a service
  amber, the ordinary announcement muted — so the variant is looked up rather than chosen per call.
*/
export function NoticeCategoryBadge({ category }: NoticeCategoryBadgeProps) {
  return <Badge variant={NOTICE_CATEGORY_VARIANTS[category]}>{NOTICE_CATEGORY_LABELS[category]}</Badge>;
}

/*
  A quiet line naming who the notice is aimed at. A department notice names its department when the
  name resolved; otherwise it falls back to the generic audience label.
*/
export function NoticeAudienceLabel({ audience, departmentName }: NoticeAudienceLabelProps) {
  const label = audience === 'department' && departmentName ? departmentName : NOTICE_AUDIENCE_LABELS[audience];

  return <span className="text-muted-foreground text-xs">{label}</span>;
}
