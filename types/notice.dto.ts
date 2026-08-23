import { toId } from '@/lib/utils';

import { NoticeAudience } from './notice-audience';
import { NoticeCategory } from './notice-category';

import type { NoticeEntity } from '@/models/notice.model';

/**
 * A notice as every dashboard and API response sees one.
 *
 * The image is described, never handed over: `hasImage` and its type are enough to render an
 * `<img>` pointing at the guarded route, while the `storageKey` — the only thing that could fetch
 * the bytes directly — stays on the server, absent from the mapper by being written out by hand.
 * The department is carried as both id and resolved name so a card can read "Cardiology" without a
 * second lookup.
 */
export type NoticeDto = {
  noticeId: string;
  title: string;
  body: string | null;
  hasImage: boolean;
  imageMimeType: string | null;
  audience: NoticeAudience;
  category: NoticeCategory;
  departmentId: string | null;
  departmentName: string | null;
  publishedById: string;
  /** ISO date, deliberately separate from `createdAt` so a notice can be dated on purpose. */
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Map a stored notice to its DTO.
 *
 * The department name is resolved by the caller and passed in, because a notice references a
 * department by id and only the service holds the lookup; a notice with no department, or one whose
 * department could not be resolved, carries a null name.
 *
 * @param entity - Stored notice.
 * @param departmentName - The resolved department name, or null.
 *
 * @returns Instance of NoticeDto.
 */
export function noticeFromEntity(entity: NoticeEntity, departmentName: string | null = null): NoticeDto {
  return {
    noticeId: toId(entity._id),
    title: entity.title,
    body: entity.body ?? null,
    hasImage: Boolean(entity.image),
    imageMimeType: entity.image?.mimeType ?? null,
    audience: entity.audience,
    category: entity.category,
    departmentId: entity.department ? toId(entity.department) : null,
    departmentName,
    publishedById: toId(entity.publishedBy),
    publishedAt: entity.publishedAt.toISOString(),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
