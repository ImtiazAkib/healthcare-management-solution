import type { NoticeDto } from '@/types';

/** A department as the create form's department Select needs it — id to submit, name to show. */
export type NoticeDepartmentOption = {
  id: string;
  name: string;
};

export type NoticeCardProps = {
  notice: NoticeDto;
  /** When true, the card carries the edit and delete controls; a role feed leaves them off. */
  admin?: boolean;
  /** The departments an edit dialog offers — only meaningful alongside `admin`. */
  departments?: NoticeDepartmentOption[];
};

export type NoticeListProps = {
  notices: NoticeDto[];
  admin?: boolean;
  departments?: NoticeDepartmentOption[];
};

export type NoticeFormProps = {
  /** The departments the audience-is-a-department case offers. */
  departments: NoticeDepartmentOption[];
  /** Present in edit mode — the notice being amended, which flips the submit to a PATCH. */
  notice?: NoticeDto;
  /** Called after a successful save — a hosting dialog uses it to close. */
  onDone?: () => void;
};
