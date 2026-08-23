'use client';

import { useState } from 'react';

import { Pencil } from 'lucide-react';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui';

import { NoticeCreateForm } from './notice-create.form';

import type { NoticeDepartmentOption } from './notices.types';
import type { NoticeDto } from '@/types';

type NoticeEditButtonProps = {
  notice: NoticeDto;
  departments: NoticeDepartmentOption[];
};

/*
  The per-card edit control: a quiet icon button that opens the create form in edit mode. Closing on
  a successful save is the form's job — it calls `onDone`, which pulls the dialog shut once the
  PATCH lands and the router has refreshed.
*/
export function NoticeEditButton({ notice, departments }: NoticeEditButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpenClick = (): void => {
    setOpen(true);
  };

  const handleDone = (): void => {
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" aria-label={`Edit "${notice.title}"`} onClick={handleOpenClick}>
        <Pencil className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit notice</DialogTitle>
            <DialogDescription>Amend the announcement. Your changes are visible to its audience as soon as you save.</DialogDescription>
          </DialogHeader>

          <NoticeCreateForm departments={departments} notice={notice} onDone={handleDone} />
        </DialogContent>
      </Dialog>
    </>
  );
}
