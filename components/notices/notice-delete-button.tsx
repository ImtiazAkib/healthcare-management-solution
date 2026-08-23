'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';

type NoticeDeleteButtonProps = {
  noticeId: string;
  /** Named in the confirm copy so an administrator sees which notice they are about to remove. */
  title: string;
};

/*
  Removing a notice for good. It confirms first — a delete is not a status change here, the row and
  its image go — then DELETEs by id and refreshes so the card leaves the list. The failure stays in
  the dialog so the administrator can read it and retry rather than lose the attempt.
*/
export function NoticeDeleteButton({ noticeId, title }: NoticeDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenClick = (): void => {
    setError(null);
    setOpen(true);
  };

  const handleCancelClick = (): void => {
    setOpen(false);
  };

  const handleConfirmClick = async (): Promise<void> => {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/notices/${noticeId}`, { method: 'DELETE', credentials: 'same-origin' });

      if (response.ok) {
        toast.success('Notice deleted.');
        setOpen(false);
        router.refresh();

        return;
      }

      const json: unknown = await response.json().catch(() => null);
      setError(readFirstError(json) ?? 'Could not delete the notice. Try again.');
    } catch {
      // A rejected fetch — the connection dropped. Keep the dialog open for a retry.
      setError('Could not delete the notice — check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" aria-label={`Delete "${title}"`} onClick={handleOpenClick}>
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this notice</DialogTitle>
            <DialogDescription>
              &ldquo;{title}&rdquo; is removed for everyone it was published to, along with its image. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isDeleting} onClick={handleCancelClick}>
              Keep notice
            </Button>

            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleConfirmClick}>
              {isDeleting ? 'Deleting…' : 'Delete notice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The first human-readable error out of a route handler's failure body, if it carries one. */
function readFirstError(json: unknown): string | null {
  if (json && typeof json === 'object' && 'errors' in json && Array.isArray(json.errors)) {
    const first: unknown = json.errors[0];
    if (first && typeof first === 'object' && 'error' in first && typeof first.error === 'string') {
      return first.error;
    }
  }

  return null;
}
