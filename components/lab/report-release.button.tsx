'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { isSuccess } from '@/lib/result';

import { Button } from '@/components/ui';

import { releaseLabReportAction } from './actions';

type ReportReleaseButtonProps = {
  labReportId: string;
};

/*
  Releasing a filed report to the ordering doctor and the patient — the one act the diagnostics
  module is careful about, so it asks first. Until it is released the report exists but is the lab's
  alone; releasing is what makes it readable outside the lab, and it cannot be taken back, so a
  confirm stands between the click and the write.
*/
export function ReportReleaseButton({ labReportId }: ReportReleaseButtonProps) {
  const router = useRouter();
  const [isReleasing, startReleasing] = useTransition();

  const handleReleaseClick = (): void => {
    if (!window.confirm('Release this report to the doctor and patient?')) {
      return;
    }

    startReleasing(async () => {
      const result = await releaseLabReportAction({ labReportId });

      if (!isSuccess(result)) {
        toast.error(result.errors[0]?.error ?? 'Something went wrong. Try again.');

        return;
      }

      toast.success('Report released.');
      router.refresh();
    });
  };

  return (
    <Button type="button" size="sm" disabled={isReleasing} onClick={handleReleaseClick}>
      <Send className="size-4" />
      Release report
    </Button>
  );
}
